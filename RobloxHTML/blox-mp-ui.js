import {
    MAX_PLAYERS, connectGameLobby, generateRoomName, getPhotonRegions,
    getSavedPhotonRegion, joinListedRoom, listGameServers, serverId,
    setSavedPhotonRegion
} from "./blox-mp-net.js?v=20261106-mp3";

const REGION_LABELS = { us: "United States", eu: "Europe", asia: "Asia", jp: "Japan", au: "Australia", sa: "South America", kr: "South Korea", ca: "Canada", usw: "US West", ussc: "US South Central", cn: "China" };

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function panelMessage(panel, message, isError = false) {
    const status = panel.querySelector("[data-mp-status]");
    status.textContent = message;
    status.classList.toggle("mp-error", isError);
}

function persistJoin(game, room, region) {
    sessionStorage.setItem("bloxGameId", game.gameId);
    sessionStorage.setItem("bloxJoinRoom", room || "");
    sessionStorage.setItem("bloxRegion", region || "");
    sessionStorage.setItem("bloxMpIntent", "1");
    sessionStorage.setItem("bloxPendingJoinGameId", game.gameId);
}

export async function launchMultiplayer(game, { room = "", region = "" } = {}) {
    if (!game?.gameId || !game.remote) throw new Error("Multiplayer is available for catalog games only.");
    persistJoin(game, room, region);
    document.getElementById("playButton").click();
}

