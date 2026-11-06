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
export const ConnectionStateValues = {
    disconnected: 0,
    connecting: 1,
    connected: 2,
    joiningRoom: 3,
    inRoom: 4,
    leavingRoom: 5,
    disconnecting: 6,
};
export const DisconnectCauseValues = {
    none: 0,
    disconnectByServerUserLimit: 1,
    exceptionOnConnect: 2,
    disconnectByServer: 3,
    disconnectByServerLogic: 4,
    timeoutDisconnect: 5,
    exception: 6,
    invalidAuthentication: 7,
    maxCcuReached: 8,
    invalidRegion: 9,
    operationNotAllowedInCurrentState: 10,
    customAuthenticationFailed: 11,
    clientVersionTooOld: 12,
    clientVersionInvalid: 13,
    dashboardVersionInvalid: 14,
    authenticationTicketExpired: 15,
    disconnectByOperationLimit: 16,
};
export const EventCacheValues = {
    doNotCache: 0,
    addToRoomCache: 4,
    addToRoomCacheGlobal: 5,
    removeFromRoomCache: 6,
    removeFromRoomCacheForActorsLeft: 7,
};
export const ReceiverGroupValues = {
    others: 0,
    all: 1,
    masterClient: 2,
};
export const LobbyTypeValues = {
    default: 0,
    sqlLobby: 2,
};
export const MatchmakingModeValues = {
    fillRoom: 0,
    serialMatching: 1,
    randomMatching: 2,
};
export const DirectModeValues = {
    none: 0,
    allToAll: 3,
    masterToAll: 4,
};
export const CustomAuthenticationTypeValues = {
    none: 255,
    custom: 0,
    steam: 1,
    facebook: 2,
    oculus: 3,
    playStation4: 4,
    xbox: 5,
    viveport: 10,
    nintendoSwitch: 11,
    playStation5: 12,
    epic: 13,
    facebookGaming: 15,
};
export const RegionSelectionModeValues = {
    default: 0,
    select: 1,
};
export const ConnectionProtocolValues = {
    ws: 4,
    wss: 5,
};
export const LogLevelValues = {
    trace: 1,
    debug: 2,
    info: 4,
    warning: 8,
    error: 16,
};
export const ErrorCodes = {
    ok: 0,
    unknown: -1,
    disconnected: 2,
    notConnected: 50,
    alreadyConnected: 57,
    operationPending: 59,
    requestFailed: 60,
    invalidArgument: 61,
    connectionFailed: 1,
    serverFull: 4,
    invalidAuthentication: 10,
    customAuthenticationFailed: 11,
    authenticationTicketExpired: 12,
    maxCcuReached: 13,
    invalidRegion: 14,
    clientVersionTooOld: 15,
    roomFull: 20,
    roomClosed: 21,
    roomNotFound: 22,
    roomAlreadyExists: 23,
    noMatchFound: 24,
    alreadyJoined: 25,
    slotError: 26,
    alreadyInRoom: 58,
    rejoinNotFound: 62,
    userExcluded: 63,
    operationDenied: 30,
    operationInvalid: 31,
    operationLimitReached: 32,
    internalServerError: 40,
    pluginError: 41,
    notInRoom: 51,
    eventSizeMismatch: 53,
    eventEncodeFailed: 54,
    eventDecodeFailed: 55,
    eventPayloadTypeMismatch: 56,
};
/**
 * The members of each per-operation code union, keyed by the C++ enum's name (the key of its
 * native `enums()` table). The unions above are the public types; these lists exist so a unit
 * test can pin them against the native tables, and a type test pins each list against its union.
 *
 * @internal
 */
