import type { DirectMode, LobbyType } from '../enums.js';
import type { Properties } from '../values.js';
/** Options for creating a room. Mirrors the native `CreateRoomOptions`. */
export interface CreateRoomOptions {
    /** Listed in the lobby. Default `true`. */
    readonly isVisible?: boolean;
    /** Accepts new players. Default `true`. */
    readonly isOpen?: boolean;
    /** `0` means unlimited. */
    readonly maxPlayers?: number;
    /** Initial custom room properties. */
    readonly customProperties?: Properties;
    /** Which custom property keys are visible in the lobby's room list. */
    readonly lobbyProperties?: readonly string[];
    /** Lobby to create the room in. Default: the default lobby. */
    readonly lobbyName?: string;
    readonly lobby?: LobbyType;
    /** How long a player stays in the room as inactive after disconnecting (0 = removed at once, -1 = forever). */
    readonly playerTtlMs?: number;
    /** How long an empty room lives before the server disposes it. */
    readonly emptyRoomTtlMs?: number;
    /** Do not raise `playerJoined` / `playerLeft` events (saves bandwidth in large rooms). */
    readonly suppressRoomEvents?: boolean;
    /** Make every player's `userId` visible to the others. */
    readonly publishUserId?: boolean;
    /** Direct-messaging mode of the room. */
    readonly directMessaging?: DirectMode;
    /** Server plugins to load for this room. */
    readonly plugins?: readonly string[];
    /** User ids for whom a slot is reserved. */
    readonly expectedUsers?: readonly string[];
}
