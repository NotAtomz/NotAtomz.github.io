import type { DirectMode } from '../enums.js';
import type { Properties } from '../values.js';
/** A room as listed in a lobby. */
export interface RoomListing {
    readonly name: string;
    readonly playerCount: number;
    readonly maxPlayers: number;
    readonly isOpen: boolean;
    readonly directMessaging: DirectMode;
    /** The custom properties the room exposes to the lobby. */
    readonly customProperties: Properties;
}
