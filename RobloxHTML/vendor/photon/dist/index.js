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
export { Room } from './Room.js';
export { RealtimeError, isRealtimeError } from './errors.js';
export { getNativeVersion as getVersion } from './native/loader.js';
export { ErrorCodes, WarningCodeValues, ConnectionStateValues, DisconnectCauseValues, EventCacheValues, ReceiverGroupValues, LobbyTypeValues, MatchmakingModeValues, DirectModeValues, CustomAuthenticationTypeValues, RegionSelectionModeValues, ConnectionProtocolValues, LogLevelValues, } from './enums.js';
export { bool, byte, int16, int32, int64, float, double, strings, bools, dictionary, custom, TaggedValue, CustomValue, ValueType, } from './values.js';
