/**
 * Enumerations of the Realtime Core client, as camelCase string unions.
 *
 * The native library speaks integers (the `*Values` tables below are exact copies of its
 * C++ enumerations).
 * JavaScript code reads and writes the names; the conversion happens once at the boundary.
 *
 * Where the web build of the native library lacks a member -- UDP/TCP transports, the
 * "best region by ping" selection mode, the peer-to-peer direct modes -- the union omits
 * it, so TypeScript rejects it at compile time and the runtime never has to.
 *
 * @module
 */
/** Connection state of a {@link RealtimeClient}. */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'joiningRoom' | 'inRoom' | 'leavingRoom' | 'disconnecting';
export declare const ConnectionStateValues: {
    readonly disconnected: 0;
    readonly connecting: 1;
    readonly connected: 2;
    readonly joiningRoom: 3;
    readonly inRoom: 4;
    readonly leavingRoom: 5;
    readonly disconnecting: 6;
};
/** Why the last connection ended. `none` while connected or before the first connect. */
export type DisconnectCause = 'none' | 'disconnectByServerUserLimit' | 'exceptionOnConnect' | 'disconnectByServer' | 'disconnectByServerLogic' | 'timeoutDisconnect' | 'exception' | 'invalidAuthentication' | 'maxCcuReached' | 'invalidRegion' | 'operationNotAllowedInCurrentState' | 'customAuthenticationFailed' | 'clientVersionTooOld' | 'clientVersionInvalid' | 'dashboardVersionInvalid' | 'authenticationTicketExpired' | 'disconnectByOperationLimit';
export declare const DisconnectCauseValues: {
    readonly none: 0;
    readonly disconnectByServerUserLimit: 1;
    readonly exceptionOnConnect: 2;
    readonly disconnectByServer: 3;
    readonly disconnectByServerLogic: 4;
    readonly timeoutDisconnect: 5;
    readonly exception: 6;
    readonly invalidAuthentication: 7;
    readonly maxCcuReached: 8;
    readonly invalidRegion: 9;
    readonly operationNotAllowedInCurrentState: 10;
    readonly customAuthenticationFailed: 11;
    readonly clientVersionTooOld: 12;
    readonly clientVersionInvalid: 13;
    readonly dashboardVersionInvalid: 14;
    readonly authenticationTicketExpired: 15;
    readonly disconnectByOperationLimit: 16;
};
/** How the server caches a custom event for players who join later. */
export type EventCache = 'doNotCache' | 'addToRoomCache' | 'addToRoomCacheGlobal' | 'removeFromRoomCache' | 'removeFromRoomCacheForActorsLeft';
export declare const EventCacheValues: {
    readonly doNotCache: 0;
    readonly addToRoomCache: 4;
    readonly addToRoomCacheGlobal: 5;
    readonly removeFromRoomCache: 6;
    readonly removeFromRoomCacheForActorsLeft: 7;
};
/** Who receives a custom event or direct message. */
export type ReceiverGroup = 'others' | 'all' | 'masterClient';
export declare const ReceiverGroupValues: {
    readonly others: 0;
    readonly all: 1;
    readonly masterClient: 2;
};
/** Lobby flavour: the default lobby or an SQL-filterable one. */
export type LobbyType = 'default' | 'sqlLobby';
export declare const LobbyTypeValues: {
    readonly default: 0;
    readonly sqlLobby: 2;
};
/** How random matchmaking picks a room. */
export type MatchmakingMode = 'fillRoom' | 'serialMatching' | 'randomMatching';
export declare const MatchmakingModeValues: {
    readonly fillRoom: 0;
    readonly serialMatching: 1;
    readonly randomMatching: 2;
};
/**
 * Direct-messaging mode of a room. The web build has no peer-to-peer transport, so only
 * the relayed variants exist here (`allToOthers` / `masterToOthers` are native-only).
 */
