local player = game.Players.LocalPlayer
local character = player.Character
local humanoid = character:WaitForChild("Humanoid")

local base = Instance.new("Part")
base.Name = "Baseplate"
base.Size = Vector3.new(500,1,500)
base.Position = Vector3.new(0,-1,0)
base.Color = Color3.fromRGB(100,100,100)
base.Anchored = true
base.Parent = workspace

local ball = Instance.new("Part")
ball.Size = Vector3.new(6, 6, 6)
ball.Position = Vector3.new(-5, 15, 0)
ball.Shape = Enum.PartType.Ball
ball.BrickColor = BrickColor.new("Bright blue")
ball.Anchored = false
ball.Parent = workspace

local cylinder = Instance.new("Part")
cylinder.Size = Vector3.new(8, 6, 6)
cylinder.Position = Vector3.new(5, 15, 0)
cylinder.Shape = Enum.PartType.Cylinder
cylinder.BrickColor = BrickColor.new("Bright green")
cylinder.Anchored = false
cylinder.Parent = workspace

local wedge = Instance.new("WedgePart")
wedge.Size = Vector3.new(8, 6, 10)
wedge.Position = Vector3.new(15, 15, 0)
wedge.BrickColor = BrickColor.new("Bright yellow")
wedge.Anchored = false
wedge.Parent = workspace

local Players = game:GetService("Players")
local StarterPack = game:GetService("StarterPack")
local Debris = game:GetService("Debris")

local player = Players.LocalPlayer

local tool = Instance.new("Tool")
tool.Name = "Rocket Launcher"
tool.CanBeDropped = true
tool.TextureId = ""

local handle = Instance.new("Part")
handle.Name = "Handle"
handle.Size = Vector3.new(1, 1, 3)
handle.BrickColor = BrickColor.new("Dark stone grey")
handle.CanCollide = false
handle.Parent = tool

tool.Parent = StarterPack

local ROCKET_SPEED = 85
local BLAST_RADIUS = 20
local BLAST_PRESSURE = 350000
local FIRE_DELAY = 0.6
local ROCKET_LIFETIME = 6

local mouse = nil
local canFire = true

local function fireRocket()
	if not mouse then
		return
	end

	if not canFire then
		return
	end

	canFire = false

	local character = player.Character

	if not character then
		canFire = true
		return
	end

	local head = character:FindFirstChild("Head")

	if not head then
		canFire = true
		return
	end

	local targetPosition = mouse.Hit.Position
	local startPosition = head.Position + Vector3.new(0, 0.3, 0)

	local direction = targetPosition - startPosition

	if direction.Magnitude <= 0.001 then
		canFire = true
		return
	end

	direction = direction.Unit

	local rocket = Instance.new("Part")
	rocket.Name = "Rocket"
	rocket.Size = Vector3.new(0.5, 0.5, 2)
	rocket.BrickColor = BrickColor.new("Bright red")

	rocket.Anchored = false
	rocket.CanCollide = false

	rocket.Position = startPosition + direction * 4

	rocket.Velocity = direction * ROCKET_SPEED

	rocket.Parent = workspace

	local exploded = false

	rocket.Touched:Connect(function(hit)
		if exploded then
			return
		end

		if not hit then
			return
		end

		-- Don't explode on your own character.
		if character and hit:IsDescendantOf(character) then
			return
		end

		-- Don't count the launcher itself.
		if hit:IsDescendantOf(tool) then
			return
		end

		exploded = true

		rocket.Velocity = Vector3.new(0, 0, 0)
		rocket.RotVelocity = Vector3.new(0, 0, 0)

		local explosion = Instance.new("Explosion")
		explosion.Position = rocket.Position
		explosion.BlastRadius = BLAST_RADIUS
		explosion.BlastPressure = BLAST_PRESSURE
		explosion.Parent = workspace

		rocket:Destroy()
	end)

	Debris:AddItem(rocket, ROCKET_LIFETIME)

	delay(FIRE_DELAY, function()
		canFire = true
	end)
end

tool.Equipped:Connect(function(toolMouse)
	mouse = toolMouse
end)

tool.Unequipped:Connect(function()
	mouse = nil
end)

tool.Activated:Connect(function()
	fireRocket()
end)