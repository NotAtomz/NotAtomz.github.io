import { createRealtimeClient } from "./vendor/photon/dist/index.js?v=20261106-photon6.0.1";

// Photon is only initialized for catalog maps with a validated game id.
const PHOTON_APP_ID = (
    document.querySelector('meta[name="blox-photon-app-id"]')?.content ||
    sessionStorage.getItem("bloxPhotonAppId") ||
    "d0123ab4-116f-4fdc-89ea-21538e0b205d"
).trim();
export const PHOTON_APP_VERSION = "blox-mp-6";
export const MAX_PLAYERS = 10;
export const ROOM_BUILD = PHOTON_APP_VERSION;
export const ROOM_LOBBY_TYPE = "sqlLobby";
export const EVENTS = Object.freeze({
    STATE: 1, WORLD_OPS: 2, CLIENT_OPS: 3, SNAP_REQ: 4, SNAP_CHUNK: 5,
    RPC: 6, CHAT: 7, HEALTH: 8, PROFILE: 9, WORLD_POSE: 10
});

const DEFAULT_REGION_KEY = "bloxPhotonRegion";
const CONNECT_TIMEOUT_MS = 15000;
const LOBBY_TIMEOUT_MS = 10000;

export function validGameId(value) {
    const id = String(value ?? "").trim();
    return /^[A-Za-z0-9_-]{1,32}$/.test(id) ? id : "";
}

export function lobbyNameFor(gameId) {
    const id = validGameId(gameId);
    if (!id) throw new Error("Invalid multiplayer game id");
    return `game-${id}`;
}

export function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        })
    ]).finally(() => clearTimeout(timer));
}

function makeClient({ username = "Player", region = "", autoJoinLobby = false } = {}) {
    const client = createRealtimeClient({
        appId: PHOTON_APP_ID,
        appVersion: PHOTON_APP_VERSION,
        regionSelection: region ? "select" : "default",
        autoPump: { intervalMs: 33 },
        disconnectTimeoutMs: 15000,
        limitOfUnreliableCommands: 32
    });
    return client.then(async photon => {
        try {
            photon.setAutoJoinLobby(autoJoinLobby);
            photon.setPlayerName(String(username).slice(0, 32));
            if (region) {
                const regionsPromise = withTimeout(photon.availableRegions(), CONNECT_TIMEOUT_MS, "Region lookup");
                const connectPromise = withTimeout(photon.connect({ username: String(username).slice(0, 32) }), CONNECT_TIMEOUT_MS, "Photon connection");
                void connectPromise.catch(() => {});
                const regions = await regionsPromise;
                if (!regions.some(entry => entry.code === region)) throw new Error(`Photon region '${region}' is unavailable`);
                await withTimeout(photon.selectRegion(region), CONNECT_TIMEOUT_MS, "Region selection");
                await connectPromise;
            } else {
                await withTimeout(photon.connect({ username: String(username).slice(0, 32) }), CONNECT_TIMEOUT_MS, "Photon connection");
            }
            return photon;
        } catch (error) {
            photon.dispose();
            throw error;
        }
    });
}

export async function getPhotonRegions() {
    const pending = createRealtimeClient({
        appId: PHOTON_APP_ID,
        appVersion: PHOTON_APP_VERSION,
        regionSelection: "select",
        autoPump: { intervalMs: 33 }
    });
    const photon = await pending;
    photon.setAutoJoinLobby(false);
    try {
        const regionsPromise = withTimeout(photon.availableRegions(), CONNECT_TIMEOUT_MS, "Region lookup");
        const connectPromise = withTimeout(photon.connect(), CONNECT_TIMEOUT_MS, "Photon connection");
        void connectPromise.catch(() => {});
        const regions = await regionsPromise;
        const selected = regions.find(entry => entry.code === localStorage.getItem(DEFAULT_REGION_KEY)) || regions[0];
        if (selected) await withTimeout(photon.selectRegion(selected.code), CONNECT_TIMEOUT_MS, "Region selection");
        await connectPromise;
        return regions;
    } finally {
        photon.dispose();
    }
}

export class PhotonGameSession {
    constructor(photon, gameId, region) {
        this.client = photon;
        this.gameId = validGameId(gameId);
        this.region = region || photon.bestRegion || "";
        this.room = photon.room;
        this.authorityNumber = 0;
        this.listeners = new Set();
        this.closed = false;
        this.lastChatSent = 0;
        this.sendWindowStartedAt = Date.now();
        this.sendWindowCount = 0;
        this.eventUnsubscribers = [];
        this._wire();
    }

