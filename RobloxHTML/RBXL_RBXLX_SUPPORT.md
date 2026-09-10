# RBXL / RBXLX Support

Blox Emulation now accepts `.lua`, `.luau`, `.rbxl`, and `.rbxlx` maps in both the normal multi-file site and `OfflineHTML/BloxEmulation.html`.

For RBXL/RBXLX maps the browser stores the selected place bytes in IndexedDB, parses Roblox XML/binary place data locally, then generates an incremental Luau construction stream. Supported instances are created sequentially with periodic yields.

During place loading:

- a classic translucent **Bricks / Connectors** loading panel is shown;
- the top bar, chat, health, player list, hotbar/inventory, and PlayerGui are hidden;
- the local R6 is hidden;
- the camera is set to a 1500-stud loading distance and follows the first created BasePart;
- the loader yields after every 24 created instances so large maps do not block one giant render frame.

After loading:

- the existing spawn-selection code moves the local player to a loaded SpawnLocation;
- the player becomes visible;
- the camera returns to the normal 20-stud default;
- classic Core UI becomes visible.

Lua/Luau map loading keeps the original path and behavior.

## Compatibility note

The importer targets the classic object/property set implemented by this emulator. Unsupported modern Roblox instance classes are represented as folders or simplified Parts when practical, while Script/LocalScript/ModuleScript instances inside RBXL files are not auto-executed. The normal `.lua`/`.luau` route remains the scripting route.


## Camera + slower loading update

- RBXL/RBXLX creation now yields after every **6 imported objects** instead of 24.
- Each yield requests about 8 ms so rendering/physics can process the newly
  created objects before the next group is imported.
- Connector/reference restoration also yields periodically.
- A short settle delay is added after the final imported object.
- After the chosen SpawnLocation is applied, the emulator now resets the
  internal classic camera target/current position, `CameraSubject`,
  `CameraType`, `CFrame`, `Focus`, zoom, and camera sync state together.
  This prevents the 1500-stud loading camera from remaining detached.


## v3 correctness fix: real loader completion barrier

The Blox pure-JavaScript Luau VM is cooperatively scheduled. A JavaScript call
into a Luau chunk returns as soon as Luau reaches `wait()`, while that same Lua
thread continues on later scheduler ticks.

The previous RBXL implementation incorrectly treated the first yielded return as
"map finished". That caused all three reported symptoms at once:

1. the loading screen disappeared while the generated loader was still running;
2. the player was moved/spawned before all imported objects existed;
3. later `loadingCamera()` calls switched CurrentCamera back to Scriptable after
   gameplay had already started, so the camera stopped following/rotating.

v3 fixes this by using an explicit `__BloxMapComplete` host callback emitted only
after the final imported object and final reference assignment have actually run.
The host waits for this completion signal, then gives renderer/physics 12 complete
frames plus a 500 ms settle period, then selects SpawnLocation, restores the
normal Custom player camera, reveals gameplay UI, and removes the loading screen.

Loading is also more conservative now: only 2 imported instances are created
between scheduler yields, and reference resolution yields every 4 references.


## v4: freeze imported dynamics + no player before load

- Imported BaseParts whose saved Anchored state is false are forced Anchored=true before parenting.
- They stay frozen through object creation, references/connectors, and final renderer/joint settling.
- The host then explicitly allows one synchronous unfreeze pass and waits for acknowledgement.
- Rapier gets 6 frames + 250ms after unfreeze while the player still does not exist.
- RBXL/RBXLX mode no longer constructs LocalPlayer.Character at startup.
- The player capsule is collision-disabled, gravity-disabled, and parked at Y=100000.
- Void respawn, respawn timers, movement, and spawn sound are suppressed during load.
- The first RBX Character is created only after import + frozen settle + unfreeze + physics settle.

## v5: property translation + embedded map scripts

RBXL/RBXLX properties are now normalized before the generated Luau loader is built.
This matters because Roblox place serialization changed names over time even when the
runtime API property stayed the same. Examples now translated automatically include:

- `size` -> `Size`
- `shape` -> `Shape`
- `formFactorRaw` -> `FormFactor`
- `Color3uint8` -> `Color`
- `AssemblyLinearVelocity` -> `Velocity`
- `AssemblyAngularVelocity` -> `RotVelocity`
- `TextureID` -> `TextureId`

