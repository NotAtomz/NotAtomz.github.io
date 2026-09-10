# Blox Emulation

Blox Emulation is a small Roblox-inspired emulator made as a vibe-coded project. It runs a mini playable Roblox-style environment in the browser using an uploaded Lua/Luau map script or Roblox RBXL/RBXLX place file.

You can load a script, spawn into the emulator, and test basic classic Roblox-style gameplay systems such as parts, physics, character movement, seats, humanoids, camera behavior, and simple scripting.

## How to Use

1. Open the emulator in your browser:  
   [https://notatomz.github.io/RobloxHTML/](https://notatomz.github.io/RobloxHTML/)

2. Upload a compatible `.lua`, `.luau`, `.rbxl`, or `.rbxlx` map.

3. Click the load/start button.

4. Play inside the generated Roblox-style world.


## RBXL / RBXLX Loading

`.rbxl` (binary) and `.rbxlx` (XML) place files are parsed in the browser. The emulator creates supported instances sequentially and yields during loading so large places do not try to appear in one blocking frame. A classic translucent loading panel shows live **Bricks** and **Connectors** counts. Core UI and the local character stay hidden until loading finishes. During loading the camera follows the first created part at roughly 1500 studs; afterward the normal 20-stud camera and player spawn behavior are restored.

Lua/Luau map files keep the original loading path and behavior.

## Executing Scripts In Game 

Open Your Browser Console And Do This:

await executeLuau(`script in here`)

And you will then execute a script live in game

You Can Do await executeLuau(`print("hello from live Luau")`) For Example

## Making Your Own Maps

You can make your own maps in Roblox Studio and export them into code that Blox Emulation can load.

To do this, use the **Blox Emulation Workspace Exporter** plugin:

[Download the Workspace Exporter Plugin](https://github.com/NotAtomz/NotAtomz.github.io/blob/main/RobloxHTML/Blox%20Emulation%20Workspace%20Exporter.rbxmx)

### How to Export a Map

1. Open Roblox Studio.

2. Build your map inside `Workspace`.

3. Insert or install the **Blox Emulation Workspace Exporter** plugin.

4. Click the plugin button to export your Workspace.

5. The plugin will generate a script containing your map data.

6. Copy the generated code.

7. Open Blox Emulation in your browser.

8. Upload or paste the generated Luau code into the emulator.

9. Click the load/start button to play your exported map.

### Exporter Notes

The exporter is made to convert Roblox Studio maps into code that works better with the Blox Emulation Luau VM.

It can export common objects such as:

- Parts
- Models
- Folders
- Seats
- Humanoids
- Value objects
- Welds and basic joints
- BodyMovers
- Scripts inside parts and models

Scripts are placed at the bottom of the generated code so the map loads first before the scripts start running.

The exporter also tries to convert some newer Roblox code into older-style code that works better with the emulator. For example:

```lua
task.wait(1)

### RBXL/RBXLX property and script compatibility

The place converter now translates old/new serialized BasePart property names to the
emulator API (including size/shape/form factor and Color3uint8), preserves fractional
Part sizes, imports exact colors, and preserves Script/LocalScript/ModuleScript objects
with their Source. Script and LocalScript objects are started in their map lifecycle
phases after the place is fully loaded; see `RBXL_RBXLX_SUPPORT.md` for details.

### RBXL/RBXLX v8 physics note

The v8 reader/runtime adds Roblox-style rigid assembly handling for classic
Weld/Snap/Glue maps. It reconstructs old surface joints while loading, propagates
physical anchoring through rigid assemblies, filters self-collision inside an
assembly, removes serialized launch velocities at startup, and preserves body
rotation when loading-time anchoring is released.
