import { directModeCodec } from './enums.js';
import { playerFromNative } from './events.js';
import { expectByte, expectInt, expectProperties, expectStringArray } from './options.js';
import { propertiesFromNative } from './values.js';
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
export class Room {
    #host;
    #active = true;
    #cachedVersion = -1;
    #cached;
    /** @internal */
    constructor(host) {
        this.#host = host;
    }
    /** `false` once the client has left this room. */
    get isActive() {
        return this.#active;
    }
    get name() {
        return this.#snapshot().name;
    }
    get playerCount() {
        return this.#snapshot().playerCount;
    }
    /** `0` means unlimited. */
    get maxPlayers() {
        return this.#snapshot().maxPlayers;
    }
    get isOpen() {
        return this.#snapshot().isOpen;
    }
    get isVisible() {
        return this.#snapshot().isVisible;
    }
    get customProperties() {
        return propertiesFromNative(this.#snapshot().customProperties);
    }
    /** Every player in the room, including inactive ones, as snapshots. */
    get players() {
        return this.#snapshot().players.map(playerFromNative);
    }
    get masterClientNumber() {
        return this.#snapshot().masterClientId;
    }
    /** Whether the local player is the master client. */
    get isMasterClient() {
        return this.#snapshot().isMasterClient;
    }
    get playerTtlMs() {
        return this.#snapshot().playerTtlMs;
    }
    get emptyRoomTtlMs() {
        return this.#snapshot().emptyRoomTtlMs;
    }
    get publishUserId() {
        return this.#snapshot().publishUserId;
    }
    get directMode() {
        return directModeCodec.fromNative(this.#snapshot().directMode);
    }
    get expectedUsers() {
        return [...this.#snapshot().expectedUsers];
    }
    get lobbyProperties() {
        return [...this.#snapshot().lobbyProperties];
    }
    get suppressRoomEvents() {
        return this.#snapshot().suppressRoomEvents;
    }
    get plugins() {
        return [...this.#snapshot().plugins];
    }
    /** The player with this number, or `undefined`. */
    getPlayer(playerNumber) {
        const found = this.#snapshot().players.find((p) => p.number === playerNumber);
        return found === undefined ? undefined : playerFromNative(found);
    }
    setOpen(open) {
        this.#assertActive();
        return this.#host.native.setRoomOpen(open === true);
    }
    setVisible(visible) {
        this.#assertActive();
        return this.#host.native.setRoomVisible(visible === true);
    }
    setMaxPlayers(maxPlayers) {
        this.#assertActive();
        return this.#host.native.setRoomMaxPlayers(expectByte('maxPlayers', maxPlayers));
    }
    /**
     * Sets custom room properties. With `expected`, the change is a compare-and-swap: the
     * server applies it only if the room's current values equal `expected`.
     */
    setProperties(properties, expected) {
        this.#assertActive();
        const props = expectProperties('properties', properties);
        const cas = expected === undefined ? null : expectProperties('expected', expected);
        return this.#host.native.setRoomProperties(props, cas);
    }
    removeProperties(keys) {
        this.#assertActive();
        return this.#host.native.removeRoomProperties(expectStringArray('keys', keys));
    }
    /** Which custom property keys are visible in the lobby's room list. */
    setLobbyProperties(keys) {
        this.#assertActive();
        return this.#host.native.setRoomLobbyProperties(expectStringArray('keys', keys));
    }
    setExpectedUsers(userIds) {
        this.#assertActive();
        return this.#host.native.setRoomExpectedUsers(expectStringArray('userIds', userIds));
    }
    setMasterClient(playerNumber) {
        this.#assertActive();
        return this.#host.native.setMasterClient(expectInt('playerNumber', playerNumber));
    }
    /** @internal Called by the client when it leaves the room or disconnects. */
    deactivate() {
        this.#active = false;
        this.#cached = undefined;
    }
    #assertActive() {
        if (!this.#active) {
            throw new Error('Not in a room: this Room object belongs to a room the client has left');
        }
    }
    #snapshot() {
        this.#assertActive();
        if (this.#cached !== undefined && this.#cachedVersion === this.#host.stateVersion) {
            return this.#cached;
        }
        const snapshot = this.#host.native.getCurrentRoom();
        if (snapshot === null) {
            this.#active = false;
            throw new Error('Not in a room: the client has left the room this Room object belongs to');
        }
        this.#cached = snapshot;
        this.#cachedVersion = this.#host.stateVersion;
        return snapshot;
    }
}