BasePart CFrames are still translated into the emulator's `Position` + `Orientation`
fields, while exact fractional `Size` values are now preserved instead of being floored
to whole studs. Exact part colors are generated as `Color3.fromRGB(r,g,b)`. When a
modern exact color is present, the loader does not also apply the older BrickColor value,
which prevents the classic BrickColor synchronizer from recoloring the Part grey.

Additional old/new RBXL value forms are decoded for Ray, Vector2int16, Vector3int16,
NumberSequence, ColorSequence, Rect, PhysicalProperties, Color3uint8, and SharedString.
RBXLX handles both packed and component Color3/Color3uint8 forms, plus Optional,
Vector2int16/Vector3int16, NumberSequence, and ColorSequence values.

`Script`, `LocalScript`, and `ModuleScript` are now real emulator Instances with:

- `Source`
- `Disabled`
- `Enabled`
- `RunContext`
- `LinkedSource`

Imported Script source stays on the object instead of being concatenated into the map
loader. After the full RBX map load/unfreeze barrier completes, enabled `Script` objects
are started. The first local Character is then spawned, the normal player camera is
restored, and enabled `LocalScript` objects are started. Each chunk captures its own
`script` local, so a yielding script keeps the correct object.

`ModuleScript` instances and their Source are preserved, but `require(ModuleScript)` is
not implemented yet; ModuleScripts are therefore not auto-executed.

## v6: non-blocking map scripts + HumanoidRootPart

The loading lifecycle no longer waits for embedded Script/LocalScript execution.
Large classic places often contain scripts that wait indefinitely for touches,
players, timers, or other gameplay events. Those are live gameplay threads, not
part of map deserialization. RBXL/RBXLX now completes its object/reference/frozen
physics barriers, creates the first LocalPlayer Character, restores the camera,
and removes the loading screen first. Embedded Scripts and LocalScripts are then
started in the background one per browser frame. StarterPack/StarterGui template
scripts are skipped at the template location so their runtime clones are not
started twice.

The local R6 now contains an invisible HumanoidRootPart proxy backed by the
existing controlled Rapier player body. `Character.HumanoidRootPart`,
`Humanoid.RootPart`, and `Character.PrimaryPart` reference it. Scripts may set
Position, CFrame, Orientation/Rotation, Velocity, and AssemblyLinearVelocity;
CFrame/Orientation changes update the visible R6 rotation as well as the player
physics transform. The proxy continuously mirrors the controlled player's live
position/orientation/velocity back to Luau.


## v7: Snap/Weld rigid-assembly physics

Classic rigid joints now use a native Rapier fixed impulse joint for `Weld`,
`Snap`, `Glue`, `ManualWeld`, and `ManualGlue`. The fixed-joint local frames are
built directly from the Roblox `C0`/`C1` relationship and contacts between the
two connected rigid bodies are disabled. This prevents connected colliders from
solving against one another and launching a welded/snap assembly apart.

The native constraint is rebuilt automatically if Part0/Part1, C0/C1, or either
Rapier rigid body changes (including the RBXL frozen -> unanchored transition).
The pre-existing JS joint solver remains as a compatibility fallback if native
joint creation fails.

RBXL/RBXLX conversion now also:
- imports `ManualGlue` as a rigid classic joint;
- converts modern `WeldConstraint` to classic `Weld`;
- converts old `RotateP`/`RotateV` to `Rotate`;
- accepts lowercase `part0`, `part1`, `c0`, and `c1` serializer names;
- synthesizes a rest C0/C1 only when a rigid joint has neither frame serialized,
  preserving the map's existing relative Part placement instead of collapsing
  the connected Part origins together.

The freeze/unfreeze path no longer locks rotation on dynamic imported Parts.

## v8: Roblox-style rigid assemblies (exploding/flying map fix)

v7 still treated a classic welded structure too much like a pile of independent
Rapier rigid bodies. That is not how Roblox rigid assemblies behave and it can
make large old places explode when physics is released.

v8 changes the physics model in four layers:

1. **Implicit classic surface joints are rebuilt before unfreezing.** Old places
   often encode Studs/Inlet/Glue/Weld/Hinge/Motor surfaces instead of storing an
   explicit JointInstance for every connection. The RBXL loader now runs
   `Part:MakeJoints()` across the imported Parts while the map is still frozen.

