import { EVENTS, MAX_PLAYERS, createGameSession, matchmakeGame, joinGameRoom, withTimeout } from "./blox-mp-net.js?v=20261106-mp7";

const MAX_EVENT_BYTES = 45000;
const SNAPSHOT_CHUNK_BYTES = 8000;
const PROFILE_CHUNK_BYTES = 32000;
const STATE_INTERVAL_MS = 100;
const WORLD_SCAN_INTERVAL_MS = 250;
const WORLD_POSE_SEND_INTERVAL_MS = 166;
const MAX_CHAT_LENGTH = 240;

function boundedObject(value, maxBytes = MAX_EVENT_BYTES) {
    const text = JSON.stringify(value);
    if (text.length > maxBytes) throw new Error("Multiplayer payload is too large");
    return new TextEncoder().encode(text);
}

function decodeObject(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_EVENT_BYTES) return null;
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}

export class MultiplayerRuntime {
    constructor(session) {
        this.session = session;
        this.client = session.client;
        window.__bloxMpLocalPlayerNumber = Number(this.client.localPlayer.number);
        this.lastStateAt = 0;
        this.lastHeartbeatAt = 0;
        this.lastStateJson = "";
        this.tick = 0;
        this.authority = 0;
        this.handoverPending = false;
        this.started = false;
        this.timer = 0;
        this.snapshotTransfer = null;
        this.profileTransfers = new Map();
        this.lastWorldScanAt = 0;
        this.pendingWorldOps = [];
        this.pendingIncomingWorldOps = [];
        this.pendingIncomingWorldPoses = [];
        this.pendingWorldPoses = new Map();
        this.lastWorldPoseAt = 0;
        this.lastAuthorityChangeAt = 0;
        window.__bloxMpSendChat = text => session.sendChat(text);
        window.__bloxMpSendRpc = (payload, targetPlayers) => session.send("RPC", boundedObject(payload), { targetPlayers });
        window.__bloxMpLeave = () => session.leave();
        this.unsubscribe = session.onEvent(event => {
            void this._receive(event).catch(error => console.error("[Blox Multiplayer] Event handler failed:", error));
        });
        this._observeAuthority();
        this._wirePlayers();
        this.client.setPlayerProperties({ loaded: true, synced: false });
        void this._sendWearables();
    }

    _wirePlayers() {
        this.client.on("playerJoined", ({ player }) => { this._observeAuthority(); window.__bloxMpPlayerJoined?.(player); this._refreshRoster(); void this._sendWearables([player.number]); });
        this.client.on("playerLeft", ({ playerNumber }) => { window.__bloxMpPlayerLeft?.(playerNumber); this._observeAuthority(); this._refreshRoster(); });
        this.client.on("playerPropertiesChanged", () => { this._observeAuthority(); this._refreshRoster(); });
        this.client.on("masterClientChanged", () => this._observeAuthority());
        this._refreshRoster();
    }

    _refreshRoster() {
        const localNumber = this.client.localPlayer.number;
        window.__bloxMpRemotePlayers = (this.client.room?.players || [])
            .filter(player => player.number !== localNumber)
            .map(player => {
                let profile = {};
                try { profile = JSON.parse(String(player.customProperties?.avatar || "{}")); } catch {}
                return {
                    Name: player.name || `Player ${player.number}`,
                    UserId: player.number,
                    Team: profile.team ? { Name: profile.team } : null,
                    TeamColor: { Color: profile.teamColor || { R: 0.6, G: 0.6, B: 0.6 }, Name: profile.teamName || "Medium stone grey" },
                    Neutral: profile.neutral !== false,
                    ...(profile.stats && typeof profile.stats === "object" ? profile.stats : {})
                };
            });
        window.__bloxMpRosterChanged?.();
    }

