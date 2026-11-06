import type { ReceiverGroup } from '../enums.js';
/** Options for {@link RealtimeClient.sendDirect}. Mirrors the native `DirectMessageOptions`. */
export interface DirectMessageOptions {
    readonly targetPlayers?: readonly number[];
    readonly receivers?: ReceiverGroup;
    /** Relay through the server when no direct connection exists. */
    readonly fallbackRelay?: boolean;
}
