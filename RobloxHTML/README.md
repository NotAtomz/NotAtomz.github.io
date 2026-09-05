# Blox Emulation

Blox Emulation is a small Roblox-inspired emulator made as a vibe-coded project. It runs a mini playable Roblox-style environment in the browser using an uploaded Luau script.

You can load a script, spawn into the emulator, and test basic classic Roblox-style gameplay systems such as parts, physics, character movement, seats, humanoids, camera behavior, and simple scripting.

## How to Use

1. Open the emulator in your browser:  
   [https://notatomz.github.io/RobloxHTML/](https://notatomz.github.io/RobloxHTML/)

2. Upload or provide a compatible Luau script.

3. Click the load/start button.

4. Play inside the generated Roblox-style world.

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