export const OperationErrorCodes = {
    ConnectError: [
        'ok',
        'unknown',
        'connectionFailed',
        'disconnected',
        'serverFull',
        'invalidAuthentication',
        'customAuthenticationFailed',
        'authenticationTicketExpired',
        'maxCcuReached',
        'invalidRegion',
        'clientVersionTooOld',
        'operationDenied',
        'operationInvalid',
        'internalServerError',
        'alreadyConnected',
        'operationPending',
    ],
    DisconnectError: ['ok', 'unknown', 'operationPending'],
    RegionError: ['ok', 'unknown', 'disconnected', 'operationPending', 'requestFailed'],
    LobbyError: [
        'ok',
        'unknown',
        'disconnected',
        'notConnected',
        'operationPending',
        'requestFailed',
    ],
    RoomListError: [
        'ok',
        'unknown',
        'disconnected',
        'notConnected',
        'operationPending',
        'requestFailed',
    ],
    CreateRoomError: [
        'ok',
        'unknown',
        'disconnected',
        'roomAlreadyExists',
        'slotError',
        'operationDenied',
        'operationInvalid',
        'operationLimitReached',
        'internalServerError',
        'pluginError',
        'notConnected',
        'alreadyInRoom',
        'operationPending',
        'requestFailed',
    ],
    JoinRoomError: [
        'ok',
        'unknown',
        'disconnected',
        'roomFull',
        'roomClosed',
        'roomNotFound',
        'roomAlreadyExists',
        'noMatchFound',
        'alreadyJoined',
        'slotError',
        'operationDenied',
        'operationInvalid',
        'operationLimitReached',
        'internalServerError',
        'pluginError',
        'notConnected',
        'alreadyInRoom',
        'operationPending',
        'requestFailed',
        'invalidArgument',
        'rejoinNotFound',
        'userExcluded',
    ],
    LeaveRoomError: [
        'ok',
        'unknown',
        'disconnected',
        'operationDenied',
        'operationInvalid',
        'internalServerError',
        'pluginError',
        'notInRoom',
        'operationPending',
        'requestFailed',
    ],
    FindFriendsError: [
        'ok',
        'unknown',
        'disconnected',
        'notConnected',
        'operationPending',
        'requestFailed',
        'invalidArgument',
    ],
    ClientError: [
        'ok',
        'unknown',
        'connectionFailed',
        'operationDenied',
        'operationInvalid',
        'operationLimitReached',
        'internalServerError',
        'pluginError',
        'eventSizeMismatch',
        'eventEncodeFailed',
        'eventDecodeFailed',
        'eventPayloadTypeMismatch',
        'requestFailed',
    ],
};
export const WarningCodeValues = {
    unknown: -1,
    outgoingReliableQueueFilling: 1,
    outgoingUnreliableQueueFilling: 2,
    outgoingAcksQueueFilling: 3,
    incomingReliableQueueFilling: 4,
    incomingUnreliableQueueFilling: 5,
    sentQueueFilling: 6,
};
/** @internal */
export function enumCodec(enumName, table, fallback) {
    const names = Object.keys(table);
    const reverse = new Map();
    for (const name of names) {
        reverse.set(table[name], name);
    }
    return {
        names,
        toNative(name) {
            const value = table[name];
            if (value === undefined) {
                throw new TypeError(`${enumName}: "${String(name)}" is not one of ${names.map((n) => `"${n}"`).join(', ')}`);
            }
            return value;
        },
        fromNative(value) {
            const name = reverse.get(value);
            if (name !== undefined) {
                return name;
            }
            if (fallback !== undefined) {
                return fallback;
            }
            throw new Error(`${enumName}: the native library reported the unknown value ${value}`);
        },
    };
}
/** @internal */
export const connectionStateCodec = enumCodec('ConnectionState', ConnectionStateValues);
/** @internal */
export const disconnectCauseCodec = enumCodec('DisconnectCause', DisconnectCauseValues, 'none');
/** @internal */
export const eventCacheCodec = enumCodec('EventCache', EventCacheValues);
/** @internal */
export const receiverGroupCodec = enumCodec('ReceiverGroup', ReceiverGroupValues);
/** @internal */
export const lobbyTypeCodec = enumCodec('LobbyType', LobbyTypeValues);
/** @internal */
export const matchmakingModeCodec = enumCodec('MatchmakingMode', MatchmakingModeValues);
/** @internal */
export const directModeCodec = enumCodec('DirectMode', DirectModeValues, 'none');
/** @internal */
export const customAuthenticationTypeCodec = enumCodec('CustomAuthenticationType', CustomAuthenticationTypeValues);
/** @internal */
export const regionSelectionModeCodec = enumCodec('RegionSelectionMode', RegionSelectionModeValues);
/** @internal */
export const connectionProtocolCodec = enumCodec('ConnectionProtocol', ConnectionProtocolValues);
/** @internal */
export const logLevelCodec = enumCodec('LogLevel', LogLevelValues);
/** @internal */
export const errorCodeCodec = enumCodec('ErrorCode', ErrorCodes, 'unknown');
/** @internal */
export const warningCodeCodec = enumCodec('WarningCode', WarningCodeValues, 'unknown');
