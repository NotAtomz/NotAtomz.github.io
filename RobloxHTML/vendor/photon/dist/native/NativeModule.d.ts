/**
 * The embind contract: what `realtimecore.mjs` exports, as TypeScript sees it.
 *
 * This file, the C++ bindings, the emitted `realtimecore.d.mts` and the in-memory test fake
 * describe the same surface and change together. Everything here is internal to the package.
 *
 * Conventions of the surface:
 * - enums are numbers; option objects are the fully populated `Native*Options` shapes from
 *   `options.ts`; values follow the rules in `values.ts`;
 * - every async method returns a Promise that rejects with an `Error` carrying a numeric
 *   `code` -- a member of that operation's C++ error enum (`ConnectError`, `JoinRoomError`,
 *   ...) widened to `ErrorCode`, or `Disconnected` when the binding is or gets disposed -- and
 *   never throws synchronously;
 * - sync methods never throw for SDK-level failures: they return `false` / `0` / `null` and
 *   log, the C++ SDK's own convention;
 * - `on('error', cb)` calls `cb(code, message)` with a `ClientError` value; `on('warning', cb)`
 *   calls `cb(code, message)` with a `WarningCode` value;
 * - callbacks handed to `on` / `onEvent` receive positional arguments and MUST NOT throw
 *   (the build has no C++ exceptions; a JS exception would unwind through wasm frames).
 *
 * @internal
 * @module
 */