2. **Rigid joint components are treated as assemblies.** Weld, Snap, Glue,
   ManualWeld and ManualGlue form a graph. If any Part in one connected component
   has authored `Anchored=true`, every Part in that component is physically fixed
   while each Part keeps its original Lua-facing `Anchored` property.

3. **All internal assembly contacts are filtered.** Rapier contact hooks reject
   collision impulses between any two Parts in the same rigid assembly, including
   indirectly connected A-B-C members. This fixes collisions between assembly
   members that are not connected by the exact same JointInstance.

4. **Physics release starts cleanly.** Serialized Velocity/RotVelocity are ignored
   during RBXL/RBXLX startup, and body recreation now preserves full rotation.
   Newly freed assembly members begin with zero velocity.

### Important Rapier pipeline fix

Rapier 0.20 only calls `PhysicsHooks.filterContactPair` through the event-enabled
step path. Passing hooks as `world.step(undefined, hooks)` silently bypasses the
hook callback. v8 owns an auto-draining `RAPIER.EventQueue` and steps with:

```js
world.step(bloxPhysicsEventQueue, bloxPhysicsHooks);
```

This was verified against the same Rapier 0.20 package used by the standalone
emulator: deliberately overlapping members of one rigid assembly remained at
exactly their authored transforms with zero launch velocity.

The normal browser emulator now also targets Rapier 0.20.0 so its physics API
matches the self-contained offline build.


## v8.1: Rapier 0.20 browser import fix

Rapier 0.20's npm package layout places the ESM browser bundle at:

`dist/rapier.mjs`

The old import-map URL pointed at the removed/nonexistent root file
`rapier.es.min.js`, which returned HTTP 404 and prevented the regular
multi-file emulator from starting. The offline single-file emulator was
already embedding Rapier internally and did not depend on that URL.


## v8.2: fixed `Loading map... 100%` stall

The old v8 loader reached 100% and then called `Part:MakeJoints()` for every
imported Part. On large classic places, that repeatedly synchronized Rapier and
repeatedly searched the growing joint list, which could make the browser appear
hung even though no exception was raised.

v8.2 moves implicit Studs/Inlet/Glue/Weld/Hinge/Motor reconstruction to one
optimized host-side pass. It propagates collider transforms once, caches existing
Part-pair joints in a Set, examines each nearby unordered pair once, and limits
work to about 5.5 ms per browser frame.

The loader now reports later phases explicitly:
`Resolving references...`, `Preserving joint poses...`,
`Joining surfaces... X% (N joints)`, `Finalizing map...`,
`Unfreezing map...`, and `Starting physics...`.


## v8.3: embedded Script startup / event storm optimization

- Script startup is batched with a small per-frame CPU budget (up to 3 scripts / ~4 ms).
- Touched/TouchEnded delivery is muted while scripts register listeners; current contacts are primed as the baseline.
- Touched/TouchEnded callbacks are coalesced while already queued/running.
- Host Lua callback queue is capped at 512 and drained in ~3.5 ms / 32-callback slices.
- Repeated identical failing Touched callbacks are disconnected after 2 failures; other host-signal callbacks after 5.
- Internal runtime/RunService listeners are disconnected after 3 identical errors.
- External interpreter errors are host-reported only once instead of being double-logged by scheduler + host.
- LocalScripts in Workspace are skipped; LocalScripts only start in client containers.
- Exact Script instances cannot be launched twice.
- Per-script success logging is replaced by one startup summary.
- Diagnostics: `window.__bloxEmbeddedScriptStartupStats`.


## v8.4: non-physical camera + mouse/raycast fix

The Camera itself was never supposed to participate in physics, but a regression
in the Rapier 0.20 ray code used `hit.toi`. Rapier 0.20 reports this value as
`hit.timeOfImpact`, so the undefined `.toi` value became `0`. As a result,
`Mouse.Hit` and several other ray users could resolve at the ray origin — the
camera position — which visually looked like the Camera was blocking the mouse.

v8.4:

- uses one `getRapierRayHitDistance()` helper everywhere;
- reads `timeOfImpact` first and keeps `toi` only as a legacy fallback;
- fixes mouse/world raycasts, step rays, and climb rays;
- explicitly marks CurrentCamera as non-physical;
- ray queries accept only queryable BaseParts (`CanQuery ~= false`);
- CurrentCamera has no Rapier body/collider and can never become a ray target;
- serialized RBXL/RBXLX `Camera` instances are skipped instead of being imported
  as generic hierarchy objects;
