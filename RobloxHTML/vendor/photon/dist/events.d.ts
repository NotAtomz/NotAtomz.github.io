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
import { type ClientErrorCode, type WarningCode } from './enums.js';
import { RealtimeError } from './errors.js';
import type { LobbyStats, Player, RoomListing } from './types/index.js';
import { type Properties, type RealtimeValue } from './values.js';
/** Events a {@link RealtimeClient} emits, with the payload each handler receives. */
export interface ClientEvents {
    /** The connection ended, for whatever reason (including your own `disconnect()`). */
    disconnected: {
        cause: import('./enums.js').DisconnectCause;
    };
    /** The server or the client reported an error outside any pending operation. */
    error: RealtimeError<ClientErrorCode>;
    /** A non-fatal condition, usually a network queue filling up because the client is serviced too rarely. */
    warning: {
        code: WarningCode;
        message: string;
    };
    /** The local player entered a room (also resolves the join/create promise). */
    roomJoined: void;
    /** The local player left the room. */
    roomLeft: void;
    /** Custom room properties changed; `changed` holds only the changed keys. */
    roomPropertiesChanged: {
        changed: Properties;
    };
    /** The lobby's room list changed (while in a lobby). */
    roomListUpdated: {
        rooms: RoomListing[];
    };
    masterClientChanged: {
        newMasterNumber: number;
        oldMasterNumber: number;
    };
    playerJoined: {
        player: Player;
    };
    playerLeft: {
        playerNumber: number;
        isInactive: boolean;
    };
    playerPropertiesChanged: {
        playerNumber: number;
        changed: Properties;
    };
    /** A direct message from another player. */
    directMessage: {
        senderNumber: number;
        data: Uint8Array;
        isRelay: boolean;
    };
    directConnectionEstablished: {
        playerNumber: number;
    };
    directConnectionFailed: {
        playerNumber: number;
    };
    lobbyStats: {
        stats: LobbyStats[];
    };
    /** An intermediate custom-authentication step; `data` is what the auth provider returned. */
    customAuthStep: {
        data: Record<string, string>;
    };
    appStatsUpdated: void;
    /** A property change was rejected (for example a failed compare-and-swap). */
    propertiesChangeFailed: void;
}
export type ClientEventName = keyof ClientEvents;
/** Stops delivering events to the handler it was returned for. Safe to call more than once. */
export type Unsubscribe = () => void;
export interface ListenerOptions {
    /** Removes the listener when the signal aborts. */
    readonly signal?: AbortSignal;
    /** Removes the listener after its first call. */
    readonly once?: boolean;
}
export interface OnceOptions {
    readonly signal?: AbortSignal;
    /**
     * Rejects with a `DOMException` named `'TimeoutError'` (the error `AbortSignal.timeout()`
     * uses) when the event does not arrive in time.
     */
    readonly timeoutMs?: number;
}
/** A custom event raised by another player with {@link RealtimeClient.sendEvent}. */
export interface CustomEvent<T = RealtimeValue> {
    readonly code: number;
    readonly senderNumber: number;
    readonly data: T;
}
export interface CustomEventOptions extends ListenerOptions {
    /**
     * Deliver the raw payload bytes as a `Uint8Array` instead of decoding a value. Use it for
     * events sent with a `Uint8Array` payload, or when you run your own serializer.
     */
    readonly asBytes?: boolean;
}
