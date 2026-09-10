# v8.5 Weld and Large-Map Notes

## Why the old welds could "panic"

Classic Roblox `Weld`/`JointInstance` uses two local frames and maintains the
relationship:

```text
Part1.CFrame * C1 == Part0.CFrame * C0
```

Old places can contain dense and sometimes redundant weld/snap graphs. Mapping
every serialized rigid edge to a separate Rapier fixed constraint can create
closed constraint loops. If even one old C0/C1 pair differs slightly from the
others, the solver receives contradictory constraints and can inject visible
jitter/impulses.

v8.5 preserves every Lua Weld/Snap/Glue object, but the physics backend creates a
deterministic rooted spanning tree with only N-1 fixed constraints for an N-part
rigid assembly. This preserves rigid connectivity while avoiding redundant
closed-loop constraints. Before a fixed constraint is created, the non-root
subtree is placed at the exact C0/C1-authored transform so Rapier does not have to
correct a large error with an impulse.

The assembly root is selected using Roblox-like priorities: anchored first,
non-Massless, RootPriority, classic root-type preference, face area, then stable
instance order. Internal collisions remain suppressed across the entire rigid
assembly. Part masses still participate in the dynamic mechanism; the emulator
is not forcing Part1 to be a literal physical center of mass.

For the legacy fixed-joint convention, a joint's *origin* can conveniently be at
Part1 with `C1 = CFrame.new()`. That is a joint coordinate-frame convention, not
the assembly center of mass. The physical assembly center of mass remains
mass/position weighted across the connected parts.

## C0 / C1 compatibility

`Weld`, `Snap`, `Glue`, `ManualWeld`, and `ManualGlue` expose:

- `Part0` / `Part1`
- `C0` / `C1`
- lowercase `part0` / `part1`
- lowercase `c0` / `c1`
- `Enabled`
- runtime `Active`

RBXL/RBXLX C0/C1 values are kept as full CFrame matrices rather than being
round-tripped through Euler angles. Missing legacy frames (for example a converted
WeldConstraint) are derived from the authored current Part transforms.

## Large-map changes

The player system was deliberately left alone. Map-side work was reduced by:

- dirty-driven rigid assembly rebuilding instead of unconditional rebuilds;
- joint input scans capped at 60 Hz on high-refresh-rate displays;
- O(1) pair/contact bookkeeping for assemblies;
- skipping map touch overlap tests when there are no listeners;
- disabling colliders whose CanCollide/CanTouch/CanQuery are all false;
- geometry reuse by primitive shape and dimensions;
- one shared top-stud and bottom-inlet texture resource;
- static transform matrices for anchored map geometry;
- avoiding unconditional child-alias rebuilds every frame;
- avoiding per-frame opaque distance sorting;
- not drawing fully transparent ordinary map Parts;
- reducing classic rectangular Block material groups from 6 to 3 while keeping
  the same visual faces and stud/inlet textures.

## Research references used

- Roblox API Reference — Weld:
  https://robloxapi.github.io/ref/class/Weld.html
- Roblox Creator Hub — Assemblies:
  https://create.roblox.com/docs/physics/assemblies
- Legacy Roblox Wiki — Joints / Connectors:
  https://rbxlegacy.wiki/index.php/Connectors
- Rapier JavaScript guide — Joints:
  https://rapier.rs/docs/user_guides/javascript/joints/
- Rapier JavaScript RigidBody API — additional solver iterations:
  https://rapier.rs/javascript3d/classes/RigidBody.html
- Roblox Creator Hub — Improve performance:
  https://create.roblox.com/docs/performance-optimization/improve
- Three.js manual — Matrix transformations:
  https://threejs.org/manual/en/matrix-transformations.html
