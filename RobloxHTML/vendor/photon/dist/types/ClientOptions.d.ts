import type { ConnectionProtocol, RegionSelectionMode } from '../enums.js';
/**
 * Identity and tuning of a client. Mirrors the native `ClientConstructOptions`.
 *
 * `appId` and `appVersion` are required; everything else has the native default.
 */
export interface ClientOptions {
    /** The Photon application id from the dashboard. */
    readonly appId: string;
    /** Clients only meet clients with the same app id *and* app version. */
    readonly appVersion: string;
    /** Transport. Browsers only speak WebSocket; the default is `wss`. */
    readonly protocol?: ConnectionProtocol;
    /** Use the alternative server ports (for networks that block the standard ones). */
    readonly useAlternativePorts?: boolean;
    /** `default` lets the name server pick the region; `select` expects a {@link RealtimeClient.selectRegion} call. */
    readonly regionSelection?: RegionSelectionMode;
    /** Subscribe to lobby statistics automatically (see the `lobbyStats` event). */
    readonly autoLobbyStats?: boolean;
    /** Milliseconds without any server response before the connection counts as lost. Default `10000`. */
    readonly disconnectTimeoutMs?: number;
    /** Milliseconds between pings while idle. Default `2000`. */
    readonly pingIntervalMs?: number;
    /** Add a CRC to every packet (detects corruption at a bandwidth cost). Default `false`. */
    readonly enableCrc?: boolean;
    /** How many times a reliable command is repeated before the connection counts as lost. Default `5`. */
    readonly sentCountAllowance?: number;
    /** Extra quick resends of reliable commands (at most 4 take effect). Default `0`. */
    readonly quickResendAttempts?: number;
    /** Upper bound of unreliable commands queued per channel; older ones are dropped. Default `0` (no limit). */
    readonly limitOfUnreliableCommands?: number;
}