/** Any value the native bridge produces; see `values.ts` `fromNative()`. */
export type NativeValue = unknown;
/** String-keyed property bag as native emits it (always a plain object). */
export type NativeProperties = Record<string, NativeValue>;
export interface NativePlayer {
    number: number;
    name: string;
    userId: string;
    customProperties: NativeProperties;
    isInactive: boolean;
    isMasterClient: boolean;
}
export interface NativeRoomSnapshot {
    name: string;
    playerCount: number;
    maxPlayers: number;
    isOpen: boolean;
    isVisible: boolean;
    customProperties: NativeProperties;
    players: NativePlayer[];
    masterClientId: number;
    isMasterClient: boolean;
    playerTtlMs: number;
    emptyRoomTtlMs: number;
    publishUserId: boolean;
    directMode: number;
    expectedUsers: string[];
    lobbyProperties: string[];
    suppressRoomEvents: boolean;
    plugins: string[];
}
export interface NativeRoomListing {
    name: string;
    playerCount: number;
    maxPlayers: number;
    isOpen: boolean;
    directMessaging: number;
    customProperties: NativeProperties;
}
export interface NativeFriendInfo {
    userId: string;
    isOnline: boolean;
    roomName: string;
    isInRoom: boolean;
}
export interface NativeLobbyStats {
    name: string;
    type: number;
    peerCount: number;
    roomCount: number;
}
export interface NativeRegionInfo {
    code: string;
    server: string;
}
/** embind class handle; `delete()` frees the C++ object. */
export interface NativeHandle {
    delete(): void;
    isDeleted(): boolean;
}
export interface NativeSubscription extends NativeHandle {
    unsubscribe(): void;
    isSubscribed(): boolean;
}
/** Positional callback for `on()`; the argument list depends on the event name (see events.ts). */
export type NativeEventCallback = (...args: unknown[]) => void;
export type NativeCustomEventCallback = (code: number, senderNumber: number, payload: unknown) => void;
export interface NativeClient extends NativeHandle {
    service(dispatchIncomingCommands: boolean): void;
    serviceBasic(): void;
    sendOutgoingCommands(): boolean;
    sendAcksOnly(): boolean;
    dispatchIncomingCommand(): boolean;
    connect(options: NativeConnectOptions | undefined): Promise<void>;
    disconnect(): Promise<void>;
    reconnect(): Promise<void>;
    availableRegions(): Promise<NativeRegionInfo[]>;
    selectRegion(region: string): Promise<void>;
    joinLobby(name: string, lobbyType: number): Promise<void>;
    leaveLobby(): Promise<void>;
    getLobbyStats(): Promise<NativeLobbyStats[]>;
    getRoomList(lobby: string, sqlFilter: string): Promise<NativeRoomListing[]>;
    createRoom(name: string, createOptions: NativeCreateRoomOptions): Promise<NativeRoomSnapshot>;
    joinRoom(name: string, joinOptions: NativeJoinRoomOptions): Promise<NativeRoomSnapshot>;
    joinOrCreateRoom(name: string, createOptions: NativeCreateRoomOptions, joinOptions: NativeJoinRoomOptions): Promise<NativeRoomSnapshot>;
    joinRandomRoom(matchmakingOptions: NativeMatchmakingOptions): Promise<NativeRoomSnapshot>;
    joinRandomOrCreateRoom(createOptions: NativeCreateRoomOptions, matchmakingOptions: NativeMatchmakingOptions): Promise<NativeRoomSnapshot>;
    leaveRoom(willComeBack: boolean): Promise<void>;
    findFriends(userIds: string[]): Promise<NativeFriendInfo[]>;
    getState(): number;
    isConnected(): boolean;
    isInRoom(): boolean;
    isInLobby(): boolean;
    getDisconnectCause(): number;
    getBestRegion(): string;
    getUserId(): string;
    getServerTime(): number;
    getMasterServerAddress(): string;
    getLocalPlayer(): NativePlayer;
    getCurrentRoom(): NativeRoomSnapshot | null;
    getCachedRoomList(): NativeRoomListing[];
    getFriendList(): NativeFriendInfo[];
    getFriendListAge(): number;
    getStats(): Record<string, number | boolean | string>;
    getTrafficStatsIncoming(): Record<string, number>;
    getTrafficStatsOutgoing(): Record<string, number>;
    getTrafficStatsGameLevel(): Record<string, number>;
    setPlayerName(name: string): void;
    setPlayerProperties(properties: NativeProperties): boolean;
    removePlayerProperties(keys: string[]): boolean;
    setRoomOpen(open: boolean): boolean;
    setRoomVisible(visible: boolean): boolean;
    setRoomMaxPlayers(maxPlayers: number): boolean;
    setRoomProperties(properties: NativeProperties, expected: NativeProperties | null): boolean;
    removeRoomProperties(keys: string[]): boolean;
    setRoomLobbyProperties(keys: string[]): boolean;
    setRoomExpectedUsers(userIds: string[]): boolean;
    setMasterClient(playerNumber: number): boolean;
    sendEvent(code: number, payload: unknown, options: NativeEventOptions): boolean;
    sendDirect(bytes: Uint8Array, options: NativeDirectMessageOptions): number;
    changeGroups(remove: number[], add: number[]): boolean;
    sendCustomAuthData(auth: NativeAuthenticationValues): boolean;
    setAutoJoinLobby(enabled: boolean): void;
    fetchServerTimestamp(): void;
    setTrafficStatsEnabled(enabled: boolean): void;
    resetTrafficStats(): void;
    resetTrafficStatsMaximumCounters(): void;
    getVitalStatsToString(all: boolean): string;
    setDisconnectTimeout(ms: number): void;
    getDisconnectTimeout(): number;
    setPingInterval(ms: number): void;
    getPingInterval(): number;
    setSentCountAllowance(count: number): void;
    getSentCountAllowance(): number;
    setQuickResendAttempts(attempts: number): void;
    getQuickResendAttempts(): number;
    setCrcEnabled(enabled: boolean): void;
    getCrcEnabled(): boolean;
    setLimitOfUnreliableCommands(limit: number): void;
    getLimitOfUnreliableCommands(): number;
    on(name: string, callback: NativeEventCallback): NativeSubscription;
    onEvent(firstCode: number, lastCode: number, asBytes: boolean, callback: NativeCustomEventCallback): NativeSubscription;
    dispose(): boolean;
    isDisposed(): boolean;
}
export type NativeClientConstructor = new (options: NativeClientOptions) => NativeClient;
/**
 * `enums()`: `{ ConnectionState: { Disconnected: 0, ... }, ... }` keyed by the C++ enum name,
 * members by their C++ name. Besides the enums proper it holds `WarningCode`, `ErrorCode` and
 * one table per operation error enum (`ConnectError`, `DisconnectError`, `RegionError`,
 * `LobbyError`, `RoomListError`, `CreateRoomError`, `JoinRoomError`, `LeaveRoomError`,
 * `FindFriendsError`, `ClientError`).
 */
export type NativeEnumTables = Record<string, Record<string, number>>;
export interface NativeModule {
    Client: NativeClientConstructor;
    version(): string;
    protocolVersion(): string;
    enums(): NativeEnumTables;
    setLogSink(sink: ((level: number, message: string) => void) | null): void;
    setLogLevelMask(mask: number): void;
}
/** What emscripten's `-sMODULARIZE -sEXPORT_ES6` loader accepts (the subset this package uses). */
export interface NativeModuleOptions {
    websocket?: Record<string, unknown>;
    wasmBinary?: ArrayBuffer | Uint8Array;
    locateFile?: (path: string, scriptDirectory: string) => string;
    instantiateWasm?: (imports: unknown, receive: (instance: unknown, module?: unknown) => void) => unknown;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    onAbort?: (reason: unknown) => void;
    noExitRuntime?: boolean;
}
export type NativeModuleFactory = (options?: NativeModuleOptions) => Promise<NativeModule>;
