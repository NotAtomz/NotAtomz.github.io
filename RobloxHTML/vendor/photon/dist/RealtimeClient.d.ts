import { type ConnectionState, type DisconnectCause, type LobbyType } from './enums.js';
import { type ClientEventName, type ClientEvents, type CustomEvent, type CustomEventOptions, type ListenerOptions, type OnceOptions, type Unsubscribe } from './events.js';
import type { NativeModule } from './native/NativeModule.js';
import { type WasmLocation } from './native/loader.js';
import { Room, type RoomHost } from './Room.js';
import type { AuthenticationValues, ClientOptions, ConnectOptions, CreateRoomOptions, DirectMessageOptions, EventOptions, FriendInfo, JoinRoomOptions, LobbyStats, MatchmakingOptions, NetworkStats, Player, RegionInfo, RoomListing, TrafficStats, TrafficStatsGameLevel } from './types/index.js';
import { type Properties, type RealtimeValue } from './values.js';
/** Options for {@link createRealtimeClient}. */
export interface CreateClientOptions extends ClientOptions {
    /**
     * How the client is driven. Default `true`: a timer calls {@link RealtimeClient.service}
     * every 16 ms and you never think about it. Pass `{ intervalMs }` for a different cadence,
     * or `false` to call `client.service()` yourself from your own game loop.
     */
    readonly autoPump?: boolean | {
        readonly intervalMs: number;
    };
    /** Where the `.wasm` file comes from; only the first client's setting is used. */
    readonly wasm?: WasmLocation;
}
/** Network tuning knobs, readable and writable at any time. */
export interface ClientConfig {
    disconnectTimeoutMs: number;
    pingIntervalMs: number;
    sentCountAllowance: number;
    quickResendAttempts: number;
    crcEnabled: boolean;
    limitOfUnreliableCommands: number;
}
/** Manual control over the pump; see {@link CreateClientOptions.autoPump}. */
export interface PumpControl {
    readonly isRunning: boolean;
    /** Milliseconds between ticks; assignable while running. */
    intervalMs: number;
    start(intervalMs?: number): void;
    stop(): void;
}
/**
 * Creates a client. Loads the native module on first use.
 *
 * ```ts
 * const client = await createRealtimeClient({ appId: '...', appVersion: '1.0' });
 * await client.connect();
 * const room = await client.joinRandomOrCreateRoom();
 * ```
 */
export declare function createRealtimeClient(options: CreateClientOptions): Promise<RealtimeClient>;
/**
 * Loads the native module ahead of time (for example behind a loading screen). Optional:
 * {@link createRealtimeClient} loads it on demand.
 */
export declare function preloadRealtime(wasm?: WasmLocation): Promise<void>;
/**
 * Creates a client over an already loaded module.
 *
 * Exported through the `@photonengine/realtime-core/integration` entry point, for a package that embeds
 * this module in its own wasm build. Ordinary consumers use {@link createRealtimeClient},
 * which loads the module and then calls this.
 */