    _wire() {
        const notify = event => { for (const listener of this.listeners) listener(event); };
        this.client.on("playerJoined", ({ player }) => notify({ type: "join", player }));
        this.client.on("playerLeft", ({ playerNumber }) => notify({ type: "leave", playerNumber }));
        this.client.on("playerPropertiesChanged", ({ playerNumber, changed }) => notify({ type: "properties", playerNumber, changed }));
        this.client.on("disconnected", ({ cause }) => { if (!this.closed) notify({ type: "disconnect", cause }); });
        this.client.on("masterClientChanged", event => notify({ type: "master", ...event }));
        for (const [name, code] of Object.entries(EVENTS)) {
            this.eventUnsubscribers.push(this.client.onEvent(code, event => {
                notify({ type: name.toLowerCase(), ...event });
            }, { asBytes: true }));
        }
        this.authorityNumber = this._computeAuthority();
    }

    _computeAuthority() {
        const synced = (this.client.room?.players || [])
            .filter(player => player.customProperties?.synced === true)
            .map(player => player.number)
            .sort((a, b) => a - b);
        const current = synced[0] || 0;
        if (!current && this.client.room?.isMasterClient) return this.client.localPlayer.number;
        return current;
    }

    onEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    send(eventName, payload, options = {}) {
        const code = EVENTS[eventName];
        if (!code || this.closed || !this.client.isInRoom) return false;
        let data = payload;
        if (!(payload instanceof Uint8Array)) {
            const json = JSON.stringify(payload);
            if (json.length > 45000) throw new Error("Multiplayer event exceeds the 45 KB safety limit");
            data = new TextEncoder().encode(json);
        }
        if (!(data instanceof Uint8Array) || data.byteLength > 45000) throw new Error("Multiplayer event exceeds the 45 KB safety limit");
        const now = Date.now();
        if (now - this.sendWindowStartedAt >= 1000) {
            this.sendWindowStartedAt = now;
            this.sendWindowCount = 0;
        }
        if (this.sendWindowCount >= 18) return false;
        this.sendWindowCount++;
        return this.client.sendEvent(code, data, { reliable: options.reliable ?? true, targetPlayers: options.targetPlayers });
    }

    sendChat(text) {
        const now = Date.now();
        if (now - this.lastChatSent < 1000) throw new Error("Please wait before sending another message.");
        const message = String(text ?? "").slice(0, 240);
        this.lastChatSent = now;
        return this.send("CHAT", { text: message, at: now });
    }

    async leave() {
        if (this.closed) return;
        this.closed = true;
        for (const unsubscribe of this.eventUnsubscribers) unsubscribe();
        try { if (this.client.isInRoom) await withTimeout(this.client.leaveRoom(), 5000, "Leave room"); } catch {}
        try { if (this.client.isConnected) await withTimeout(this.client.disconnect(), 5000, "Disconnect"); } catch {}
        this.client.dispose();
        this.listeners.clear();
    }
}

export async function connectGameLobby(gameId, { region = "", username = "Player" } = {}) {
    const id = validGameId(gameId);
    if (!id) throw new Error("This catalog game has no valid multiplayer game id");
    const chosenRegion = region === "auto" ? "" : region;
    const photon = await makeClient({ username, region: chosenRegion });
    try {
        await withTimeout(photon.joinLobby(lobbyNameFor(id), ROOM_LOBBY_TYPE), LOBBY_TIMEOUT_MS, "Game lobby join");
        if (photon.bestRegion) localStorage.setItem(DEFAULT_REGION_KEY, photon.bestRegion);
        return photon;
    } catch (error) {
        photon.dispose();
        throw error;
    }
}

export async function listGameServers(photon, gameId) {
    const id = validGameId(gameId);
    const filter = `C0 = '${id}' AND C1 = '${ROOM_BUILD}'`;
    return withTimeout(photon.getRoomList(lobbyNameFor(id), filter), LOBBY_TIMEOUT_MS, "Server list refresh")
        .then(rooms => rooms.filter(room => (room.customProperties?.gid ?? room.customProperties?.C0) === id && (room.customProperties?.build ?? room.customProperties?.C1) === ROOM_BUILD && room.maxPlayers === MAX_PLAYERS));
}

export function serverId(roomName) {
    const match = /^g[A-Za-z0-9_-]+-([0-9a-f]{8})$/i.exec(String(roomName));
    return match?.[1]?.toUpperCase() || String(roomName).slice(-8).toUpperCase();
}

export function generateRoomName(gameId) {
    const id = validGameId(gameId);
    if (!id) throw new Error("Invalid multiplayer game id");
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `g${id}-${hex}`;
}

