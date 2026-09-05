local player = game.Players.LocalPlayer
local character = player.Character
local humanoid = character:WaitForChild("Humanoid")

local base = Instance.new("Part")
base.Name = "Baseplate"
base.Size = Vector3.new(100,1,100)
base.Position = Vector3.new(0,-1,0)
base.Color = Color3.fromRGB(100,100,100)
base.Anchored = true
base.Parent = workspace

local part1 = Instance.new("Part")
part1.Name = "WeldPart1"
part1.Size = Vector3.new(5,5,5)
part1.Position = Vector3.new(-15,0,0)
part1.Color = Color3.fromRGB(255,0,0)
part1.Anchored = true
part1.Parent = workspace

local part2 = Instance.new("Part")
part2.Name = "WeldPart2"
part2.Size = Vector3.new(5,5,5)
part2.Position = Vector3.new(-10,0,0)
part2.Color = Color3.fromRGB(0,255,0)
part2.Anchored = false
part2.Parent = workspace

local weld = Instance.new("Weld")
weld.Part0 = part1
weld.Part1 = part2
weld.Parent = part1

local touchPart = Instance.new("Part")
touchPart.Name = "TouchPart"
touchPart.Size = Vector3.new(10, 1, 10)
touchPart.Position = Vector3.new(0, 1, 30)
touchPart.BrickColor = BrickColor.new("Bright red")
touchPart.Anchored = true
touchPart.Parent = workspace

touchPart.Touched:connect(function(hit)
    print("Touched by: " .. hit.Name)

    touchPart.BrickColor = BrickColor.new("Bright green")
end)

touchPart.TouchEnded:connect(function(hit)
    print("Stopped touching: " .. hit.Name)

    touchPart.BrickColor = BrickColor.new("Bright red")
    
    game.Players.LocalPlayer.Character:WaitForChild("Humanoid"):TakeDamage(25)
end)
local part4 = Instance.new("Part")
part4.Name = "part"
part4.Size = Vector3.new(5,5,5)
part4.Position = Vector3.new(-10,5,0)
part4.Color = Color3.fromRGB(0,255,0)
part4.Anchored = false
part4.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(10,0,0)
stare1.Anchored = true
stare1.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(12,1,0)
stare1.Anchored = true
stare1.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(14,2,0)
stare1.Anchored = true
stare1.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(10,0,5)
stare1.Anchored = true
stare1.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(10.2,2,5)
stare1.Anchored = true
stare1.Parent = workspace

local stare1 = Instance.new("Part")
stare1.Name = "StarePart1"
stare1.Size = Vector3.new(5,1,5)
stare1.Position = Vector3.new(10.4,4,5)
stare1.Anchored = true
stare1.Parent = workspace

local RunService = game:GetService("RunService")

print("math:", math.floor(3.9))
print("string:", string.upper("hello"))

local t = {}

table.insert(t, "A")
table.insert(t, "B")

print("table:", table.concat(t, ", "))

spawn(function()
    for i = 1, 5 do
        print("spawn loop", i)
        wait(0.5)
    end
end)

delay(2, function()
    print("delay worked")
end)

RunService.Heartbeat:connect(function(dt)
    -- don't print every frame unless testing
end)

for i = 1, 3 do
    print("main loop", i)
    wait(1)
end

print("finished")

print("Character:", character.Name)
print("Humanoid health:", humanoid.Health)
print("WalkSpeed:", humanoid.WalkSpeed)

print("Torso:", character.Torso.Name)

character.Torso.BrickColor = BrickColor.new("Bright blue")

local folder = Instance.new("Folder")
folder.Name = "Values"
folder.Parent = workspace

local number = Instance.new("NumberValue")
number.Name = "Score"
number.Value = 25
number.Parent = folder

number.Changed:connect(function(value)
    print("Score changed:", value)
end)

number.Value = 50

local cf = CFrame.new(1, 2, 3)
local rot = CFrame.Angles(0, math.rad(90), 0)
local combined = cf:Multiply(rot)

print("CFrame position:", combined.X, combined.Y, combined.Z)

humanoid.HealthChanged:connect(function(health)
    print("Health:", health)
end)

humanoid.Died:connect(function()
    print("Player died")
end)

local seat = Instance.new("Seat")
seat.Name = "TestSeat"
seat.Size = Vector3.new(4, 1, 2)
seat.Position = Vector3.new(0, 1, -10)
seat.Anchored = true
seat.Parent = workspace