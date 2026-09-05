# Blox Emulation

Blox Emulation is a small Roblox-inspired emulator made as a vibe-coded project. It runs a mini playable Roblox-style environment in the browser using an uploaded Luau script.

You can load a script, spawn into the emulator, and test basic classic Roblox-style gameplay systems such as parts, physics, character movement, seats, humanoids, camera behavior, and simple scripting.

## How to Use

1. Open the emulator in your browser:  
   https://notatomz.github.io/RobloxHTML/

2. Upload or provide a compatible Luau script.

3. Click the load/start button.

4. Play inside the generated Roblox-style world.

## Luau Logs and Debugging

Luau `print()` and `warn()` messages are shown in your browser's Developer Console.

To open the console:

- **Chrome / Edge:** press `F12` or `Ctrl + Shift + J`
- **Firefox:** press `F12` or `Ctrl + Shift + K`

Example Luau code:

```lua
print("Hello from Luau!")
warn("This is a warning")
