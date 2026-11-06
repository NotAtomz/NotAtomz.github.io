/**
 * Option normalization: the public option objects (optional fields, string enums) become the
 * fully populated shapes the native module reads (every field present, enums as numbers,
 * defaults filled in). This is the one place where `exactOptionalPropertyTypes` meets
 * embind, and the place where a misuse fails synchronously with a readable TypeError before
 * anything crosses into wasm.
 *
 * The `Native*` interfaces are half of the embind contract; the other half is the C++
 * `OptionsBridge`, which reads exactly these field names.
 *
 * @internal
 * @module
 */
import { connectionProtocolCodec, customAuthenticationTypeCodec, directModeCodec, eventCacheCodec, lobbyTypeCodec, matchmakingModeCodec, receiverGroupCodec, regionSelectionModeCodec, } from './enums.js';
import { describe, isPlainObject, validateProperties } from './values.js';
// ---- normalizers ------------------------------------------------------------------------------
export function normalizeClientOptions(options) {
    expectObject('createRealtimeClient options', options);
    return {
        appId: expectNonEmptyString('appId', options.appId),
        appVersion: expectNonEmptyString('appVersion', options.appVersion),
        protocol: optionalEnum('protocol', options.protocol, connectionProtocolCodec, 'wss'),
        useAlternativePorts: optionalBoolean('useAlternativePorts', options.useAlternativePorts, false),
        regionSelection: optionalEnum('regionSelection', options.regionSelection, regionSelectionModeCodec, 'default'),
        autoLobbyStats: optionalBoolean('autoLobbyStats', options.autoLobbyStats, false),
        disconnectTimeoutMs: optionalInt('disconnectTimeoutMs', options.disconnectTimeoutMs, 10000, 0),
        pingIntervalMs: optionalInt('pingIntervalMs', options.pingIntervalMs, 2000, 0),
        enableCrc: optionalBoolean('enableCrc', options.enableCrc, false),
        sentCountAllowance: optionalInt('sentCountAllowance', options.sentCountAllowance, 5, 0),
        quickResendAttempts: optionalInt('quickResendAttempts', options.quickResendAttempts, 0, 0, 255),
        limitOfUnreliableCommands: optionalInt('limitOfUnreliableCommands', options.limitOfUnreliableCommands, 0, 0),
    };
}
export function normalizeAuthenticationValues(auth, path = 'auth') {
    if (auth === undefined) {
        return { userId: '', type: customAuthenticationTypeCodec.toNative('none'), parameters: '', data: null };
    }
    expectObject(path, auth);
    let data = null;
    if (auth.data !== undefined) {
        if (auth.data instanceof Uint8Array || typeof auth.data === 'string') {
            data = auth.data;
        }
        else {
            validateProperties(auth.data, `${path}.data`);
            data = auth.data;
        }
    }
    return {
        userId: optionalString(`${path}.userId`, auth.userId, ''),
        type: optionalEnum(`${path}.type`, auth.type, customAuthenticationTypeCodec, 'none'),
        parameters: optionalString(`${path}.parameters`, auth.parameters, ''),
        data,
    };
}
export function normalizeConnectOptions(options) {
    if (options === undefined) {
        return {
            auth: normalizeAuthenticationValues(undefined),
            username: '',
            serverAddress: '',
            tryUseDatagramEncryption: false,
        };
    }
    expectObject('connect options', options);
    return {
        auth: normalizeAuthenticationValues(options.auth),
        username: optionalString('username', options.username, ''),
        serverAddress: optionalString('serverAddress', options.serverAddress, ''),
        tryUseDatagramEncryption: optionalBoolean('tryUseDatagramEncryption', options.tryUseDatagramEncryption, false),
    };
}
export function normalizeCreateRoomOptions(options, path = 'createOptions') {
    const o = options ?? {};
    expectObject(path, o);
    return {
        isVisible: optionalBoolean(`${path}.isVisible`, o.isVisible, true),
        isOpen: optionalBoolean(`${path}.isOpen`, o.isOpen, true),
        maxPlayers: optionalInt(`${path}.maxPlayers`, o.maxPlayers, 0, 0, 255),
        customProperties: optionalProperties(`${path}.customProperties`, o.customProperties),
        lobbyProperties: optionalStringArray(`${path}.lobbyProperties`, o.lobbyProperties),
        lobbyName: optionalString(`${path}.lobbyName`, o.lobbyName, ''),
        lobby: optionalEnum(`${path}.lobby`, o.lobby, lobbyTypeCodec, 'default'),
        playerTtlMs: optionalInt(`${path}.playerTtlMs`, o.playerTtlMs, 0, -1),
        emptyRoomTtlMs: optionalInt(`${path}.emptyRoomTtlMs`, o.emptyRoomTtlMs, 0, 0),
        suppressRoomEvents: optionalBoolean(`${path}.suppressRoomEvents`, o.suppressRoomEvents, false),
        publishUserId: optionalBoolean(`${path}.publishUserId`, o.publishUserId, false),
        directMessaging: optionalEnum(`${path}.directMessaging`, o.directMessaging, directModeCodec, 'none'),
        plugins: optionalStringArray(`${path}.plugins`, o.plugins),
        expectedUsers: optionalStringArray(`${path}.expectedUsers`, o.expectedUsers),
    };
}
export function normalizeJoinRoomOptions(options, path = 'joinOptions') {
    const o = options ?? {};
    expectObject(path, o);
    return {
        rejoin: optionalBoolean(`${path}.rejoin`, o.rejoin, false),
        expectedUsers: optionalStringArray(`${path}.expectedUsers`, o.expectedUsers),
    };
}
export function normalizeMatchmakingOptions(options, path = 'matchmakingOptions') {
    const o = options ?? {};
    expectObject(path, o);
    return {
        filter: optionalProperties(`${path}.filter`, o.filter),
        maxPlayers: optionalInt(`${path}.maxPlayers`, o.maxPlayers, 0, 0, 255),
        mode: optionalEnum(`${path}.mode`, o.mode, matchmakingModeCodec, 'fillRoom'),
        lobbyName: optionalString(`${path}.lobbyName`, o.lobbyName, ''),
        lobby: optionalEnum(`${path}.lobby`, o.lobby, lobbyTypeCodec, 'default'),
        sqlFilter: optionalString(`${path}.sqlFilter`, o.sqlFilter, ''),
        expectedUsers: optionalStringArray(`${path}.expectedUsers`, o.expectedUsers),
    };
}
export function normalizeEventOptions(options, path = 'options') {
    const o = options ?? {};
    expectObject(path, o);
    return {
        reliable: optionalBoolean(`${path}.reliable`, o.reliable, true),
        channel: optionalInt(`${path}.channel`, o.channel, 0, 0, 255),
        receivers: optionalEnum(`${path}.receivers`, o.receivers, receiverGroupCodec, 'others'),
        targetPlayers: optionalIntArray(`${path}.targetPlayers`, o.targetPlayers),
        interestGroup: optionalInt(`${path}.interestGroup`, o.interestGroup, 0, 0, 255),
        caching: optionalEnum(`${path}.caching`, o.caching, eventCacheCodec, 'doNotCache'),
        encrypt: optionalBoolean(`${path}.encrypt`, o.encrypt, false),
    };
}
export function normalizeDirectMessageOptions(options, path = 'options') {
    const o = options ?? {};
    expectObject(path, o);
    return {
        targetPlayers: optionalIntArray(`${path}.targetPlayers`, o.targetPlayers),
        receivers: optionalEnum(`${path}.receivers`, o.receivers, receiverGroupCodec, 'others'),
        fallbackRelay: optionalBoolean(`${path}.fallbackRelay`, o.fallbackRelay, false),
    };
}
// ---- argument checks (exported for the client's own parameter validation) ---------------------
export function expectObject(name, value) {
    if (!isPlainObject(value)) {
        throw new TypeError(`${name}: expected an object, got ${describe(value)}`);
    }
}
export function expectString(name, value) {
    if (typeof value !== 'string') {
        throw new TypeError(`${name}: expected a string, got ${describe(value)}`);
    }
    return value;
}
export function expectNonEmptyString(name, value) {
    const s = expectString(name, value);
    if (s.length === 0) {
        throw new TypeError(`${name}: must not be empty`);
    }
    return s;
}
export function expectBoolean(name, value) {
    if (typeof value !== 'boolean') {
        throw new TypeError(`${name}: expected a boolean, got ${describe(value)}`);
    }
    return value;
}
export function expectInt(name, value, min = -2147483648, max = 2147483647) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new TypeError(`${name}: expected an integer, got ${typeof value === 'number' ? String(value) : describe(value)}`);
    }
    if (value < min || value > max) {
        throw new RangeError(`${name}: ${String(value)} is outside ${String(min)}..${String(max)}`);
    }
    return value;
}
export function expectByte(name, value) {
    return expectInt(name, value, 0, 255);
}
export function expectStringArray(name, value) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name}: expected an array of strings, got ${describe(value)}`);
    }
    return value.map((v, i) => expectString(`${name}[${String(i)}]`, v));
}
export function expectIntArray(name, value, min, max) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name}: expected an array of integers, got ${describe(value)}`);
    }
    return value.map((v, i) => expectInt(`${name}[${String(i)}]`, v, min, max));
}
export function expectProperties(name, value) {
    validateProperties(value, name);
    return value instanceof Map
        ? Object.fromEntries(value)
        : value;
}
export function expectUint8Array(name, value) {
    if (!(value instanceof Uint8Array)) {
        throw new TypeError(`${name}: expected a Uint8Array, got ${describe(value)}`);
    }
    return value;
}
function optionalString(name, value, fallback) {
    return value === undefined ? fallback : expectString(name, value);
}
function optionalBoolean(name, value, fallback) {
    return value === undefined ? fallback : expectBoolean(name, value);
}
function optionalInt(name, value, fallback, min, max) {
    return value === undefined ? fallback : expectInt(name, value, min, max);
}
function optionalEnum(name, value, codec, fallback) {
    if (value === undefined) {
        return codec.toNative(fallback);
    }
    if (typeof value !== 'string' || !codec.names.includes(value)) {
        throw new TypeError(`${name}: expected one of ${codec.names.map((n) => `"${n}"`).join(', ')}, got ${typeof value === 'string' ? `"${value}"` : describe(value)}`);
    }
    return codec.toNative(value);
}
function optionalStringArray(name, value) {
    return value === undefined ? [] : expectStringArray(name, value);
}
function optionalIntArray(name, value) {
    return value === undefined ? [] : expectIntArray(name, value);
}
function optionalProperties(name, value) {
    return value === undefined ? {} : expectProperties(name, value);
}
