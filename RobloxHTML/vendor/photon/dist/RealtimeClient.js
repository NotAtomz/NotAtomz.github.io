import { connectionStateCodec, disconnectCauseCodec, lobbyTypeCodec, } from './enums.js';
import { RealtimeError } from './errors.js';
import { EventHub, lobbyStatsFromNative, playerFromNative, roomListingFromNative, } from './events.js';
import { loadNativeModule } from './native/loader.js';
import { expectBoolean, expectByte, expectInt, expectIntArray, expectNonEmptyString, expectProperties, expectString, expectStringArray, expectUint8Array, normalizeAuthenticationValues, normalizeClientOptions, normalizeConnectOptions, normalizeCreateRoomOptions, normalizeDirectMessageOptions, normalizeEventOptions, normalizeJoinRoomOptions, normalizeMatchmakingOptions, } from './options.js';
import { Pump } from './pump.js';
import { Room } from './Room.js';
import { validateValue } from './values.js';
// Only createRealtimeClient / createClientWithModule can construct a client: the native module
// loads asynchronously, so a synchronous `new RealtimeClient()` could never have one.
const INTERNAL = Symbol('RealtimeClient.internal');
// Best effort for a client dropped without dispose(). The held value must not reference
// the client (a held value is strong for as long as the target lives), and neither may any
// callback the client hands to native -- see the WeakRef uses in the constructor. A running
// pump keeps its client reachable through the timer, so this only ever runs for idle,
// forgotten clients.
const registry = typeof FinalizationRegistry === 'undefined'
    ? undefined
    : new FinalizationRegistry((native) => {
        if (!native.isDeleted()) {
            native.dispose();
            native.delete();
        }
    });
/**
 * Creates a client. Loads the native module on first use.
 *
 * ```ts
 * const client = await createRealtimeClient({ appId: '...', appVersion: '1.0' });
 * await client.connect();
 * const room = await client.joinRandomOrCreateRoom();
 * ```
 */
export async function createRealtimeClient(options) {
    if (typeof options !== 'object' || options === null) {
        throw new TypeError(`createRealtimeClient: expected an options object, got ${typeof options}`);
    }
    const module = await loadNativeModule(options.wasm);
    return createClientWithModule(module, options);
}
/**
 * Loads the native module ahead of time (for example behind a loading screen). Optional:
 * {@link createRealtimeClient} loads it on demand.
 */
export async function preloadRealtime(wasm) {
    await loadNativeModule(wasm);
}
/**
 * Creates a client over an already loaded module.
 *
 * Exported through the `@photonengine/realtime-core/integration` entry point, for a package that embeds
 * this module in its own wasm build. Ordinary consumers use {@link createRealtimeClient},
 * which loads the module and then calls this.
 */
export function createClientWithModule(module, options) {
    return new RealtimeClient(INTERNAL, module, options);
}
/**
 * A Photon Realtime client.
 *
 * Asynchronous operations return promises that resolve with the result and reject with a
 * {@link RealtimeError}; each method's documentation names the code type its rejection
 * carries ({@link ConnectErrorCode}, {@link JoinRoomErrorCode}, ...). Any operation still
 * pending when the client is disposed rejects with `'disconnected'`, except `disconnect()`,
 * which resolves, because disposing disconnects the client. Everything else -- sending events,
 * setting properties, reading state -- is synchronous. Misuse (a disposed client, an argument that cannot be sent) throws a
 * plain `Error` or `TypeError` synchronously, so `RealtimeError` always means "the network or
 * the server said no".
 *
 * Obtain one with {@link createRealtimeClient}; release it with {@link dispose} (or `using`).
 */
