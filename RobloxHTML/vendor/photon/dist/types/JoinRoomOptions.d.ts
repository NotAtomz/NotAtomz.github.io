/** Options for joining a room by name. Mirrors the native `JoinRoomOptions`. */
export interface JoinRoomOptions {
    /** Rejoin as the player this client was before disconnecting (requires a room with `playerTtlMs` other than 0). */
    readonly rejoin?: boolean;
    /** User ids for whom a slot is reserved. */
    readonly expectedUsers?: readonly string[];
}
