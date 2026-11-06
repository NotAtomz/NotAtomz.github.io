import { type DirectMode } from './enums.js';
import type { Player } from './types/index.js';
import { type Properties } from './values.js';
/**
 * The room the client is in.
 *
 * A `Room` is a live view: every getter reads the current native state, so `room.players`
 * inside a `playerJoined` handler already includes the new player. The same instance is
 * returned by `client.room` and by the join/create promise for as long as the client stays
 * in that room; after leaving, `isActive` turns `false` and the getters throw.
 *
 * Mutators are fire-and-forget like the C++ SDK's: they return whether the request was
 * sent, and the server's answer arrives as `roomPropertiesChanged` (or
 * `propertiesChangeFailed` for a rejected compare-and-swap).
 */
export declare class Room {
    #private;
    /** `false` once the client has left this room. */
    get isActive(): boolean;
    get name(): string;
    get playerCount(): number;
    /** `0` means unlimited. */
    get maxPlayers(): number;
    get isOpen(): boolean;
    get isVisible(): boolean;
    get customProperties(): Properties;
    /** Every player in the room, including inactive ones, as snapshots. */
    get players(): Player[];
    get masterClientNumber(): number;
    /** Whether the local player is the master client. */
    get isMasterClient(): boolean;
    get playerTtlMs(): number;
    get emptyRoomTtlMs(): number;
    get publishUserId(): boolean;
    get directMode(): DirectMode;
    get expectedUsers(): string[];
    get lobbyProperties(): string[];
    get suppressRoomEvents(): boolean;
    get plugins(): string[];
    /** The player with this number, or `undefined`. */
    getPlayer(playerNumber: number): Player | undefined;
    setOpen(open: boolean): boolean;
    setVisible(visible: boolean): boolean;
    setMaxPlayers(maxPlayers: number): boolean;
    /**
     * Sets custom room properties. With `expected`, the change is a compare-and-swap: the
     * server applies it only if the room's current values equal `expected`.
     */
    setProperties(properties: Properties, expected?: Properties): boolean;
    removeProperties(keys: readonly string[]): boolean;
    /** Which custom property keys are visible in the lobby's room list. */
    setLobbyProperties(keys: readonly string[]): boolean;
    setExpectedUsers(userIds: readonly string[]): boolean;
    setMasterClient(playerNumber: number): boolean;
}
