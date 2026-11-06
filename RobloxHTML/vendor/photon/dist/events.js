/**
 * Typed events.
 *
 * `client.on('playerJoined', ({ player }) => ...)` returns a function that unsubscribes.
 * Every event delivers a single payload object (or nothing), so handlers destructure, `once()`
 * resolves to one value, and a field can be added later without breaking anyone.
 *
 * Internally one native subscription exists per event name (and per custom-event range),
 * taken when the first listener is added and released when the last one is removed, so an
 * idle client costs the native side nothing.
 *
 * @module
 */
import { directModeCodec, disconnectCauseCodec, lobbyTypeCodec, warningCodeCodec, } from './enums.js';
import { RealtimeError } from './errors.js';
import { fromNative, propertiesFromNative } from './values.js';
/** Turns each broadcaster's positional native arguments into the payload object. */
const CONVERTERS = {
    disconnected: ([cause]) => ({ cause: disconnectCauseCodec.fromNative(cause) }),
    error: ([code, message]) => new RealtimeError(code, message),
    warning: ([code, message]) => ({ code: warningCodeCodec.fromNative(code), message: message }),
    roomJoined: () => undefined,
    roomLeft: () => undefined,
    roomPropertiesChanged: ([props]) => ({ changed: propertiesFromNative(props) }),
    roomListUpdated: ([rooms]) => ({ rooms: rooms.map(roomListingFromNative) }),
    masterClientChanged: ([newId, oldId]) => ({ newMasterNumber: newId, oldMasterNumber: oldId }),
    playerJoined: ([player]) => ({ player: playerFromNative(player) }),
    playerLeft: ([number, isInactive]) => ({ playerNumber: number, isInactive: isInactive }),
    playerPropertiesChanged: ([number, props]) => ({
        playerNumber: number,
        changed: propertiesFromNative(props),
    }),
    directMessage: ([sender, data, isRelay]) => ({
        senderNumber: sender,
        data: data,
        isRelay: isRelay,
    }),
    directConnectionEstablished: ([id]) => ({ playerNumber: id }),
    directConnectionFailed: ([id]) => ({ playerNumber: id }),
    lobbyStats: ([stats]) => ({ stats: stats.map(lobbyStatsFromNative) }),
    customAuthStep: ([data]) => ({ data: data }),
    appStatsUpdated: () => undefined,
    propertiesChangeFailed: () => undefined,
};
/** @internal */
export const CLIENT_EVENT_NAMES = Object.keys(CONVERTERS);
/** @internal */
export function playerFromNative(p) {
    return {
        number: p.number,
        name: p.name,
        userId: p.userId,
        customProperties: propertiesFromNative(p.customProperties),
        isInactive: p.isInactive,
        isMasterClient: p.isMasterClient,
    };
}
/** @internal */
export function roomListingFromNative(r) {
    return {
        name: r.name,
        playerCount: r.playerCount,
        maxPlayers: r.maxPlayers,
        isOpen: r.isOpen,
        directMessaging: directModeCodec.fromNative(r.directMessaging),
        customProperties: propertiesFromNative(r.customProperties),
    };
}
/** @internal */
export function lobbyStatsFromNative(s) {
    return { name: s.name, type: lobbyTypeCodec.fromNative(s.type), peerCount: s.peerCount, roomCount: s.roomCount };
}
/**
 * Re-throws a handler's exception on a fresh microtask so it reaches `uncaughtException` /
 * `window.onerror` -- but never the native frames that dispatched the event. This build has
 * no C++ exception support, so a JS exception unwinding through wasm would corrupt the
 * native stack.
 *
 * @internal
 */
