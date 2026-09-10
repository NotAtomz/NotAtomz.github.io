-- Blox Emulation Workspace Export
-- Generated from Roblox Studio
--
-- Converted for the Blox Emulation Luau VM.

print("Loading exported Workspace...")

-- ==================================================
-- Objects
-- ==================================================

-- Skipped unsupported class: Camera (Workspace.Camera)
-- Workspace.Part
local part1 = Instance.new("Part")
part1.Name = "Part"
part1.Size = Vector3.new(75, 1, 75)
part1.Position = Vector3.new(0, -34.499996, 0)
part1.Orientation = Vector3.new(0, 0, 0)
part1.Color = Color3.fromRGB(99, 95, 98)
part1.Anchored = true
part1.CanCollide = true

-- Workspace.Part
local part2 = Instance.new("Part")
part2.Name = "Part"
part2.Size = Vector3.new(10, 45, 10)
part2.Position = Vector3.new(0, -57.499996, 0)
part2.Orientation = Vector3.new(0, 0, 0)
part2.Color = Color3.fromRGB(163, 162, 165)
part2.Anchored = true
part2.CanCollide = true

-- Workspace.Part
local part3 = Instance.new("Part")
part3.Name = "Part"
part3.Size = Vector3.new(1000, 1, 1000)
part3.Position = Vector3.new(0, -76, 0)
part3.Orientation = Vector3.new(0, 0, 0)
part3.Color = Color3.fromRGB(9, 137, 207)
part3.Anchored = true
part3.CanCollide = true

-- Workspace.SpawnLocation
local part4 = Instance.new("SpawnLocation")
part4.Name = "SpawnLocation"
part4.Size = Vector3.new(12, 1, 12)
part4.Position = Vector3.new(0, -33.499996, 0)
part4.Orientation = Vector3.new(0, 0, 0)
part4.Color = Color3.fromRGB(163, 162, 165)
part4.Anchored = true
part4.CanCollide = true
part4.Enabled = true
part4.Neutral = true
part4.TeamColor = BrickColor.new("Medium stone grey")
part4.AllowTeamChangeOnTouch = false
part4.Duration = 10

-- Workspace.Part
local part5 = Instance.new("Part")
part5.Name = "Part"
part5.Size = Vector3.new(75, 1, 75)
part5.Position = Vector3.new(0, -68.499992, -232.5)
part5.Orientation = Vector3.new(0, 0, 0)
part5.Color = Color3.fromRGB(40, 127, 71)
part5.Anchored = true
part5.CanCollide = true

-- Workspace.SpawnPart1
local part6 = Instance.new("Part")
part6.Name = "SpawnPart1"
part6.Size = Vector3.new(1, 1, 1)
part6.Position = Vector3.new(1.5, 15.500008, -232.5)
part6.Orientation = Vector3.new(0, 0, 0)
part6.Color = Color3.fromRGB(40, 127, 71)
part6.Anchored = true
part6.CanCollide = false

-- Workspace.Spawnpoint
local part7 = Instance.new("Part")
part7.Name = "Spawnpoint"
part7.Size = Vector3.new(1, 1, 1)
part7.Position = Vector3.new(3.5, -62.499992, -208.5)
part7.Orientation = Vector3.new(0, 0, 0)
part7.Color = Color3.fromRGB(40, 127, 71)
part7.Anchored = true
part7.CanCollide = false

-- Workspace.Part
local part8 = Instance.new("Part")
part8.Name = "Part"
part8.Size = Vector3.new(75, 8, 75)
part8.Position = Vector3.new(0, -72.999992, -232.5)
part8.Orientation = Vector3.new(0, 0, 0)
part8.Color = Color3.fromRGB(105, 64, 40)
part8.Anchored = true
part8.CanCollide = true

-- ==================================================
-- Parenting
-- ==================================================

part1.Parent = workspace
part2.Parent = workspace
part3.Parent = workspace
part4.Parent = workspace
part5.Parent = workspace
part6.Parent = workspace
part7.Parent = workspace
part8.Parent = workspace

-- ==================================================
-- Joints / References
-- ==================================================


-- ==================================================
-- Embedded Scripts
-- ==================================================
-- Scripts are started after the Workspace has loaded.

-- --------------------------------------------------
-- Script: Workspace.SpawnLocation.Script
-- Original parent: Workspace.SpawnLocation
spawn(function()

    local runservice = game:GetService("RunService")
    runservice.Heartbeat:Connect(function()
    	local message = Instance.new("Message")
    	message.Text = "The game will reset in 6 seconds"
    	message.Parent = game.Workspace
    	wait(1)
    	message:Destroy()
    	wait(5)
    	local seat = Instance.new("Seat")
    	seat.Anchored = true
    	seat.Position = game.Players.LocalPlayer.Character.Torso.Position
    	seat.Parent = game.Workspace
    	wait(1)
    	seat.Position = workspace.Spawnpoint.Position
    	wait(1)
    	game.Players.LocalPlayer.Character.Humanoid.Sit = false
    	wait()
    	seat:Destroy()
    	wait(30)
    end)

end)

-- --------------------------------------------------
-- Script: Workspace.SpawnPart1.Script
-- Original parent: Workspace.SpawnPart1
spawn(function()

    local runservice = game:GetService("RunService")
    runservice.Heartbeat:Connect(function()
    	local meteor = Instance.new("Part")
    	meteor.Name = "Meteor"
    	meteor.Parent = workspace
    	meteor.Size = Vector3.new(5, 5, 5)
    	meteor.Position = part6.Position - Vector3.new(math.random(-50, 50),10,math.random(-50, 50))
    	meteor.Color = Color3.fromRGB(48, 28, 0)
    	meteor.Anchored = false
    	local connection
    	
    	connection = meteor.Touched:Connect(function(hit)
    		local explode = Instance.new("Explosion")
    		explode.Position = meteor.Position
    		explode.Parent = workspace
    		connection = nil
    		meteor:Destroy()
    	end)
    	wait(1)
    end)

end)

print("Workspace export loaded successfully.")