# RBXL / RBXLX compatibility

The normal emulator parses Roblox binary places, XML places, and XML content stored with an `.rbxl` extension entirely in the browser. Imported objects use the same Instance, renderer, physics, and scripting APIs as standalone Lua/Luau maps.

## Loading pipeline

1. Parse the file and build an Instance/reference graph.
2. Generate bounded Luau chunks for supported properties.
3. Create objects incrementally while the loading UI remains active.
4. Resolve parents, object references, joints, and legacy surface joints.
5. Finalize rigid assemblies and release originally dynamic parts in batches.
6. Spawn the local R6 character, register ModuleScripts, then start eligible Scripts and LocalScripts independently.

Physics, void cleanup, and touch queries are paused before the release barrier. This prevents a partially loaded place from falling, firing contacts, or repeatedly rebuilding its collision index.

## Preserved content

- Parts, wedge/corner/truss parts, seats, spawn locations, models, folders, tools, hopper bins, humanoids, joints, BodyMovers, values, sounds, classic GUI objects, decals, effects, terrain placeholders, and unknown Instances with their hierarchy identity.
- Common gameplay properties, exact object references, `Source`, `LinkedSource`, and value-object `Value` data.
- Canonical place services including Workspace, Lighting, Players, RunService, Starter containers, ReplicatedStorage, ReplicatedFirst, ServerStorage, ServerScriptService, SoundService, Teams, Debris, InsertService, CollectionService, UserInputService, ContextActionService, and Chat.
- Embedded `Script`, `LocalScript`, and `ModuleScript` source.

Unsupported serialized/editor metadata is deliberately skipped to keep generated source and VM memory bounded. Unknown Instances still remain in the tree, but an unknown property is not guaranteed to be script-visible.

## Script lifecycle

The runtime uses managed Luau coroutines rather than invoking every place script as one blocking JavaScript/WASM call.

- Waits, signal waits, delays, event handlers, and spawned tasks yield without blocking peers.
- An error or normal return terminates only that script/task.
- Disabling, destroying, reparenting out of a valid runtime context, or replacing a Script's Source cancels its owned tasks; a valid changed Script can start again.
- ModuleScript `require()` is cached, supports yielding modules and concurrent callers, rejects cycles, and releases waiters if the loading owner is canceled.
- Runtime StarterPack/StarterGui clones receive their own script/module identities.

`LinkedSource` URLs with no embedded `Source` cannot run offline; they are reported in `window.__bloxUnresolvedLinkedScripts`.

## Intentional exclusions and limits

- Single player only: no RemoteEvent/RemoteFunction networking, replication server, matchmaking, or Roblox server connection.
- Roblox CoreScripts and imported `CoreGui`/`Chat` Bubble Chat code do not run. Blox uses its own classic local UI.
- External Roblox asset IDs may be unavailable offline; bundled classic sounds/textures have local resolution paths.
- Modern engine systems, complex terrain/CSG fidelity, modern constraints, and every contemporary service are outside the 2007–2009 target.
- Luau and classic Lua 5.1-style code are accepted, but Lua 5.2–5.4-only syntax/standard-library behavior is not emulated.
- A non-yielding infinite loop cannot be preempted by the current single interrupt-less WASM VM.

## Diagnostics

Useful browser-console hooks:

```javascript
await getBloxLuaSchedulerStats()
getBloxLuauStats()
getBloxPhysicsDiagnostics()
getBloxRenderStats()
window.__bloxEmbeddedScriptStartupStats
window.__bloxUnresolvedLinkedScripts
```