export type DirectMode = 'none' | 'allToAll' | 'masterToAll';
export declare const DirectModeValues: {
    readonly none: 0;
    readonly allToAll: 3;
    readonly masterToAll: 4;
};
/** Authentication provider for {@link AuthenticationValues}. */
export type CustomAuthenticationType = 'none' | 'custom' | 'steam' | 'facebook' | 'oculus' | 'playStation4' | 'xbox' | 'viveport' | 'nintendoSwitch' | 'playStation5' | 'epic' | 'facebookGaming';
export declare const CustomAuthenticationTypeValues: {
    readonly none: 255;
    readonly custom: 0;
    readonly steam: 1;
    readonly facebook: 2;
    readonly oculus: 3;
    readonly playStation4: 4;
    readonly xbox: 5;
    readonly viveport: 10;
    readonly nintendoSwitch: 11;
    readonly playStation5: 12;
    readonly epic: 13;
    readonly facebookGaming: 15;
};
/**
 * How the client picks a region. `best` (ping every region) needs threads and does not
 * exist in the web build; call {@link RealtimeClient.availableRegions} and
 * {@link RealtimeClient.selectRegion} instead.
 */
export type RegionSelectionMode = 'default' | 'select';
export declare const RegionSelectionModeValues: {
    readonly default: 0;
    readonly select: 1;
};
/** Transport. Browsers only speak WebSocket; `wss` is required from an `https://` page. */
export type ConnectionProtocol = 'ws' | 'wss';
export declare const ConnectionProtocolValues: {
    readonly ws: 4;
    readonly wss: 5;
};
/** Native log level. Levels are bit flags on the native side; see {@link LogLevelValues}. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error';
export declare const LogLevelValues: {
    readonly trace: 1;
    readonly debug: 2;
    readonly info: 4;
    readonly warning: 8;
    readonly error: 16;
};
/**
 * Error codes carried by {@link RealtimeError.code}. Mirrors the native `ErrorCode`: every
 * code any operation or the `error` event can report. Each operation reports only a subset,
 * named by its own type ({@link ConnectErrorCode}, {@link JoinRoomErrorCode}, ...).
 */
export type ErrorCode = 'ok' | 'unknown' | 'disconnected' | 'notConnected' | 'alreadyConnected' | 'operationPending' | 'requestFailed' | 'invalidArgument' | 'connectionFailed' | 'serverFull' | 'invalidAuthentication' | 'customAuthenticationFailed' | 'authenticationTicketExpired' | 'maxCcuReached' | 'invalidRegion' | 'clientVersionTooOld' | 'roomFull' | 'roomClosed' | 'roomNotFound' | 'roomAlreadyExists' | 'noMatchFound' | 'alreadyJoined' | 'slotError' | 'alreadyInRoom' | 'rejoinNotFound' | 'userExcluded' | 'operationDenied' | 'operationInvalid' | 'operationLimitReached' | 'internalServerError' | 'pluginError' | 'notInRoom' | 'eventSizeMismatch' | 'eventEncodeFailed' | 'eventDecodeFailed' | 'eventPayloadTypeMismatch';
export declare const ErrorCodes: {
    readonly ok: 0;
    readonly unknown: -1;
    readonly disconnected: 2;
    readonly notConnected: 50;
    readonly alreadyConnected: 57;
    readonly operationPending: 59;
    readonly requestFailed: 60;
    readonly invalidArgument: 61;
    readonly connectionFailed: 1;
    readonly serverFull: 4;
    readonly invalidAuthentication: 10;
    readonly customAuthenticationFailed: 11;
    readonly authenticationTicketExpired: 12;
    readonly maxCcuReached: 13;
    readonly invalidRegion: 14;
    readonly clientVersionTooOld: 15;
    readonly roomFull: 20;
    readonly roomClosed: 21;
    readonly roomNotFound: 22;
    readonly roomAlreadyExists: 23;
    readonly noMatchFound: 24;
    readonly alreadyJoined: 25;
    readonly slotError: 26;
    readonly alreadyInRoom: 58;
    readonly rejoinNotFound: 62;
    readonly userExcluded: 63;
    readonly operationDenied: 30;
    readonly operationInvalid: 31;
    readonly operationLimitReached: 32;
    readonly internalServerError: 40;
    readonly pluginError: 41;
    readonly notInRoom: 51;
    readonly eventSizeMismatch: 53;
    readonly eventEncodeFailed: 54;
    readonly eventDecodeFailed: 55;
    readonly eventPayloadTypeMismatch: 56;
};
/** Codes {@link RealtimeClient.connect} and {@link RealtimeClient.reconnect} reject with. */
export type ConnectErrorCode = 'ok' | 'unknown' | 'connectionFailed' | 'disconnected' | 'serverFull' | 'invalidAuthentication' | 'customAuthenticationFailed' | 'authenticationTicketExpired' | 'maxCcuReached' | 'invalidRegion' | 'clientVersionTooOld' | 'operationDenied' | 'operationInvalid' | 'internalServerError' | 'alreadyConnected' | 'operationPending';
/** Codes {@link RealtimeClient.disconnect} rejects with. */
export type DisconnectErrorCode = 'ok' | 'unknown' | 'operationPending';
/** Codes {@link RealtimeClient.availableRegions} and {@link RealtimeClient.selectRegion} reject with. */
export type RegionErrorCode = 'ok' | 'unknown' | 'disconnected' | 'operationPending' | 'requestFailed';
/**
 * Codes {@link RealtimeClient.joinLobby}, {@link RealtimeClient.leaveLobby} and
 * {@link RealtimeClient.getLobbyStats} reject with.
 */