    async _sendWearables(targetPlayers) {
        if (!this.client.isInRoom) return;
        const profile = window.__bloxMpGetWearables?.();
        if (!profile || (!profile.shirtDataUrl && !profile.pantsDataUrl)) return;
        const json = JSON.stringify(profile);
        if (json.length > 4_800_000) {
            console.warn("[Blox Multiplayer] Avatar clothing exceeds the 4.8 MB sync limit.");
            return;
        }
        const bytes = new TextEncoder().encode(json);
        const total = Math.ceil(bytes.length / PROFILE_CHUNK_BYTES);
        const transferId = crypto.getRandomValues(new Uint32Array(1))[0];
        for (let seq = 0; seq < total; seq++) {
            const slice = bytes.subarray(seq * PROFILE_CHUNK_BYTES, Math.min((seq + 1) * PROFILE_CHUNK_BYTES, bytes.length));
            const packet = new Uint8Array(10 + slice.length);
            const view = new DataView(packet.buffer);
            view.setUint32(0, transferId);
            view.setUint16(4, seq);
            view.setUint16(6, total);
            view.setUint16(8, slice.length);
            packet.set(slice, 10);
            while (!this.session.send("PROFILE", packet, { reliable: true, targetPlayers })) {
                if (this.session.closed || !this.client.isInRoom) return;
                await new Promise(resolve => setTimeout(resolve, 85));
            }
        }
    }

    _receiveWearables(event) {
        const data = event.data;
        if (!(data instanceof Uint8Array) || data.length < 10 || data.length > 32010) return;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const id = view.getUint32(0), seq = view.getUint16(4), total = view.getUint16(6), size = view.getUint16(8);
        if (!total || total > 160 || seq >= total || size !== data.length - 10) return;
        let transfer = this.profileTransfers.get(id);
        if (!transfer || transfer.sender !== event.senderNumber) {
            transfer = { sender: event.senderNumber, total, chunks: new Array(total), received: 0, bytes: 0, timer: setTimeout(() => this.profileTransfers.delete(id), 30000) };
            this.profileTransfers.set(id, transfer);
        }
        if (transfer.total !== total || transfer.chunks[seq]) return;
        const chunk = data.slice(10);
        transfer.chunks[seq] = chunk;
        transfer.received++;
        transfer.bytes += chunk.length;
        if (transfer.bytes > 4_800_000) { clearTimeout(transfer.timer); this.profileTransfers.delete(id); return; }
        if (transfer.received !== total) return;
        clearTimeout(transfer.timer);
        this.profileTransfers.delete(id);
        const bytes = new Uint8Array(transfer.bytes);
        let offset = 0;
        for (const part of transfer.chunks) { bytes.set(part, offset); offset += part.length; }
        try {
            const profile = JSON.parse(new TextDecoder().decode(bytes));
            window.__bloxMpUpdateRemoteProfile?.(event.senderNumber, profile);
        } catch (error) { console.warn("[Blox Multiplayer] Received avatar clothing was invalid:", error); }
    }

    _observeAuthority() {
        const room = this.client.room;
        if (!room) return;
        const synced = room.players
            .filter(player => player.customProperties?.synced === true)
            .map(player => player.number)
            .sort((a, b) => a - b);
        const configured = Number(room.customProperties?.authority) || 0;
        let next = synced[0] || configured;
        if (next && !room.players.some(player => player.number === next)) next = 0;
        if (!next && room.isMasterClient) {
            next = this.client.localPlayer.number;
            room.setProperties({ authority: next });
        }
        if (next !== this.authority) {
            this.handoverPending = this.authority !== 0;
            this.authority = next;
            this.session.authorityNumber = next;
            this.lastAuthorityChangeAt = performance.now();
            this.started = false;
            if (next === this.client.localPlayer.number) void this._becomeAuthority();
        }
        if (next && synced.includes(next) && !this.started && next !== this.client.localPlayer.number) {
            void this._requestSnapshot();
        }
    }

    async _becomeAuthority() {
        if (this.authority !== this.client.localPlayer.number || this.started) return;
        this.started = true;
        this.client.room?.setProperties({ authority: this.authority });
        // Host hook is where the emulator schedules server Script instances after a handover.
        try { await window.__bloxMpAuthorityStarted?.({ handover: this.handoverPending }); }
        catch (error) { console.error("[Blox Multiplayer] Authority startup hook failed:", error); }
        this.handoverPending = false;
        this.client.setPlayerProperties({ synced: true });
        this._observeAuthority();
        window.dispatchEvent(new CustomEvent("blox-mp-ready", { detail: { role: "authority", session: this.session } }));
        this._startStateLoop();
    }

