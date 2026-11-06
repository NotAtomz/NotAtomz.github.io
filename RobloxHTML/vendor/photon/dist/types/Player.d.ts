import type { Properties } from '../values.js';
/** A snapshot of a player in the room (or of the local player). */
export interface Player {
    /** Player number, unique within the room. */
    readonly number: number;
    readonly name: string;
    /** Empty unless the room publishes user ids. */
    readonly userId: string;
    readonly customProperties: Properties;
    /** Disconnected but still in the room (rooms with a player time-to-live). */
    readonly isInactive: boolean;
    readonly isMasterClient: boolean;
}
