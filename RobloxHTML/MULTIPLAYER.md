# Blox Emulation multiplayer

## Current implementation scope

Multiplayer is opt-in for downloaded catalog games with a valid `gameid`. Local uploads and manifest entries without a valid ID remain single-player. Photon Realtime Core 6.0.1 is vendored under `vendor/photon`; it uses WebSocket transport and its included WASM module. The app ID comes from `meta[name="blox-photon-app-id"]` and defaults to the public client ID in `blox-mp-net.js`. `PHOTON_APP_VERSION` is `blox-mp-7`; change it when the wire format changes.

Remote players use engine `Model`/`Humanoid`/R6 part instances on each client, feed the engine's existing name/health overlay, receive the four local R6 limb-hinge angles, and use the existing bubble-chat renderer. Uploaded classic shirt/pants images, ForceField presence, and character-attached sound playback are relayed through bounded player state/RPC messages. The elected client authority sends compressed instance snapshots to late joiners, then reliable batched additions/removals/property deltas for supported Workspace, Teams, and ReplicatedStorage `Model`, `Folder`, `BasePart`, `Sound`, classic light, `Team`, `ForceField`, and common `ValueBase` instances. Lighting properties are included in snapshots and deltas. Part transforms use unreliable pose packets with client-side interpolation. RemoteEvent `FireServer`, `FireClient`, and `FireAllClients` use the Photon RPC channel; payloads are data-only and bounded. `RemoteFunction` synchronous invokes are still local-only. The game asset itself is loaded locally from the same source on every client; Photon Realtime Cloud does not host or execute the map. This is not a trusted dedicated game server or server-created Roblox `Player` instances. Server `Script` execution is gated to the elected authority, while `LocalScript`s remain local; scripts/source are not copied over the network. Multiplayer is an early networking layer, not Roblox-equivalent multiplayer.

## Photon setup

Create/use a Photon **Realtime** app in the Photon Dashboard and place its App ID in the `blox-photon-app-id` meta value in `index.html` if it differs from the default. The launcher carries that override to `emulator.html`; if opening the emulator directly, set the meta value there too. No custom Photon server, Worker, or admin page is used. The JavaScript SDK is the official `@photonengine/realtime-core` 6.0.1 package. The web binding supports WebSocket only. Its default region selection is Photon’s first listed region, not a measured best-ping region; selected region codes are persisted in local storage. Players must choose the same region to see the same rooms.

## Room and protocol

Room name: `g<gameid>-<8 random hex>`. The final eight hex characters are displayed as the Server ID. Rooms use `maxPlayers: 10`, `playerTtlMs: 0`, `emptyRoomTtlMs: 0`, visible/open room flags, and SQL lobby properties `C0` (game id) and `C1` (protocol build). `gid` and `build` are also retained as ordinary room metadata. Each game uses a named SQL lobby `game-<gameid>` and filters by `C0` and `C1`. The launcher ignores manifest `maxPlayers` values.

Protocol version is the Photon app version `blox-mp-7`. Custom event codes are centralized in `blox-mp-net.js`:

| Code | Name | Intended payload |
| ---: | --- | --- |
| 1 | `STATE` | Quantized owner character state; unreliable, up to 10 Hz |
| 2 | `WORLD_OPS` | Authority Workspace structural/property deltas, reliable batches |
| 3 | `CLIENT_OPS` | Non-filtered client operations for authority application |
| 4 | `SNAP_REQ` | Snapshot request / transfer acknowledgement |
| 5 | `SNAP_CHUNK` | Gzip snapshot fragments, 8 KB payload chunks |
| 6 | `RPC` | RemoteEvent/RemoteFunction routing |
| 7 | `CHAT` | Unfiltered chat, 240 characters, one send per second |
| 8 | `HEALTH` | Owner-authoritative health/death updates |
| 9 | `PROFILE` | Reliable 32 KB chunks for uploaded avatar shirt/pants images (4.8 MB total cap) |
| 10 | `WORLD_POSE` | Unreliable batched BasePart transforms, interpolated on clients |

Photon Realtime Core supports `Uint8Array` payloads and target-player delivery. Photon currently lists the free Public Cloud plan as 20 CCU for development/non-commercial use, with 3 GB of traffic per peak CCU per month (60 GB at 20 peak CCU); reaching the 20 CCU cap rejects additional connections (`maxCcuReached`). Photon recommends sub-1 KB messages for high-frequency traffic and staying below 500 messages/second per room as a fair-use guideline. The implementation rejects client events over 45 KB and targets 8 KB compressed snapshot chunks. This is not a guarantee that large snapshots will fit the monthly bandwidth allocation.

## Test manually

Serve this folder over HTTP (`python -m http.server 8000`) and open the launcher in two separate browser windows. Set `gameid` on a catalog entry in `games.json`, then open that same game in both windows and choose the same region. Verify both clients see the same room and that an 11th client is directed to another room. Try the server list, direct join, cancelable wait queue, region change, reconnect, and offline fallback. A background tab can throttle the elected authority’s JavaScript timers; use side-by-side visible windows for testing.

This expanded replication has passed static syntax/diff checks but has not yet been verified in a live multi-client Photon session. Clients must load the same source map; IDs are derived from hierarchy/class/name/sibling order. Only listed serializable object types are covered (not arbitrary instances), and maps over the 8 MB uncompressed snapshot limit fail closed. Client-originated object mutations are not promoted to authority; server Scripts should create/change replicated state on the elected authority. Script source is not transmitted: all clients load the same map bundle, and only its elected authority runs server Scripts. RemoteFunctions and durable state after everyone leaves remain unsupported. A reported second-client failure was traced to invalid SQL filter column names (`gid`/`build`); those remain mapped to Photon SQL's reserved `C0`/`C1` columns.

## Trust and limits

Photon is a relay; the elected client is the authority, and clients can cheat by modifying their own code or packets. Authority handover starts from the currently replicated Workspace state, but server-script internal state restarts. State exists only while a client remains in the room; it is not persisted after the room empties. Chat is deliberately unfiltered. The supplied public Photon app ID must be associated with an active Realtime app in the Photon Dashboard; the dashboard is where its current CCU/traffic allowance is configured. Regions are separate matchmaking pools. Browser background-tab throttling can stall authority simulation.
