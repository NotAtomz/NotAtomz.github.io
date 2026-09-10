# v6 fixes

## Loading / Starting physics hang

Embedded RBXL/RBXLX Script and LocalScript objects no longer participate in the map-load completion barrier. The place loader now completes object import, references/connectors, frozen-physics release, and physics settling; then the first LocalPlayer Character is spawned, the camera/UI are restored, and the loading overlay is removed. Only after gameplay is live are imported Script/LocalScript objects started in the background, one per browser frame. This prevents a legacy gameplay script that waits for a touch/player/timer from holding the loading screen indefinitely.

StarterPack and StarterGui template scripts are skipped in-place so their runtime Backpack/PlayerGui clones are not started twice.

## HumanoidRootPart

The local R6 now has an invisible HumanoidRootPart that proxies the existing controlled Rapier player body. The following work on the local character:

- `Character.HumanoidRootPart`
- `Humanoid.RootPart`
- `Character.PrimaryPart`
- `HumanoidRootPart.Position`
- `HumanoidRootPart.CFrame`
- `HumanoidRootPart.Orientation` / `Rotation`
- `Velocity` / `AssemblyLinearVelocity`
- live readback of position, rotation, and velocity

CFrame/rotation writes update both the player physics transform and visible R6 orientation.