    async _requestSnapshot() {
        if (!this.authority || this.started || this.client.localPlayer.number === this.authority) return;
        const requester = this.client.localPlayer.number;
        for (let attempt = 0; attempt < 3 && !this.started; attempt++) {
            try {
                await withTimeout(new Promise((resolve, reject) => {
                    const onApplied = () => { cleanup(); resolve(); };
                    const onEvent = event => {
                        if (event.type === "master" && event.newMasterNumber !== this.authority) {
                            cleanup();
                            reject(new Error("Authority changed"));
                        }
                    };
                    const timer = setTimeout(() => { cleanup(); reject(new Error("Snapshot timeout")); }, 120000);
                    const cleanup = () => {
                        clearTimeout(timer);
                        window.removeEventListener("blox-mp-snapshot-applied", onApplied);
                        this.session.listeners.delete(onEvent);
                    };
                    window.addEventListener("blox-mp-snapshot-applied", onApplied, { once: true });
                    this.session.listeners.add(onEvent);
                    this.session.send("SNAP_REQ", boundedObject({ requester, attempt }), { targetPlayers: [this.authority] });
                }), 125000, "Snapshot sync");
                return;
            } catch (error) {
                if (attempt === 2) this._showSyncError(error);
                else await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    async _receive(event) {
        if (event.type === "master") { this._observeAuthority(); return; }
        if (event.type === "disconnect") { this._showDisconnect(event.cause); return; }
        if (event.type === "join") { window.__bloxMpPlayerJoined?.(event.player); return; }
        if (event.type === "leave") { window.__bloxMpPlayerLeft?.(event.playerNumber); return; }
        if (event.type === "properties") {
            const player = this.client.room?.getPlayer(event.playerNumber);
            if (player) window.__bloxMpPlayerUpdated?.(player);
            return;
        }
        if (event.type === "chat") {
            const message = decodeObject(event.data);
            if (message && typeof message.text === "string") {
                const player = this.client.room?.getPlayer(event.senderNumber);
                window.__bloxMpAppendChat?.(player?.name || `Player ${event.senderNumber}`, message.text, event.senderNumber);
            }
            return;
        }
        if (event.type === "profile") { this._receiveWearables(event); return; }
        if (event.type === "snap_req") {
            const request = decodeObject(event.data);
            if (!request || event.senderNumber !== request.requester || !this.started) return;
            if (request.applied === true) return;
            await this._sendSnapshot(event.senderNumber);
            return;
        }
        if (event.type === "snap_chunk") { await this._receiveSnapshotChunk(event); return; }
        if (["state", "world_ops", "world_pose", "rpc", "health"].includes(event.type)) {
            if (["world_ops", "world_pose", "health"].includes(event.type) && event.senderNumber !== this.authority && performance.now() - this.lastAuthorityChangeAt > 500) return;
            const payload = decodeObject(event.data);
            if (!payload) return;
            if (event.type === "world_ops") {
                if (!this.started && this.client.localPlayer.number !== this.authority) {
                    if (this.pendingIncomingWorldOps.length < 1000) this.pendingIncomingWorldOps.push(payload);
                    return;
                }
                window.__bloxMpApplyWorldOps?.(payload);
                return;
            }
            if (event.type === "world_pose") {
                if (!this.started && this.client.localPlayer.number !== this.authority) {
                    if (this.pendingIncomingWorldPoses.length < 1000) this.pendingIncomingWorldPoses.push(payload);
                    return;
                }
                window.__bloxMpApplyWorldPoses?.(payload);
                return;
            }
            if (event.type === "rpc") {
                window.__bloxMpHandleRpc?.(payload, event.senderNumber);
                return;
            }
            if (event.type === "state") window.__bloxMpUpdateRemoteProfile?.(event.senderNumber, payload);
            window.__bloxMpReceive?.(event.type, payload, event.senderNumber);
        }
        if (event.type === "client_ops") {
            if (!this.started || event.senderNumber === this.client.localPlayer.number) return;
            const payload = decodeObject(event.data);
            if (payload) window.__bloxMpApplyClientOps?.(payload, event.senderNumber);
        }
    }

    async _sendSnapshot(targetNumber) {
        if (!this.started) return;
        // Until the Instance graph adapter is available, synchronize presence and
        // let the caller continue in the same locally loaded base map.
        const snapshot = typeof window.__bloxMpBuildSnapshot === "function"
            ? await window.__bloxMpBuildSnapshot()
            : { presenceOnly: true };
        const source = new TextEncoder().encode(JSON.stringify(snapshot));
        if (source.byteLength > 8 * 1024 * 1024) throw new Error("Workspace snapshot exceeds the 8 MB safety limit");
        if (typeof CompressionStream !== "function") throw new Error("This browser does not support snapshot compression");
        const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("gzip"));
        const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
        if (compressed.byteLength > 16 * 1024 * 1024) throw new Error("Compressed Workspace snapshot exceeds the 16 MB transfer limit");
        const transferId = crypto.getRandomValues(new Uint32Array(1))[0];
        const total = Math.ceil(compressed.length / SNAPSHOT_CHUNK_BYTES);
        for (let seq = 0; seq < total; seq++) {
            const slice = compressed.subarray(seq * SNAPSHOT_CHUNK_BYTES, Math.min((seq + 1) * SNAPSHOT_CHUNK_BYTES, compressed.length));
            const packet = new Uint8Array(10 + slice.length);
            const view = new DataView(packet.buffer);
            view.setUint32(0, transferId);
            view.setUint16(4, seq);
            view.setUint16(6, total);
            view.setUint16(8, slice.length);
            packet.set(slice, 10);
            const sendDeadline = Date.now() + 120000;
            while (!this.session.send("SNAP_CHUNK", packet, { targetPlayers: [targetNumber] })) {
                if (Date.now() >= sendDeadline) throw new Error("Snapshot transfer exceeded its send timeout");
                await new Promise(resolve => setTimeout(resolve, 75));
            }
        }
    }

    async _receiveSnapshotChunk(event) {
        if (!(event.data instanceof Uint8Array) || event.data.length < 10 || event.data.length > 8010) return;
        const view = new DataView(event.data.buffer, event.data.byteOffset, event.data.byteLength);
        const transferId = view.getUint32(0), seq = view.getUint16(4), total = view.getUint16(6), size = view.getUint16(8);
        if (!total || total > 2000 || seq >= total || size !== event.data.length - 10) return;
        if (this.snapshotTransfer?.id !== transferId || this.snapshotTransfer.sender !== event.senderNumber) {
            this.snapshotTransfer = { id: transferId, sender: event.senderNumber, total, chunks: new Array(total), received: 0 };
        }
        const transfer = this.snapshotTransfer;
        if (transfer.total !== total || transfer.chunks[seq]) return;
        transfer.chunks[seq] = event.data.slice(10);
        transfer.received++;
        if (transfer.received !== total) return;
        const packed = new Uint8Array(transfer.chunks.reduce((sum, chunk) => sum + chunk.length, 0));
        let offset = 0;
        for (const chunk of transfer.chunks) { packed.set(chunk, offset); offset += chunk.length; }
        const decompressed = new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
        if (decompressed.length > 8 * 1024 * 1024) throw new Error("Snapshot exceeds 8 MB");
        let snapshot = null;
        try { snapshot = JSON.parse(new TextDecoder().decode(decompressed)); } catch {}
        if (!snapshot) throw new Error("The multiplayer snapshot was malformed");
        if (typeof window.__bloxMpApplySnapshot === "function") await window.__bloxMpApplySnapshot(snapshot);
        else if (snapshot.presenceOnly !== true) throw new Error("The emulator cannot apply this multiplayer snapshot");
        this.pendingIncomingWorldOps.sort((a, b) => (Number(a.tick) || 0) - (Number(b.tick) || 0));
        for (const ops of this.pendingIncomingWorldOps.splice(0)) window.__bloxMpApplyWorldOps?.(ops);
        for (const poses of this.pendingIncomingWorldPoses.splice(0)) window.__bloxMpApplyWorldPoses?.(poses);
        this.snapshotTransfer = null;
        this.started = true;
        this.client.setPlayerProperties({ synced: true });
        this.session.send("SNAP_REQ", boundedObject({ applied: true, requester: this.client.localPlayer.number }), { targetPlayers: [event.senderNumber] });
        window.dispatchEvent(new CustomEvent("blox-mp-snapshot-applied"));
        this._startStateLoop();
    }

    _startStateLoop() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            const now = performance.now();
            const state = window.__bloxMpGetLocalState?.();
            const json = state ? JSON.stringify(state) : "";
            const heartbeat = now - this.lastHeartbeatAt >= 1000;
            if (state && (heartbeat || json !== this.lastStateJson) && now - this.lastStateAt >= STATE_INTERVAL_MS) {
                this.lastStateAt = now;
                if (heartbeat) this.lastHeartbeatAt = now;
                this.lastStateJson = json;
                this.session.send("STATE", boundedObject({ ...state, hb: heartbeat ? 1 : 0, t: Math.round(now) }), { reliable: false });
            }
            if (this.started && this.authority === this.client.localPlayer.number && now - this.lastWorldScanAt >= WORLD_SCAN_INTERVAL_MS) {
                this.lastWorldScanAt = now;
                try {
                    const changes = window.__bloxMpCollectWorldOps?.() || {};
                    this.pendingWorldOps.push(...(changes.ops || []));
                    for (const pose of changes.poses || []) this.pendingWorldPoses.set(pose.id, pose);
                    for (const op of changes.ops || []) if (op.op === "delete") this.pendingWorldPoses.delete(op.id);
                }
                catch (error) { console.warn("[Blox Multiplayer] Workspace scan failed:", error); }
                if (this.pendingWorldPoses.size && now - this.lastWorldPoseAt >= WORLD_POSE_SEND_INTERVAL_MS) {
                    const poses = [...this.pendingWorldPoses.values()].slice(0, 70);
                    const payload = { tick: this.tick, poses };
                    if (JSON.stringify(payload).length < 40000 && this.session.send("WORLD_POSE", boundedObject(payload), { reliable: false })) {
                        this.lastWorldPoseAt = now;
                        for (const pose of poses) this.pendingWorldPoses.delete(pose.id);
                    }
                }
                if (this.pendingWorldOps.length) {
                    const ops = [];
                    while (this.pendingWorldOps.length && ops.length < 60) {
                        const candidate = [...ops, this.pendingWorldOps[0]];
                        if (JSON.stringify({ tick: this.tick + 1, ops: candidate }).length > 40000) break;
                        ops.push(this.pendingWorldOps.shift());
                    }
                    if (!ops.length) {
                        console.warn("[Blox Multiplayer] A Workspace operation exceeded the packet budget and was skipped.");
                        this.pendingWorldOps.shift();
                    } else if (!this.session.send("WORLD_OPS", boundedObject({ tick: ++this.tick, ops }), { reliable: true })) this.pendingWorldOps.unshift(...ops);
                }
            }
        }, STATE_INTERVAL_MS);
    }

    _showSyncError(error) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#000b;color:#fff;font:16px Arial";
        const card = document.createElement("div");
        card.style.cssText = "max-width:440px;padding:22px;background:#25282d;border:1px solid #59616a";
        const text = document.createElement("p");
        text.textContent = `Could not sync with the game server: ${error.message || "Timed out"}`;
        const back = document.createElement("button");
        back.textContent = "Back to games";
        back.onclick = () => { sessionStorage.removeItem("bloxGameId"); location.href = "index.html"; };
        const offline = document.createElement("button");
        offline.textContent = "Play offline";
        offline.onclick = () => { sessionStorage.removeItem("bloxGameId"); sessionStorage.removeItem("bloxJoinRoom"); location.reload(); };
        card.append(text, back, offline);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    _showDisconnect(cause) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#000b;color:#fff;font:16px Arial";
        const card = document.createElement("div");
        card.style.cssText = "max-width:440px;padding:22px;background:#25282d;border:1px solid #59616a";
        const text = document.createElement("p");
        text.textContent = `Lost connection to the game server. Error code: 277 (${cause || "disconnected"})`;
        const reconnect = document.createElement("button");
        reconnect.textContent = "Reconnect";
        reconnect.onclick = () => { sessionStorage.removeItem("bloxJoinRoom"); location.reload(); };
        const back = document.createElement("button");
        back.textContent = "Back to games";
        back.onclick = () => { sessionStorage.removeItem("bloxGameId"); location.href = "index.html"; };
        card.append(text, reconnect, back);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    dispose() {
        clearInterval(this.timer);
        this.unsubscribe?.();
        delete window.__bloxMpSendChat;
        delete window.__bloxMpLeave;
        for (const transfer of this.profileTransfers.values()) clearTimeout(transfer.timer);
        this.profileTransfers.clear();
        void this.session.leave();
    }
}