export declare function createClientWithModule(module: NativeModule, options: CreateClientOptions): RealtimeClient;
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
export declare class RealtimeClient implements RoomHost {
    #private;
    get state(): ConnectionState;
    get isConnected(): boolean;
    get isInRoom(): boolean;
    get isInLobby(): boolean;
    /** Why the last connection ended; `none` while connected. */
    get disconnectCause(): DisconnectCause;
    /** The region the name server picked (or you selected), once connected. */
    get bestRegion(): string;
    get userId(): string;
    /** Server time in milliseconds, synchronized after connecting. */
    get serverTime(): number;
    get masterServerAddress(): string;
    /** A snapshot of the local player. */
    get localPlayer(): Player;
    /** The room the client is in, or `null`. The same {@link Room} instance for the whole stay. */
    get room(): Room | null;
    /** The room list last received from the lobby. */
    get cachedRoomList(): RoomListing[];
    /** The result of the last {@link findFriends}. */
    get friendList(): FriendInfo[];
    /** Milliseconds since {@link friendList} was updated. */
    get friendListAge(): number;
    get stats(): NetworkStats;
    get trafficStatsIncoming(): TrafficStats;
    get trafficStatsOutgoing(): TrafficStats;
    get trafficStatsGameLevel(): TrafficStatsGameLevel;
    get isDisposed(): boolean;
    /** Network tuning; each property reads and writes the live value. */
    get config(): ClientConfig;
    /**
     * Connects to the Photon Cloud (or the server in `options.serverAddress`).
     * Rejects with a `RealtimeError<ConnectErrorCode>`, `'alreadyConnected'` when the client is not disconnected.
     */
    connect(options?: ConnectOptions): Promise<void>;
    /**
     * Disconnects. Rejects with a `RealtimeError<DisconnectErrorCode>`. Resolves when the client
     * is disposed while the disconnect is pending, because disposing disconnects the client.
     */
    disconnect(): Promise<void>;
    /**
     * Reconnects to the last master server and, when possible, rejoins the last room.
     * Rejects with a `RealtimeError<ConnectErrorCode>`.
     */
    reconnect(): Promise<void>;
    /** Lists the regions the name server offers. Rejects with a `RealtimeError<RegionErrorCode>`. */
    availableRegions(): Promise<RegionInfo[]>;
    /** Picks the region to connect to. Rejects with a `RealtimeError<RegionErrorCode>`. */
    selectRegion(region: string): Promise<void>;
    /** Joins a lobby (the default lobby without arguments). Rejects with a `RealtimeError<LobbyErrorCode>`. */
    joinLobby(name?: string, type?: LobbyType): Promise<void>;
    /** Leaves the current lobby. Rejects with a `RealtimeError<LobbyErrorCode>`. */
    leaveLobby(): Promise<void>;
    /** Requests statistics of the app's lobbies. Rejects with a `RealtimeError<LobbyErrorCode>`. */
    getLobbyStats(): Promise<LobbyStats[]>;
    /** Lists rooms of an SQL lobby matching `sqlFilter`. Rejects with a `RealtimeError<RoomListErrorCode>`. */
    getRoomList(lobbyName: string, sqlFilter: string): Promise<RoomListing[]>;
    /**
     * Creates and enters a room. An empty name lets the server pick one.
     * Rejects with a `RealtimeError<CreateRoomErrorCode>`.
     */
    createRoom(name?: string, options?: CreateRoomOptions): Promise<Room>;
    /** Enters an existing room by name. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinRoom(name: string, options?: JoinRoomOptions): Promise<Room>;
    /** Enters the named room, creating it when it does not exist. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinOrCreateRoom(name: string, createOptions?: CreateRoomOptions, joinOptions?: JoinRoomOptions): Promise<Room>;
    /** Enters a random room that matches `options`. Rejects with a `RealtimeError<JoinRoomErrorCode>`. */
    joinRandomRoom(options?: MatchmakingOptions): Promise<Room>;
    /**
     * Enters a random matching room, creating one when none matches.
     * Rejects with a `RealtimeError<JoinRoomErrorCode>`.
     */
    joinRandomOrCreateRoom(createOptions?: CreateRoomOptions, matchmakingOptions?: MatchmakingOptions): Promise<Room>;
    /**
     * Leaves the room. `willComeBack` keeps the player inactive in a room with a player time-to-live.
     * Rejects with a `RealtimeError<LeaveRoomErrorCode>`.
     */
    leaveRoom(willComeBack?: boolean): Promise<void>;
    /** Looks up the online status and room of other users. Rejects with a `RealtimeError<FindFriendsErrorCode>`. */
    findFriends(userIds: readonly string[]): Promise<FriendInfo[]>;
    setPlayerName(name: string): void;
    /** Sets custom properties of the local player. Returns whether the request was sent. */
    setPlayerProperties(properties: Properties): boolean;
    removePlayerProperties(keys: readonly string[]): boolean;
    /**
     * Raises a custom event to the other players in the room. `data` is either a value (see
     * the `values` module for what can be sent) or a `Uint8Array` sent as raw bytes. Returns
     * whether the event was queued.
     */
    sendEvent(code: number, data: RealtimeValue, options?: EventOptions): boolean;
    /** Sends raw bytes directly to other players. Returns the number of recipients. */
    sendDirect(data: Uint8Array, options?: DirectMessageOptions): number;
    /** Leaves and joins interest groups (each 1..255). Returns whether the request was sent. */
    changeGroups(remove: readonly number[], add: readonly number[]): boolean;
    /** Continues a multi-step custom authentication (see the `customAuthStep` event). */
    sendCustomAuthData(auth: AuthenticationValues): boolean;
    setAutoJoinLobby(enabled: boolean): void;
    fetchServerTimestamp(): void;
    setTrafficStatsEnabled(enabled: boolean): void;
    resetTrafficStats(): void;
    resetTrafficStatsMaximumCounters(): void;
    vitalStatsToString(all?: boolean): string;
    /** Subscribes to an event. Returns a function that unsubscribes. */
    on<K extends ClientEventName>(name: K, handler: (event: ClientEvents[K]) => void, options?: ListenerOptions): Unsubscribe;
    off<K extends ClientEventName>(name: K, handler: (event: ClientEvents[K]) => void): void;
    /**
     * Resolves with the next occurrence of an event. With `timeoutMs` it rejects with a
     * `DOMException` named `'TimeoutError'` when the event does not arrive in time.
     */
    once<K extends ClientEventName>(name: K, options?: OnceOptions): Promise<ClientEvents[K]>;
    /** Subscribes to custom events with this code (raised by {@link sendEvent} on other clients). */
    onEvent(code: number, handler: (event: CustomEvent<Uint8Array>) => void, options: CustomEventOptions & {
        readonly asBytes: true;
    }): Unsubscribe;
    onEvent(code: number, handler: (event: CustomEvent) => void, options?: CustomEventOptions): Unsubscribe;
    /** Subscribes to custom events with codes `firstCode..lastCode` (inclusive). */
    onEventRange(firstCode: number, lastCode: number, handler: (event: CustomEvent<Uint8Array>) => void, options: CustomEventOptions & {
        readonly asBytes: true;
    }): Unsubscribe;
    onEventRange(firstCode: number, lastCode: number, handler: (event: CustomEvent) => void, options?: CustomEventOptions): Unsubscribe;
    /** Subscribes to every custom event. */
    onAnyEvent(handler: (event: CustomEvent<Uint8Array>) => void, options: CustomEventOptions & {
        readonly asBytes: true;
    }): Unsubscribe;
    onAnyEvent(handler: (event: CustomEvent) => void, options?: CustomEventOptions): Unsubscribe;
    /**
     * Processes incoming packets, sends outgoing ones, and runs every callback and promise
     * continuation that is due. The automatic pump calls this for you; call it yourself once
     * per frame when created with `autoPump: false`. Must not be called from inside an event
     * handler.
     */
    service(): void;
    get pump(): PumpControl;
    /**
     * Releases the native client. Pending operations reject with a {@link RealtimeError} of code
     * `disconnected`, except a pending `disconnect()`, which resolves; every later call throws.
     * Safe to call from inside an event handler (the native teardown then completes when the
     * current tick ends) and safe to call twice.
     */
    dispose(): void;
}
export interface RealtimeClient {
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
}