export function reportHandlerError(error) {
    queueMicrotask(() => {
        throw error;
    });
}
/** @internal */
export class EventHub {
    #native;
    #channels = new Map();
    #onNativeCallback;
    #released = false;
    /** `onNativeCallback` runs before every dispatch from native (the client bumps its state version there). */
    constructor(native, onNativeCallback) {
        this.#native = native;
        this.#onNativeCallback = onNativeCallback;
    }
    on(name, handler, options) {
        if (!(name in CONVERTERS)) {
            throw new TypeError(`Unknown event "${String(name)}". Known events: ${CLIENT_EVENT_NAMES.join(', ')}`);
        }
        return this.#add(name, () => ({
            listeners: new Set(),
            subscription: undefined,
            subscribe: (trampoline) => this.#native.on(name, trampoline),
            convert: CONVERTERS[name],
        }), handler, options);
    }
    off(name, handler) {
        const channel = this.#channels.get(name);
        if (!channel) {
            return;
        }
        for (const listener of channel.listeners) {
            if (listener.handler === handler) {
                this.#remove(name, channel, listener);
            }
        }
    }
    once(name, options) {
        return new Promise((resolve, reject) => {
            let timer;
            const cleanup = () => {
                if (timer !== undefined) {
                    clearTimeout(timer);
                }
                options?.signal?.removeEventListener('abort', onAbort);
                unsubscribe();
            };
            const onAbort = () => {
                cleanup();
                reject(options?.signal?.reason instanceof Error ? options.signal.reason : new Error('Aborted'));
            };
            if (options?.signal?.aborted) {
                onAbort();
                return;
            }
            const unsubscribe = this.on(name, (payload) => {
                cleanup();
                resolve(payload);
            }, { once: true });
            options?.signal?.addEventListener('abort', onAbort, { once: true });
            if (options?.timeoutMs !== undefined) {
                timer = setTimeout(() => {
                    cleanup();
                    // A local wait running out is not a Photon failure, so not a RealtimeError.
                    reject(new DOMException(`Timed out after ${String(options.timeoutMs)} ms waiting for "${name}"`, 'TimeoutError'));
                }, options.timeoutMs);
            }
        });
    }
    onEvent(firstCode, lastCode, handler, options) {
        const asBytes = options?.asBytes === true;
        const key = `event:${String(firstCode)}:${String(lastCode)}:${asBytes ? 'bytes' : 'value'}`;
        return this.#add(key, () => ({
            listeners: new Set(),
            subscription: undefined,
            subscribe: (trampoline) => this.#native.onEvent(firstCode, lastCode, asBytes, (code, senderNumber, payload) => {
                trampoline(code, senderNumber, payload);
            }),
            convert: ([code, senderNumber, payload]) => ({
                code: code,
                senderNumber: senderNumber,
                data: asBytes ? payload : fromNative(payload),
            }),
        }), handler, options);
    }
    /** Drops every listener and native subscription. */
    releaseAll() {
        this.#released = true;
        for (const [, channel] of this.#channels) {
            for (const listener of channel.listeners) {
                listener.abort?.();
            }
            channel.listeners.clear();
            this.#releaseNative(channel);
        }
        this.#channels.clear();
    }
    #add(key, create, handler, options) {
        if (typeof handler !== 'function') {
            throw new TypeError(`handler must be a function, got ${typeof handler}`);
        }
        if (this.#released) {
            throw new Error('The client has been disposed');
        }
        if (options?.signal?.aborted) {
            return () => { };
        }
        let channel = this.#channels.get(key);
        if (!channel) {
            channel = create();
            this.#channels.set(key, channel);
        }
        const listener = { handler, once: options?.once === true };
        channel.listeners.add(listener);
        if (channel.subscription === undefined) {
            const c = channel;
            channel.subscription = channel.subscribe((...args) => {
                this.#dispatch(c, args);
            });
        }
        const unsubscribe = () => {
            const current = this.#channels.get(key);
            if (current) {
                this.#remove(key, current, listener);
            }
        };
        if (options?.signal) {
            const signal = options.signal;
            const onAbort = () => {
                unsubscribe();
            };
            signal.addEventListener('abort', onAbort, { once: true });
            listener.abort = () => {
                signal.removeEventListener('abort', onAbort);
            };
        }
        return unsubscribe;
    }
    #remove(key, channel, listener) {
        if (!channel.listeners.delete(listener)) {
            return;
        }
        listener.abort?.();
        if (channel.listeners.size === 0) {
            this.#releaseNative(channel);
            this.#channels.delete(key);
        }
    }
    #releaseNative(channel) {
        const subscription = channel.subscription;
        channel.subscription = undefined;
        if (subscription) {
            try {
                subscription.unsubscribe();
            }
            finally {
                subscription.delete();
            }
        }
    }
    // The trampoline native calls. Nothing in here may throw: conversion and every handler
    // are wrapped, and a listener that unsubscribes (or subscribes) during dispatch is safe
    // because the listener set is snapshotted first.
    #dispatch(channel, args) {
        let payload;
        try {
            this.#onNativeCallback?.();
            payload = channel.convert(args);
        }
        catch (error) {
            reportHandlerError(error);
            return;
        }
        for (const listener of [...channel.listeners]) {
            if (!channel.listeners.has(listener)) {
                continue;
            }
            if (listener.once) {
                channel.listeners.delete(listener);
                listener.abort?.();
            }
            try {
                listener.handler(payload);
            }
            catch (error) {
                reportHandlerError(error);
            }
        }
        if (channel.listeners.size === 0 && channel.subscription !== undefined) {
            // Last `once` listener consumed: release lazily, outside the native callback.
            queueMicrotask(() => {
                if (channel.listeners.size === 0) {
                    for (const [key, c] of this.#channels) {
                        if (c === channel) {
                            this.#channels.delete(key);
                        }
                    }
                    this.#releaseNative(channel);
                }
            });
        }
    }
}