- `workspace.CurrentCamera` remains available to Luau scripts for CameraType,
  CameraSubject, CFrame, Focus, FieldOfView, etc.


## v8.5: classic Weld/C0-C1 stability + large-map optimization

### Weld / Snap physics

- Uses the classic JointInstance relation exactly:
  `Part1.CFrame * C1 == Part0.CFrame * C0`.
- C0/C1 from RBXL/RBXLX remain full matrix CFrames; they are not reduced to
  Euler angles.
- A rigid assembly receives one deterministic root. Anchored, non-Massless,
  RootPriority, classic root-type preference, face area, then stable instance
  order are used as tie breakers.
- Updating/creating a Weld aligns the non-root subtree to C0/C1 before Rapier
  sees the constraint, so the solver does not begin with a huge positional error.
- Every Lua Weld/Snap/Glue object is preserved, but only an N-1 spanning tree of
  fixed constraints is submitted to Rapier. Redundant closed loops no longer
  over-constrain the physics solver.
- Internal contacts remain disabled across the entire rigid assembly.
- Dynamic assembly roots get 2 additional Rapier solver iterations instead of
  increasing solver work globally.
- JointInstance now exposes classic Part0, Part1, C0, C1 plus lowercase part0 /
  part1 aliases. Enabled/Active are retained for newer-map compatibility.

### Large-map CPU/GPU work

- Rigid assembly graphs, collider hooks, and native weld constraints are rebuilt
  only when topology/body/C0/C1 inputs change instead of every render frame.
- Shared classic Part geometry is cached by primitive shape + dimensions, so
  duplicate block sizes reuse the same GPU geometry buffers.
- The top-stud and bottom-inlet images are shared across map Parts; per-Part UV
  repeat is now a material shader uniform, avoiding duplicate texture uploads.
- Anchored map meshes use static local transform matrices. Dynamic Parts remain
  automatically updated.
- The static scene root no longer forces every map object's matrix to rebuild
  each frame.
- Instance child-name aliases refresh only when Name or Parent changes instead
  of rebuilding parent alias tables for every Instance every frame.
- Opaque map objects no longer perform an unnecessary per-frame distance sort;
  transparent objects still sort back-to-front.
- A Part whose CanCollide, CanTouch, and CanQuery are all false has its Rapier
  collider disabled until one of those capabilities returns.
- CustomPhysicalProperties are only written to Rapier when their values change.

The local-player controller/camera/R6 movement code was intentionally left out
of these optimizations.

### Additional v8.5 map-side optimization details

- JointInstance now also exposes lowercase `c0` / `c1` aliases in addition to
  `part0` / `part1`, matching older script style without changing CFrame math.
- Weld/assembly input scanning is rate-limited to at most 60 Hz. Explicit joint,
  body, or hierarchy changes still mark the graph dirty immediately, so high
  refresh-rate displays no longer rescan thousands of map joints at 144/240 Hz.
- Touched/TouchEnded broad-phase work skips physically anchored assembly members
  and avoids exact Part-vs-Part overlap work when neither endpoint has a touch
  listener. Seat/SpawnLocation engine behavior remains intact.
- Fully transparent ordinary map Parts are omitted from rendering while retaining
  their scripting/physics identity. Character/HumanoidRootPart visuals are excluded
  from this rule.
- Rectangular classic Blocks keep the same faces, normals, UVs, top studs, and
  bottom inlets, but their index groups are reordered so the four identical side
  materials render as one group. This reduces the block from six material draw
  groups to three (sides + top + bottom) without changing the classic appearance.

The player controller, R6 movement, player camera, and player collision model were
not changed by these large-map optimizations.


## v8.6: Tool script lifecycle + off-screen culling

- StarterPack and StarterGui templates are not cloned while an RBXL/RBXLX map is
  still incrementally constructing descendants. Runtime copies are created only
  from the complete template after loading.
- Tool/HopperBin runtime clones repair internal Part0/Part1/ObjectValue/etc.
  references so they point at the cloned descendants instead of the hidden
  StarterPack template.