// The merged interface below only declares the two optional `Symbol.dispose` methods installed
// on the prototype at load time; it adds no property the constructor is expected to initialize.
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class RealtimeClient {
    #native;
    #hub;
    #pump;
    #pending = new Set();
    #room = null;
    #disposed = false;
    #serviceDepth = 0;
    #disposeRequested = false;
    #version = 0;
    /** @internal */
    constructor(token, module, options) {
        if (token !== INTERNAL) {
            throw new Error('RealtimeClient cannot be constructed directly because the native module loads asynchronously. Use: const client = await createRealtimeClient({ appId, appVersion })');
        }
        const nativeOptions = normalizeClientOptions(options);
        const autoPump = options.autoPump ?? true;
        let intervalMs = Pump.DEFAULT_INTERVAL_MS;
        if (typeof autoPump === 'object') {
            intervalMs = expectInt('autoPump.intervalMs', autoPump.intervalMs, 1);
        }
        else if (typeof autoPump !== 'boolean') {
            throw new TypeError(`autoPump: expected a boolean or { intervalMs }, got ${typeof autoPump}`);
        }
        this.#native = new module.Client(nativeOptions);
        // Everything handed to native must not keep `this` alive: native holds its callbacks for
        // the lifetime of the C++ client, and a strong capture would make a forgotten client
        // uncollectable (and defeat the FinalizationRegistry below). The hooks are created in
        // static methods on purpose -- V8 gives every closure of one scope a shared context, so an
        // arrow function created here would share the pump tick's captured `this` even if it
        // never mentions it.
        const weak = new WeakRef(this);
        this.#hub = new EventHub(this.#native, RealtimeClient.#versionBumper(weak));
        RealtimeClient.#hookRoomLifecycle(weak, this.#hub);
        // The pump's tick is deliberately strong: while the timer runs, the client stays alive,
        // the way an open socket keeps a process alive. dispose() stops it.
        this.#pump = new Pump(() => {
            this.service();
        }, intervalMs);
        registry?.register(this, this.#native, this);
        if (autoPump !== false) {
            this.#pump.start();
        }
    }
    // ---- state -------------------------------------------------------------------------------
    /** @internal */
    get native() {
        return this.#native;
    }
    /** @internal */
    get stateVersion() {
        return this.#version;
    }
    get state() {
        return connectionStateCodec.fromNative(this.#live().getState());
    }
    get isConnected() {
        return this.#live().isConnected();
    }
    get isInRoom() {
        return this.#live().isInRoom();
    }
    get isInLobby() {
        return this.#live().isInLobby();
    }
    /** Why the last connection ended; `none` while connected. */
    get disconnectCause() {
        return disconnectCauseCodec.fromNative(this.#live().getDisconnectCause());
    }
    /** The region the name server picked (or you selected), once connected. */
    get bestRegion() {
        return this.#live().getBestRegion();
    }
    get userId() {
        return this.#live().getUserId();
    }
    /** Server time in milliseconds, synchronized after connecting. */
    get serverTime() {
        return this.#live().getServerTime();
    }
    get masterServerAddress() {
        return this.#live().getMasterServerAddress();
    }
    /** A snapshot of the local player. */
    get localPlayer() {
        return playerFromNative(this.#live().getLocalPlayer());
    }
    /** The room the client is in, or `null`. The same {@link Room} instance for the whole stay. */
    get room() {
        this.#live();
        if (this.#room === null && this.#native.isInRoom()) {
            this.#ensureRoom();
        }
        return this.#room;
    }
    /** The room list last received from the lobby. */
    get cachedRoomList() {
        return this.#live().getCachedRoomList().map(roomListingFromNative);
    }
    /** The result of the last {@link findFriends}. */
    get friendList() {
        return this.#live().getFriendList().map(friendFromNative);
    }
    /** Milliseconds since {@link friendList} was updated. */
    get friendListAge() {
        return this.#live().getFriendListAge();
    }
    get stats() {
        return this.#live().getStats();
    }
    get trafficStatsIncoming() {
        return this.#live().getTrafficStatsIncoming();
    }
    get trafficStatsOutgoing() {
        return this.#live().getTrafficStatsOutgoing();
    }
    get trafficStatsGameLevel() {
        return this.#live().getTrafficStatsGameLevel();
    }
    get isDisposed() {
        return this.#disposed;
    }
    /** Network tuning; each property reads and writes the live value. */
    get config() {
        const native = this.#live();
        return {
            get disconnectTimeoutMs() {
                return native.getDisconnectTimeout();
            },
            set disconnectTimeoutMs(ms) {
                native.setDisconnectTimeout(expectInt('disconnectTimeoutMs', ms, 0));
            },
            get pingIntervalMs() {
                return native.getPingInterval();
            },
            set pingIntervalMs(ms) {
                native.setPingInterval(expectInt('pingIntervalMs', ms, 0));
            },
            get sentCountAllowance() {
                return native.getSentCountAllowance();
            },
            set sentCountAllowance(count) {
                native.setSentCountAllowance(expectInt('sentCountAllowance', count, 0));
            },
            get quickResendAttempts() {
                return native.getQuickResendAttempts();
            },
            set quickResendAttempts(attempts) {
                native.setQuickResendAttempts(expectByte('quickResendAttempts', attempts));
            },
            get crcEnabled() {
                return native.getCrcEnabled();
            },
            set crcEnabled(enabled) {
                native.setCrcEnabled(expectBoolean('crcEnabled', enabled));
            },
            get limitOfUnreliableCommands() {
                return native.getLimitOfUnreliableCommands();
            },
            set limitOfUnreliableCommands(limit) {
                native.setLimitOfUnreliableCommands(expectInt('limitOfUnreliableCommands', limit, 0));
            },
        };
    }
    // ---- async operations --------------------------------------------------------------------
    /**
     * Connects to the Photon Cloud (or the server in `options.serverAddress`).
     * Rejects with a `RealtimeError<ConnectErrorCode>`, `'alreadyConnected'` when the client is not disconnected.
     */
    connect(options) {
        this.#live();
        const native = options === undefined ? undefined : normalizeConnectOptions(options);
        return this.#run(() => this.#native.connect(native), () => undefined);
    }
    /**
     * Disconnects. Rejects with a `RealtimeError<DisconnectErrorCode>`. Resolves when the client
     * is disposed while the disconnect is pending, because disposing disconnects the client.
     */
    disconnect() {
        this.#live();
        return this.#run(() => this.#native.disconnect(), () => undefined, 'resolve');
    }
    /**
     * Reconnects to the last master server and, when possible, rejoins the last room.
     * Rejects with a `RealtimeError<ConnectErrorCode>`.
     */
    reconnect() {
        this.#live();
        return this.#run(() => this.#native.reconnect(), () => undefined);
    }
    /** Lists the regions the name server offers. Rejects with a `RealtimeError<RegionErrorCode>`. */
    availableRegions() {
        this.#live();
        return this.#run(() => this.#native.availableRegions(), (regions) => regions.map((r) => ({ code: r.code, server: r.server })));
    }
    /** Picks the region to connect to. Rejects with a `RealtimeError<RegionErrorCode>`. */
    selectRegion(region) {
        this.#live();
        const code = expectNonEmptyString('region', region);
        return this.#run(() => this.#native.selectRegion(code), () => undefined);
    }
    /** Joins a lobby (the default lobby without arguments). Rejects with a `RealtimeError<LobbyErrorCode>`. */
    joinLobby(name = '', type = 'default') {
        this.#live();
        const lobby = expectString('name', name);
        const lobbyType = lobbyTypeCodec.toNative(type);
        return this.#run(() => this.#native.joinLobby(lobby, lobbyType), () => undefined);
    }
    /** Leaves the current lobby. Rejects with a `RealtimeError<LobbyErrorCode>`. */
    leaveLobby() {
        this.#live();
        return this.#run(() => this.#native.leaveLobby(), () => undefined);
    }
    /** Requests statistics of the app's lobbies. Rejects with a `RealtimeError<LobbyErrorCode>`. */
    getLobbyStats() {
        this.#live();
        return this.#run(() => this.#native.getLobbyStats(), (stats) => stats.map(lobbyStatsFromNative));
    }
    /** Lists rooms of an SQL lobby matching `sqlFilter`. Rejects with a `RealtimeError<RoomListErrorCode>`. */
    getRoomList(lobbyName, sqlFilter) {
        this.#live();
        const lobby = expectString('lobbyName', lobbyName);
        const filter = expectString('sqlFilter', sqlFilter);
        return this.#run(() => this.#native.getRoomList(lobby, filter), (rooms) => rooms.map(roomListingFromNative));
    }
    /**
     * Creates and enters a room. An empty name lets the server pick one.
     * Rejects with a `RealtimeError<CreateRoomErrorCode>`.
     */
    createRoom(name = '', options) {
        this.#live();
        const roomName = expectString('name', name);
        const create = normalizeCreateRoomOptions(options);
        return this.#run(() => this.#native.createRoom(roomName, create), () => this.#ensureRoom());
    }
    /** Enters an existing room by name. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinRoom(name, options) {
        this.#live();
        const roomName = expectNonEmptyString('name', name);
        const join = normalizeJoinRoomOptions(options);
        return this.#run(() => this.#native.joinRoom(roomName, join), () => this.#ensureRoom());
    }
    /** Enters the named room, creating it when it does not exist. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinOrCreateRoom(name, createOptions, joinOptions) {
        this.#live();
        const roomName = expectNonEmptyString('name', name);
        const create = normalizeCreateRoomOptions(createOptions);
        const join = normalizeJoinRoomOptions(joinOptions);
        return this.#run(() => this.#native.joinOrCreateRoom(roomName, create, join), () => this.#ensureRoom());
    }
    /** Enters a random room that matches `options`. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinRandomRoom(options) {
        this.#live();
        const matchmaking = normalizeMatchmakingOptions(options);
        return this.#run(() => this.#native.joinRandomRoom(matchmaking), () => this.#ensureRoom());
    }
    /**
     * Enters a random matching room, creating one when none matches.
     * Rejects with a `RealtimeError<JoinRoomErrorCode>`.
     */
    joinRandomOrCreateRoom(createOptions, matchmakingOptions) {
        this.#live();
        const create = normalizeCreateRoomOptions(createOptions);
        const matchmaking = normalizeMatchmakingOptions(matchmakingOptions);
        return this.#run(() => this.#native.joinRandomOrCreateRoom(create, matchmaking), () => this.#ensureRoom());
    }
    /**
     * Leaves the room. `willComeBack` keeps the player inactive in a room with a player time-to-live.
     * Rejects with a `RealtimeError<LeaveRoomErrorCode>`.
     */
    leaveRoom(willComeBack = false) {
        this.#live();
        const comeBack = expectBoolean('willComeBack', willComeBack);
        return this.#run(() => this.#native.leaveRoom(comeBack), () => undefined);
    }
    /** Looks up the online status and room of other users. Rejects with a `RealtimeError<FindFriendsErrorCode>`. */
    findFriends(userIds) {
        this.#live();
        const ids = expectStringArray('userIds', userIds);
        return this.#run(() => this.#native.findFriends(ids), (friends) => friends.map(friendFromNative));
    }
    // ---- fire-and-forget ---------------------------------------------------------------------
    setPlayerName(name) {
        this.#live().setPlayerName(expectString('name', name));
    }
    /** Sets custom properties of the local player. Returns whether the request was sent. */
    setPlayerProperties(properties) {
        return this.#live().setPlayerProperties(expectProperties('properties', properties));
    }
    removePlayerProperties(keys) {
        return this.#live().removePlayerProperties(expectStringArray('keys', keys));
    }
    /**
     * Raises a custom event to the other players in the room. `data` is either a value (see
     * the `values` module for what can be sent) or a `Uint8Array` sent as raw bytes. Returns
     * whether the event was queued.
     */
    sendEvent(code, data, options) {
        const native = this.#live();
        const eventCode = expectByte('code', code);
        if (!(data instanceof Uint8Array)) {
            validateValue(data, 'data');
        }
        return native.sendEvent(eventCode, data, normalizeEventOptions(options));
    }
    /** Sends raw bytes directly to other players. Returns the number of recipients. */
    sendDirect(data, options) {
        const native = this.#live();
        return native.sendDirect(expectUint8Array('data', data), normalizeDirectMessageOptions(options));
    }
    /** Leaves and joins interest groups (each 1..255). Returns whether the request was sent. */
    changeGroups(remove, add) {
        const native = this.#live();
        return native.changeGroups(expectIntArray('remove', remove, 0, 255), expectIntArray('add', add, 0, 255));
    }
    /** Continues a multi-step custom authentication (see the `customAuthStep` event). */
    sendCustomAuthData(auth) {
        return this.#live().sendCustomAuthData(normalizeAuthenticationValues(auth));
    }
    setAutoJoinLobby(enabled) {
        this.#live().setAutoJoinLobby(expectBoolean('enabled', enabled));
    }
    fetchServerTimestamp() {
        this.#live().fetchServerTimestamp();
    }
    setTrafficStatsEnabled(enabled) {
        this.#live().setTrafficStatsEnabled(expectBoolean('enabled', enabled));
    }
    resetTrafficStats() {
        this.#live().resetTrafficStats();
    }
    resetTrafficStatsMaximumCounters() {
        this.#live().resetTrafficStatsMaximumCounters();
    }
    vitalStatsToString(all = false) {
        return this.#live().getVitalStatsToString(expectBoolean('all', all));
    }
    // ---- events ------------------------------------------------------------------------------
    /** Subscribes to an event. Returns a function that unsubscribes. */
    on(name, handler, options) {
        this.#live();
        return this.#hub.on(name, handler, options);
    }
    off(name, handler) {
        this.#hub.off(name, handler);
    }
    /**
     * Resolves with the next occurrence of an event. With `timeoutMs` it rejects with a
     * `DOMException` named `'TimeoutError'` when the event does not arrive in time.
     */
    once(name, options) {
        this.#live();
        return this.#hub.once(name, options);
    }
    onEvent(code, handler, options) {
        this.#live();
        const eventCode = expectByte('code', code);
        return this.#hub.onEvent(eventCode, eventCode, handler, options);
    }
    onEventRange(firstCode, lastCode, handler, options) {
        this.#live();
        const first = expectByte('firstCode', firstCode);
        const last = expectByte('lastCode', lastCode);
        if (first > last) {
            throw new RangeError(`onEventRange: firstCode (${String(first)}) must not exceed lastCode (${String(last)})`);
        }
        return this.#hub.onEvent(first, last, handler, options);
    }
    onAnyEvent(handler, options) {
        this.#live();
        return this.#hub.onEvent(0, 255, handler, options);
    }
    // ---- pump --------------------------------------------------------------------------------
    /**
     * Processes incoming packets, sends outgoing ones, and runs every callback and promise
     * continuation that is due. The automatic pump calls this for you; call it yourself once
     * per frame when created with `autoPump: false`. Must not be called from inside an event
     * handler.
     */
    service() {
        this.#live();
        if (this.#serviceDepth > 0) {
            throw new Error('client.service() must not be called from inside an event handler');
        }
        this.#serviceDepth++;
        this.#version++;
        try {
            this.#native.service(true);
        }
        finally {
            this.#serviceDepth--;
            this.#version++;
            if (this.#disposeRequested) {
                this.#disposeRequested = false;
                this.#finishDispose();
            }
        }
    }
    get pump() {
        const pump = this.#pump;
        const live = () => {
            this.#live();
        };
        return {
            get isRunning() {
                return pump.isRunning;
            },
            get intervalMs() {
                return pump.intervalMs;
            },
            set intervalMs(value) {
                live();
                pump.intervalMs = value;
            },
            start(intervalMs) {
                live();
                pump.start(intervalMs);
            },
            stop() {
                pump.stop();
            },
        };
    }
    // ---- lifetime ----------------------------------------------------------------------------
    /**
     * Releases the native client. Pending operations reject with a {@link RealtimeError} of code
     * `disconnected`, except a pending `disconnect()`, which resolves; every later call throws.
     * Safe to call from inside an event handler (the native teardown then completes when the
     * current tick ends) and safe to call twice.
     */
    dispose() {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        this.#pump.stop();
        this.#dropRoom();
        for (const pending of this.#pending) {
            pending.settleOnDispose();
        }
        this.#pending.clear();
        if (this.#serviceDepth > 0) {
            this.#disposeRequested = true;
            return;
        }
        this.#finishDispose();
    }
    #finishDispose() {
        this.#hub.releaseAll();
        registry?.unregister(this);
        const native = this.#native;
        if (native.dispose()) {
            native.delete();
        }
        else {
            // Called from inside a native callback: the C++ side tears down when service()
            // returns; free the embind handle once we are certainly back in JS.
            queueMicrotask(() => {
                if (!native.isDeleted()) {
                    native.delete();
                }
            });
        }
    }
    // ---- internals ---------------------------------------------------------------------------
    #live() {
        if (this.#disposed) {
            throw new Error('The client has been disposed');
        }
        return this.#native;
    }
    #run(call, map, onDispose = 'reject') {
        const pending = { settleOnDispose: () => { } };
        return new Promise((resolve, reject) => {
            pending.settleOnDispose =
                onDispose === 'resolve'
                    ? () => {
                        resolve(undefined);
                    }
                    : () => {
                        reject(new RealtimeError('disconnected', 'The client was disposed while the operation was pending'));
                    };
            this.#pending.add(pending);
            call().then((raw) => {
                if (!this.#pending.delete(pending)) {
                    return; // already rejected by dispose()
                }
                this.#version++;
                try {
                    resolve(map(raw));
                }
                catch (error) {
                    reject(error instanceof Error ? error : new Error(String(error)));
                }
            }, (reason) => {
                if (!this.#pending.delete(pending)) {
                    return;
                }
                this.#version++;
                reject(RealtimeError.fromNative(reason));
            });
        });
    }
    #bumpVersion() {
        this.#version++;
    }
    static #versionBumper(weak) {
        return () => {
            const self = weak.deref();
            if (self) {
                self.#bumpVersion();
            }
        };
    }
    // Room lifecycle. The Room object is created when the local player enters a room and
    // deactivated when it leaves, whichever of the event or the promise arrives first.
    static #hookRoomLifecycle(weak, hub) {
        hub.on('roomJoined', () => {
            const self = weak.deref();
            if (self) {
                self.#ensureRoom();
            }
        });
        const drop = () => {
            const self = weak.deref();
            if (self) {
                self.#dropRoom();
            }
        };
        hub.on('roomLeft', drop);
        hub.on('disconnected', drop);
    }
    #ensureRoom() {
        if (this.#room === null || !this.#room.isActive) {
            this.#room = new Room(this);
        }
        return this.#room;
    }
    #dropRoom() {
        if (this.#room !== null) {
            this.#room.deactivate();
            this.#room = null;
        }
    }
}
if (typeof Symbol.dispose === 'symbol') {
    Object.defineProperty(RealtimeClient.prototype, Symbol.dispose, {
        value() {
            this.dispose();
        },
        configurable: true,
        writable: true,
    });
}
if (typeof Symbol.asyncDispose === 'symbol') {
    Object.defineProperty(RealtimeClient.prototype, Symbol.asyncDispose, {
        async value() {
            // Best effort: tell the server we are leaving, but never hang a `using` scope on it.
            if (!this.isDisposed && this.isConnected) {
                await Promise.race([
                    this.disconnect().catch(() => undefined),
                    new Promise((resolve) => {
                        setTimeout(resolve, 2000);
                    }),
                ]);
            }
            this.dispose();
        },
        configurable: true,
        writable: true,
    });
}
function friendFromNative(f) {
    return { userId: f.userId, isOnline: f.isOnline, roomName: f.roomName, isInRoom: f.isInRoom };
}