export function mountServerBrowser(game) {
    const host = document.getElementById("mpServers");
    if (!host || !game?.gameId) return;
    host.replaceChildren();
    const panel = el("div", "mp-server-browser");
    const controls = el("div", "mp-server-controls");
    const regionLabel = el("label", "mp-region-label", "Region");
    const region = el("select", "mp-region-select");
    region.setAttribute("aria-label", "Photon region");
    const autoOption = el("option", "", "Auto");
    autoOption.value = "auto";
    region.appendChild(autoOption);
    region.value = getSavedPhotonRegion() || "auto";
    const refresh = el("button", "small-blue", "Refresh");
    const create = el("button", "small-blue", "Create new server");
    const status = el("p", "mp-server-status", "Choose a region to browse servers.");
    status.dataset.mpStatus = "";
    const list = el("div", "mp-server-list");
    const queueButton = el("button", "grey-button mp-queue-button", "Wait for a free slot");
    queueButton.hidden = true;
    const anotherButton = el("button", "small-blue mp-another-button", "Join another server");
    anotherButton.hidden = true;
    const cancelQueue = el("button", "grey-button mp-cancel-queue", "Cancel");
    cancelQueue.hidden = true;
    const offline = el("button", "grey-button mp-offline-button", "Play offline / single-player");
    offline.hidden = true;
    regionLabel.appendChild(region);
    controls.append(regionLabel, refresh, create);
    panel.append(controls, status, list, anotherButton, queueButton, cancelQueue, offline);
    host.appendChild(panel);
    const playButton = document.getElementById("playButton");
    const playHandler = () => {
        if (sessionStorage.getItem("bloxPendingJoinGameId") !== game.gameId) {
            persistJoin(game, "", region.value === "auto" ? "" : region.value);
        }
    };
    playButton.__bloxMpPlayHandler = playHandler;
    playButton.addEventListener("click", playHandler);

    let photon = null;
    let regionRows = [];
    let refreshing = false;
    let queueActive = false;
    let queueTimer = 0;

    const close = async () => {
        queueActive = false;
        clearTimeout(queueTimer);
        const old = photon;
        photon = null;
        if (old) {
            try { if (old.isInLobby) await old.leaveLobby(); } catch {}
            old.dispose();
        }
    };

    const connectAndRefresh = async () => {
        if (refreshing) return;
        refreshing = true;
        refresh.disabled = create.disabled = true;
        list.replaceChildren();
        panelMessage(panel, "Connecting to Photon...");
        try {
            const chosen = region.value === "auto" ? "" : region.value;
            setSavedPhotonRegion(chosen);
            if (!photon?.isInLobby) {
                await close();
                photon = await connectGameLobby(game.gameId, {
                    region: chosen || "auto",
                    username: sessionStorage.getItem("bloxPlayerName") || localStorage.getItem("bloxPlayerName") || "Player"
                });
            }
            const rooms = await listGameServers(photon, game.gameId);
            offline.hidden = true;
            list.replaceChildren();
            regionRows = rooms;
            if (!rooms.length) list.appendChild(el("p", "mp-empty", "No servers are available in this region yet."));
            for (const room of rooms) {
                const row = el("div", "mp-server-row");
                const details = el("span", "mp-server-details", `Server ${serverId(room.name)} · ${room.playerCount}/${MAX_PLAYERS} · ${photon.bestRegion || chosen || "Auto"}`);
                const join = el("button", "small-blue", "Join");
                join.disabled = room.playerCount >= Math.min(room.maxPlayers || MAX_PLAYERS, MAX_PLAYERS);
                join.addEventListener("click", async () => {
                    join.disabled = true;
                    try {
                        await joinListedRoom(photon, room, game.gameId);
                        const roomName = photon.room.name;
                        const actualRegion = photon.bestRegion || chosen;
                        await close();
                        persistJoin(game, roomName, actualRegion);
                        document.getElementById("playButton").click();
                    } catch (error) {
                        if (error?.code === "roomFull") {
                            panelMessage(panel, "Game is full. Error code: 772", true);
                            queueButton.hidden = false;
                            anotherButton.hidden = false;
                        } else panelMessage(panel, error.message || "Could not join this server.", true);
                        join.disabled = false;
                    }
                });
                row.append(details, join);
                list.appendChild(row);
            }
            panelMessage(panel, `${rooms.length} server${rooms.length === 1 ? "" : "s"} in ${photon.bestRegion || chosen || "the default region"}.`);
            if (regionRows.length) queueButton.hidden = false;
        } catch (error) {
            await close();
            panelMessage(panel, error?.code === "maxCcuReached"
                ? "All servers are busy right now. Try again soon."
                : `${error.message || "Photon is unavailable."} You can still play offline.`, true);
            offline.hidden = false;
        } finally {
            refreshing = false;
            refresh.disabled = create.disabled = false;
        }
    };

    refresh.addEventListener("click", () => { void connectAndRefresh(); });
    region.addEventListener("change", () => { void close().then(connectAndRefresh); });
    create.addEventListener("click", async () => {
        create.disabled = true;
        try {
            const name = generateRoomName(game.gameId);
            const actualRegion = region.value === "auto" ? "" : region.value;
            await close();
            persistJoin(game, name, actualRegion);
            sessionStorage.setItem("bloxCreateRoom", "1");
            document.getElementById("playButton").click();
        } catch (error) {
            panelMessage(panel, error.message || "Could not create a server.", true);
        } finally { create.disabled = false; }
    });

    queueButton.addEventListener("click", async () => {
        queueActive = true;
        queueButton.hidden = true;
        cancelQueue.hidden = false;
        panelMessage(panel, "Waiting for a free slot...");
        await close();
        const poll = async () => {
            if (!queueActive) return;
            try {
                await connectAndRefresh();
                const room = regionRows
                    .filter(candidate => candidate.isOpen && candidate.playerCount < Math.min(candidate.maxPlayers || MAX_PLAYERS, MAX_PLAYERS))
                    .sort((a, b) => b.playerCount - a.playerCount)[0];
                if (room && photon) {
                    await joinListedRoom(photon, room, game.gameId);
                    const name = photon.room.name;
                    const actualRegion = photon.bestRegion || (region.value === "auto" ? "" : region.value);
                    await close();
                    persistJoin(game, name, actualRegion);
                    document.getElementById("playButton").click();
                    return;
                }
            } catch { /* Retry on the next lobby poll. */ }
            queueTimer = setTimeout(poll, 2500);
        };
        void poll();
    });
    cancelQueue.addEventListener("click", () => {
        queueActive = false;
        clearTimeout(queueTimer);
        queueButton.hidden = false;
        cancelQueue.hidden = true;
        panelMessage(panel, "Queue canceled.");
    });
    anotherButton.addEventListener("click", () => {
        sessionStorage.setItem("bloxRegion", region.value === "auto" ? "" : region.value);
        sessionStorage.setItem("bloxPendingJoinGameId", game.gameId);
        sessionStorage.removeItem("bloxJoinRoom");
        document.getElementById("playButton").click();
    });
    offline.addEventListener("click", () => {
        sessionStorage.setItem("bloxForceOffline", "1");
        sessionStorage.removeItem("bloxPendingJoinGameId");
        sessionStorage.removeItem("bloxJoinRoom");
        sessionStorage.removeItem("bloxRegion");
        document.getElementById("playButton").click();
    });

    void getPhotonRegions().then(regions => {
        const saved = getSavedPhotonRegion();
        for (const entry of regions) {
            const option = el("option", "", `${REGION_LABELS[entry.code] || entry.code} (${entry.code})`);
            option.value = entry.code;
            region.appendChild(option);
        }
        if (saved && regions.some(entry => entry.code === saved)) region.value = saved;
    }).catch(error => console.warn("[Blox Multiplayer] Region lookup unavailable:", error)).finally(() => {
        void connectAndRefresh();
    });

    const liveRefresh = setInterval(() => {
        if (host.isConnected && photon?.isInLobby) void connectAndRefresh();
        else if (!host.isConnected) clearInterval(liveRefresh);
    }, 5000);
    window.addEventListener("pagehide", () => { clearInterval(liveRefresh); void close(); }, { once: true });
}