- Tool serialization now preserves Grip, GripPos/Forward/Right/Up, ToolTip,
  CanBeDropped, RequiresHandle, ManualActivationOnly and HopperBin BinType.
- Embedded Script/LocalScript discovery continues at low frequency after startup,
  so scripts introduced by later Tool/PlayerGui clones auto-start like Roblox.
- Startup diagnostics expose startedScripts and toolScripts under
  window.__bloxEmbeddedScriptStartupStats.
- Phase 3 verification now tests the v8.5 N-1 spanning-tree behavior rather than
  incorrectly requiring two parallel native constraints for Weld + Snap.
- The custom raw-WebGL renderer now reports explicit sphere-frustum culling and
  FogEnd-distance culling statistics through getBloxRenderStats().
- Anchored map Parts that were off-screen on the previous rendered frame poll
  their expensive visual/collider property set at 10 Hz instead of display refresh
  rate. Dynamic physics Parts and all player systems are unchanged.


## v8.7: joint-internal NoCollision behavior

- Weld/Snap/Glue/ManualWeld/ManualGlue rigid assemblies now suppress physical
  contacts between every pair of Parts in the same rigid assembly.
- Motor/Motor6D/Rotate and other active classic JointInstance pairs suppress
  physical contacts only between their directly connected Part0/Part1.
- The suppression is implemented in Rapier's contact-pair hook, not by turning
  Parts into sensors. Therefore those Parts still collide with the player and
  unrelated map geometry normally.
- Contact filtering stays enabled even for effectively anchored assemblies so
  body recreation/unfreeze transitions cannot briefly self-collide.
- Redundant rigid cycle edges are never run through the old teleport fallback;
  the N-1 native spanning tree owns them physically.
- Runtime diagnostics: `window.__bloxJointCollisionStats`.


## v8.8: ClickDetector callback + Rapier aliasing fix

The v8.7 joint NoCollision contact-hook updater enumerated a Part's collider
through the Rapier RigidBody wrapper. After an interactive Script dirtied the
joint graph, that path could trigger Rapier/WASM's recursive-borrow guard and
then cause later ray queries to fail as well.

v8.8 uses each BasePart's direct `__internal.collider` reference for contact-hook
updates and other common single-collider operations. Stale/replaced colliders are
non-fatal and cannot leave the hook updater retrying every animation frame.

Classic scripting compatibility was also expanded for old ClickDetector/Tool
scripts: Model `move`, `moveTo`, `TranslateBy`, `GetModelSize`,
`GetPrimaryPartCFrame`, lowercase aliases, Player `DistanceFromCharacter`,
ClickDetector historical aliases/events, ancestor detector lookup, and RBXL
persistence of `MaxActivationDistance`/`CursorIcon`.

When a legacy Script still calls an unsupported API, the console now prints the
matching original Script.Source line around the VM error.


## v8.9: classic regen/Clone/MakeJoints + Rapier stale-body lifecycle fix

The attached `2006 Slides.rbxl` contains classic Easy Regen scripts. The yellow
regen target is a 9-Part unanchored Model. At startup the script stores a
`yellow:clone()` template; on click it removes the live Model, clones the stored
template, reparents the new clone to Workspace, and immediately calls
`new_thing:makeJoints()`.

That exposed three engine bugs:

1. a removed dynamic assembly root could remain in `rigidAssemblySolverBodies`;
   calling `setAdditionalSolverIterations()` on that stale Rapier wrapper throws
   and poisons Rapier 0.20's WASM borrow guard;
2. public `Instance:Clone()` did not run the deep reference-relink pass;
3. freshly cloned BaseParts still had default Rapier pose/size until the next
   animation-frame sync, so an immediate `Model:makeJoints()` queried the wrong
   body transforms.

v8.9 fixes the lifecycle before every body removal/body swap, detaches native
joints while bodies are still valid, purges solver-body references, refuses to
call stale Rapier body wrappers, makes off-Workspace clone templates physically
inert, makes public Clone perform deep reference repair, synchronizes a cloned
Model's authored Part CFrames/sizes immediately before MakeJoints, and only then
runs surface-joint broad-phase reconstruction.

The Phase 3 verification now parents its temporary Parts to Workspace, matching
the runtime active-joint predicate, so the spanning-tree and collision-filter
self-tests test the actual intended state instead of an impossible off-Workspace
joint.
