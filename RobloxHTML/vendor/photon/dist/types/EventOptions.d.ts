import type { EventCache, ReceiverGroup } from '../enums.js';
/** Options for {@link RealtimeClient.sendEvent}. Mirrors the native `EventOptions`. */
export interface EventOptions {
    /** Reliable delivery. Default `true`. */
    readonly reliable?: boolean;
    /** Sequencing channel 0..255. Default `0`. */
    readonly channel?: number;
    /** Who receives the event when `targetPlayers` is not given. Default `others`. */
    readonly receivers?: ReceiverGroup;
    /** Explicit list of player numbers to deliver to. */
    readonly targetPlayers?: readonly number[];
    /** Deliver only to players subscribed to this interest group (`0` = everyone). */
    readonly interestGroup?: number;
    /** Server-side caching for players who join later. Default `doNotCache`. */
    readonly caching?: EventCache;
    /** Encrypt the payload. */
    readonly encrypt?: boolean;
}
