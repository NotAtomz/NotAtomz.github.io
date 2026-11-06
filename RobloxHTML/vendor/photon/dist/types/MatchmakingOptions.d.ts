import type { LobbyType, MatchmakingMode } from '../enums.js';
import type { Properties } from '../values.js';
/** Options for random matchmaking. Mirrors the native `MatchmakingOptions`. */
export interface MatchmakingOptions {
    /** Only rooms whose custom properties match these values. */
    readonly filter?: Properties;
    /** Only rooms with this `maxPlayers` (`0` = any). */
    readonly maxPlayers?: number;
    readonly mode?: MatchmakingMode;
    readonly lobbyName?: string;
    readonly lobby?: LobbyType;
    /** SQL `WHERE` clause for an `sqlLobby`. */
    readonly sqlFilter?: string;
    /** User ids for whom a slot is reserved in the room joined or created. */
    readonly expectedUsers?: readonly string[];
}