export type LobbyErrorCode = 'ok' | 'unknown' | 'disconnected' | 'notConnected' | 'operationPending' | 'requestFailed';
/** Codes {@link RealtimeClient.getRoomList} rejects with. */
export type RoomListErrorCode = 'ok' | 'unknown' | 'disconnected' | 'notConnected' | 'operationPending' | 'requestFailed';
/** Codes {@link RealtimeClient.createRoom} rejects with. */
export type CreateRoomErrorCode = 'ok' | 'unknown' | 'disconnected' | 'roomAlreadyExists' | 'slotError' | 'operationDenied' | 'operationInvalid' | 'operationLimitReached' | 'internalServerError' | 'pluginError' | 'notConnected' | 'alreadyInRoom' | 'operationPending' | 'requestFailed';
/**
 * Codes {@link RealtimeClient.joinRoom}, {@link RealtimeClient.joinOrCreateRoom},
 * {@link RealtimeClient.joinRandomRoom} and {@link RealtimeClient.joinRandomOrCreateRoom} reject with.
 */
export type JoinRoomErrorCode = 'ok' | 'unknown' | 'disconnected' | 'roomFull' | 'roomClosed' | 'roomNotFound' | 'roomAlreadyExists' | 'noMatchFound' | 'alreadyJoined' | 'slotError' | 'operationDenied' | 'operationInvalid' | 'operationLimitReached' | 'internalServerError' | 'pluginError' | 'notConnected' | 'alreadyInRoom' | 'operationPending' | 'requestFailed' | 'invalidArgument' | 'rejoinNotFound' | 'userExcluded';
/** Codes {@link RealtimeClient.leaveRoom} rejects with. */
export type LeaveRoomErrorCode = 'ok' | 'unknown' | 'disconnected' | 'operationDenied' | 'operationInvalid' | 'internalServerError' | 'pluginError' | 'notInRoom' | 'operationPending' | 'requestFailed';
/** Codes {@link RealtimeClient.findFriends} rejects with. */
export type FindFriendsErrorCode = 'ok' | 'unknown' | 'disconnected' | 'notConnected' | 'operationPending' | 'requestFailed' | 'invalidArgument';
/** Codes of the `error` event: failures outside any pending operation. */
export type ClientErrorCode = 'ok' | 'unknown' | 'connectionFailed' | 'operationDenied' | 'operationInvalid' | 'operationLimitReached' | 'internalServerError' | 'pluginError' | 'eventSizeMismatch' | 'eventEncodeFailed' | 'eventDecodeFailed' | 'eventPayloadTypeMismatch' | 'requestFailed';
/**
 * A non-fatal condition the `warning` event reports, mirroring the native `WarningCode`.
 * The queue warnings mean the client is not serviced often enough: a filling outgoing queue
 * wants more frequent sends, a filling incoming queue more frequent dispatch, and a filling
 * sent queue means the server is not acknowledging reliable commands.
 */
export type WarningCode = 'unknown' | 'outgoingReliableQueueFilling' | 'outgoingUnreliableQueueFilling' | 'outgoingAcksQueueFilling' | 'incomingReliableQueueFilling' | 'incomingUnreliableQueueFilling' | 'sentQueueFilling';
export declare const WarningCodeValues: {
    readonly unknown: -1;
    readonly outgoingReliableQueueFilling: 1;
    readonly outgoingUnreliableQueueFilling: 2;
    readonly outgoingAcksQueueFilling: 3;
    readonly incomingReliableQueueFilling: 4;
    readonly incomingUnreliableQueueFilling: 5;
    readonly sentQueueFilling: 6;
};