export async function createGameRoom(photon, gameId) {
    const id = validGameId(gameId);
    return withTimeout(photon.createRoom(generateRoomName(id), {
        maxPlayers: MAX_PLAYERS,
        isVisible: true,
        isOpen: true,
        playerTtlMs: 0,
        emptyRoomTtlMs: 0,
        lobbyName: lobbyNameFor(id),
        lobby: ROOM_LOBBY_TYPE,
        lobbyProperties: ["C0", "C1"],
        customProperties: { gid: id, build: ROOM_BUILD, C0: id, C1: ROOM_BUILD, created: Date.now() }
    }), CONNECT_TIMEOUT_MS, "Create server");
}

export async function createGameSession(gameId, { region = "", username = "Player" } = {}) {
    const id = validGameId(gameId);
    if (!id) throw new Error("This catalog game has no valid multiplayer game id");
    const photon = await makeClient({ username, region: region === "auto" ? "" : region });
    try {
        await createGameRoom(photon, id);
        if (photon.bestRegion) localStorage.setItem(DEFAULT_REGION_KEY, photon.bestRegion);
        return new PhotonGameSession(photon, id, photon.bestRegion);
    } catch (error) {
        photon.dispose();
        throw error;
    }
}

export async function joinListedRoom(photon, room, gameId) {
    if (!room || room.playerCount >= Math.min(MAX_PLAYERS, room.maxPlayers || MAX_PLAYERS)) {
        const error = new Error("Game is full. Error code: 772");
        error.code = "roomFull";
        throw error;
    }
    const joined = await withTimeout(photon.joinRoom(room.name), CONNECT_TIMEOUT_MS, "Join server");
    if (joined.customProperties?.gid !== validGameId(gameId) || joined.customProperties?.build !== ROOM_BUILD) {
        await photon.leaveRoom().catch(() => {});
        throw new Error("This server belongs to a different game.");
    }
    return joined;
}

export async function matchmakeGame(gameId, { region = "", username = "Player", attempts = 3 } = {}) {
    const id = validGameId(gameId);
    const photon = await makeClient({ username, region: region === "auto" ? "" : region });
    try {
        const lobby = lobbyNameFor(id);
        await withTimeout(photon.joinLobby(lobby, ROOM_LOBBY_TYPE), LOBBY_TIMEOUT_MS, "Game lobby join");
        const filter = `C0 = '${id}' AND C1 = '${ROOM_BUILD}'`;
        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const rooms = await withTimeout(photon.getRoomList(lobby, filter), LOBBY_TIMEOUT_MS, "Matchmaking refresh");
                const candidates = rooms
                    .filter(room => room.isOpen && room.maxPlayers === MAX_PLAYERS && room.playerCount < MAX_PLAYERS
                        && (room.customProperties?.gid ?? room.customProperties?.C0) === id && (room.customProperties?.build ?? room.customProperties?.C1) === ROOM_BUILD)
                    .sort((a, b) => b.playerCount - a.playerCount);
                if (candidates.length) await withTimeout(photon.joinRoom(candidates[0].name), CONNECT_TIMEOUT_MS, "Join server");
                else await createGameRoom(photon, id);
                if (photon.room?.customProperties?.gid !== id) throw new Error("Room game id did not match");
                if (photon.bestRegion) localStorage.setItem(DEFAULT_REGION_KEY, photon.bestRegion);
                return new PhotonGameSession(photon, id, photon.bestRegion);
            } catch (error) {
                if (attempt + 1 >= attempts || !["roomFull", "roomNotFound", "roomClosed", "roomAlreadyExists", "noMatchFound"].includes(error?.code)) throw error;
            }
        }
        throw new Error("Could not find or create a server after three attempts.");
    } catch (error) {
        photon.dispose();
        throw error;
    }
}

export async function joinGameRoom(gameId, roomName, { region = "", username = "Player" } = {}) {
    const id = validGameId(gameId);
    if (!/^g[A-Za-z0-9_-]+-[0-9a-f]{8}$/i.test(String(roomName))) throw new Error("Invalid server id");
    const photon = await makeClient({ username, region: region === "auto" ? "" : region });
    try {
        await withTimeout(photon.joinRoom(roomName), CONNECT_TIMEOUT_MS, "Join server");
        if (photon.room?.customProperties?.gid !== id || photon.room?.customProperties?.build !== ROOM_BUILD || photon.room?.maxPlayers !== MAX_PLAYERS) {
            throw new Error("This server belongs to a different game or protocol version.");
        }
        return new PhotonGameSession(photon, id, photon.bestRegion);
    } catch (error) {
        photon.dispose();
        throw error;
    }
}

export function getSavedPhotonRegion() {
    return localStorage.getItem(DEFAULT_REGION_KEY) || "";
}

export function setSavedPhotonRegion(region) {
    if (region) localStorage.setItem(DEFAULT_REGION_KEY, region);
    else localStorage.removeItem(DEFAULT_REGION_KEY);
}
