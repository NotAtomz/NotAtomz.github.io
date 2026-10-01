# Blox Emulation

Blox Emulation is a single-player, browser-based recreation of the 2007–2009 Roblox client style. It loads `.lua`, `.luau`, `.rbxl`, and `.rbxlx` files into a local classic world with an R6 character, retro rendering, physics, tools, humanoids, joints, GUI objects, sounds, and place scripts.

It is an emulator, not a Roblox client. It does not connect to Roblox multiplayer servers.

## 2011-2015 compatibility layer

The classic 2007-2010 behavior remains the default. Later places additionally
receive reflected Attributes, modern ray/overlap parameters, TweenService,
PathfindingService, expanded RunService/UserInputService/Debris APIs, Animator
and AnimationTrack state, MeshPart/UnionOperation preservation, Terrain fill
methods, Attachments, WeldConstraint, common constraint classes, and GUI layout
objects/input events.

This layer is intentionally additive and single-player. WeldConstraint uses the
native rigid-assembly solver; common force/velocity/align constraints have local
physics behavior. Mesh/CSG data and the remaining constraint classes retain
their class identity and script-facing properties but may use a box visual or a
simplified physical approximation. Pathfinding produces local compatibility
waypoints rather than Roblox's original navigation mesh.

## Run locally

The emulator uses JavaScript modules, so serve this directory over HTTP instead of opening the HTML through `file://`:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/index.html`, choose a file, and press **Play**.

## Supported inputs

- `.lua` / `.luau` — compiled by the pinned browser Luau VM. Classic Lua 5.1-style Roblox scripts and Luau syntax are supported; Lua 5.2–5.4-only language features are not.
- `.rbxl` — binary or legacy XML-in-`.rbxl` place files.
- `.rbxlx` — XML place files, including old files containing XML-invalid control references that can be safely sanitized.

Large places stream through a loading barrier. Parts are created fixed, physics and touch queries stay paused during import, geometry/properties are bounded, and dynamic parts are released in batches after joints and references are ready.

## Script behavior

Each `Script`, `LocalScript`, standalone source file, event callback, and spawned task runs as its own managed coroutine. A script that calls `wait()`, `task.wait()`, `Signal:Wait()`, errors, finishes, or is disabled does not pause unrelated scripts. `task.spawn`, `spawn`, `delay`, `task.delay`, `task.defer`, and `task.cancel` are supported. `ModuleScript` objects use cached, yield-safe `require()` behavior, including concurrent callers and cycle detection.

Script startup follows local single-player containers:

- Server `Script` objects run from `Workspace`, `ServerScriptService`, the character, and runtime backpack tools.
- `LocalScript` objects run from the local character, `Backpack`, `PlayerGui`, `PlayerScripts`, and `ReplicatedFirst`.
- Template scripts under `StarterPack`, `StarterGui`, and `StarterPlayer` run only in their runtime clones.
- Data-only scripts under storage containers do not auto-run.
- Imported Roblox CoreScripts, `CoreGui`, and `Chat`/Bubble Chat scripts are intentionally excluded; the emulator supplies its own classic local UI.

One architectural limit remains: a script containing a non-yielding infinite loop can still freeze the one WASM VM. Cooperative scripts are isolated, but true instruction-level preemption requires a different interruptible VM build.

## Execute source while playing

Open the browser console and schedule another independent Script:

```javascript
await executeLuau(`
    print("hello from live Luau")
    task.wait(1)
    print("still running independently")
`)
```

`executeLuau()` returns the created Script object after its initial scheduler turn; yielded work continues during later frames.

## Performance work

The engine includes a static AABB tree and sweep broadphase, sleeping-body filtering, lazy compound mass calculation, indexed Instance parent/name lookups, bounded classic part tessellation, far-surface LOD, render-state caching, and Luau bridge reference caching. These target the common failure cases in multi-thousand-part classic places rather than changing their gameplay behavior.

See [RBXL_RBXLX_SUPPORT.md](RBXL_RBXLX_SUPPORT.md) for the place/script compatibility details.

## Workspace exporter

`Blox Emulation Workspace Exporter.rbxmx` can export a Studio Workspace as Luau when a direct place file is not suitable. Install it in Studio, export the Workspace, save the generated source as `.lua` or `.luau`, and load that file from the launcher.