export async function connectEmulatorMultiplayer() {
    const gameId = sessionStorage.getItem("bloxGameId") || "";
    if (!gameId) return null;
    const username = sessionStorage.getItem("bloxPlayerName") || localStorage.getItem("bloxPlayerName") || "Player";
    const region = sessionStorage.getItem("bloxRegion") || "";
    const roomName = sessionStorage.getItem("bloxJoinRoom") || "";
    const createRoom = sessionStorage.getItem("bloxCreateRoom") === "1";
    while (sessionStorage.getItem("bloxGameId")) {
        try {
            const session = createRoom
                ? await createGameSession(gameId, { username, region: region || "auto" })
                : roomName
                    ? await joinGameRoom(gameId, roomName, { username, region })
                    : await matchmakeGame(gameId, { username, region: region || "auto" });
            sessionStorage.removeItem("bloxJoinRoom");
            sessionStorage.removeItem("bloxCreateRoom");
            sessionStorage.removeItem("bloxMpIntent");
            const runtime = new MultiplayerRuntime(session);
            try {
                const profile = window.__bloxMpGetPlayerProfile?.() || {};
                const saved = JSON.parse(sessionStorage.getItem("bloxAvatarDescription") || "{}");
                session.client.setPlayerProperties({ avatar: JSON.stringify({ ...profile, colors: profile.colors || saved.colors || {} }) });
            } catch {}
            window.addEventListener("pagehide", () => runtime.dispose(), { once: true });
            window.BloxMultiplayer = runtime;
            for (const player of session.client.room?.players || []) {
                if (player.number !== session.client.localPlayer.number) window.__bloxMpPlayerJoined?.(player);
            }
            runtime._refreshRoster();
            return runtime;
        } catch (error) {
            const choice = await showJoinError(error);
            if (choice === "offline") {
                sessionStorage.removeItem("bloxGameId");
                sessionStorage.removeItem("bloxJoinRoom");
                sessionStorage.removeItem("bloxRegion");
                return null;
            }
            if (choice === "back") {
                location.href = "index.html";
                return null;
            }
        }
    }
    return null;
}

function showJoinError(error) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#000b;color:#fff;font:16px Arial";
        const card = document.createElement("div");
        card.style.cssText = "max-width:460px;padding:22px;background:#25282d;border:1px solid #59616a";
        const text = document.createElement("p");
        text.textContent = error?.code === "maxCcuReached"
            ? "All servers are busy right now. Try again soon."
            : `Could not connect to the multiplayer server: ${error?.message || "Photon is unavailable"}`;
        const controls = document.createElement("div");
        controls.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
        const addButton = (label, choice) => {
            const button = document.createElement("button");
            button.textContent = label;
            button.onclick = () => { overlay.remove(); resolve(choice); };
            controls.appendChild(button);
        };
        addButton("Retry", "retry");
        addButton("Play offline", "offline");
        addButton("Back to games", "back");
        card.append(text, controls);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    });
}
