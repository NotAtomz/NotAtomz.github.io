/**
 * Photon Realtime Core for the web.
 *
 * ```ts
 * import { createRealtimeClient } from '@photonengine/realtime-core';
 *
 * const client = await createRealtimeClient({ appId: 'your-app-id', appVersion: '1.0' });
 * await client.connect();
 * const room = await client.joinRandomOrCreateRoom();
 * client.onEvent(1, ({ senderNumber, data }) => console.log(senderNumber, data));
 * client.sendEvent(1, { hello: 'world' });
 * ```
 *
 * @packageDocumentation
 */
export { createRealtimeClient, preloadRealtime, RealtimeClient } from './RealtimeClient.js';
export type { ClientConfig, CreateClientOptions, PumpControl } from './RealtimeClient.js';
export { Room } from './Room.js';
export { RealtimeError, isRealtimeError } from './errors.js';
export type { WasmLocation, RealtimeVersion } from './native/loader.js';
export { getNativeVersion as getVersion } from './native/loader.js';
export { ErrorCodes, WarningCodeValues, ConnectionStateValues, DisconnectCauseValues, EventCacheValues, ReceiverGroupValues, LobbyTypeValues, MatchmakingModeValues, DirectModeValues, CustomAuthenticationTypeValues, RegionSelectionModeValues, ConnectionProtocolValues, LogLevelValues, } from './enums.js';
export type { ErrorCode, ConnectErrorCode, DisconnectErrorCode, RegionErrorCode, LobbyErrorCode, RoomListErrorCode, CreateRoomErrorCode, JoinRoomErrorCode, LeaveRoomErrorCode, FindFriendsErrorCode, ClientErrorCode, WarningCode, ConnectionState, DisconnectCause, EventCache, ReceiverGroup, LobbyType, MatchmakingMode, DirectMode, CustomAuthenticationType, RegionSelectionMode, ConnectionProtocol, LogLevel, } from './enums.js';
export { bool, byte, int16, int32, int64, float, double, strings, bools, dictionary, custom, TaggedValue, CustomValue, ValueType, } from './values.js';
export type { RealtimeValue, RealtimeKey, Properties, DictionaryKeyType, ValueTag } from './values.js';
export type { ClientEvents, ClientEventName, CustomEvent, CustomEventOptions, ListenerOptions, OnceOptions, Unsubscribe, } from './events.js';
export type * from './types/index.js';
