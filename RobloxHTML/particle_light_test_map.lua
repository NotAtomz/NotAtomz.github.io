-- Blox particle and local-light test map
-- Run this as a Script. Everything is placed inside Workspace.EffectLightTest.

local Workspace = game.Workspace
local Lighting = game.Lighting

Lighting.TimeOfDay = "00:00:00"
Lighting.ClockTime = 0
Lighting.Brightness = 0
Lighting.Ambient = Color3.new(0, 0, 0)
Lighting.OutdoorAmbient = Color3.new(0, 0, 0)
Lighting.GlobalShadows = true

local oldMap = Workspace:FindFirstChild("EffectLightTest")
if oldMap then
    oldMap:Destroy()
end

local map = Instance.new("Model")
map.Name = "EffectLightTest"
map.Parent = Workspace

local function part(name, size, position, color)
    local p = Instance.new("Part")
    p.Name = name
    p.Size = size
    p.Position = position
    p.Anchored = true
    p.CanCollide = true
    p.Color = color
    p.Parent = map
    return p
end

local function label(target, text)
    local gui = Instance.new("BillboardGui")
    gui.Name = "Label"
    gui.Adornee = target
    gui.Size = UDim2.new(0, 170, 0, 34)
    gui.StudsOffset = Vector3.new(0, 3.5, 0)
    gui.AlwaysOnTop = true
    gui.Parent = target

    local caption = Instance.new("TextLabel")
    caption.Name = "Caption"
    caption.Size = UDim2.new(1, 0, 1, 0)
    caption.BackgroundColor3 = Color3.new(0.08, 0.08, 0.08)
    caption.BackgroundTransparency = 0.2
    caption.BorderSizePixel = 1
    caption.TextColor3 = Color3.new(1, 1, 1)
    caption.TextScaled = true
    caption.Text = text
    caption.Parent = gui
end

part(
    "Floor",
    Vector3.new(80, 1, 48),
    Vector3.new(0, -0.5, 0),
    Color3.new(0.12, 0.12, 0.14)
)

-- Back wall makes light range, color, falloff, and shadows easy to inspect.
part(
    "LightWall",
    Vector3.new(68, 18, 1),
    Vector3.new(0, 9, -15),
    Color3.new(0.42, 0.42, 0.45)
)

-- Particle stations ---------------------------------------------------------

local sparklesPart = part(
    "SparklesStation",
    Vector3.new(4, 2, 4),
    Vector3.new(-24, 1, 8),
    Color3.new(0.32, 0.12, 0.48)
)
local sparkles = Instance.new("Sparkles")
sparkles.SparkleColor = Color3.new(0.65, 0.2, 1)
sparkles.Enabled = true
sparkles.Parent = sparklesPart
label(sparklesPart, "Sparkles")

local firePart = part(
    "FireStation",
    Vector3.new(4, 2, 4),
    Vector3.new(-8, 1, 8),
    Color3.new(0.32, 0.08, 0.02)
)
local fire = Instance.new("Fire")
fire.Color = Color3.new(1, 0.25, 0)
fire.SecondaryColor = Color3.new(1, 0.9, 0.1)
fire.Heat = 9
fire.Size = 6
fire.Enabled = true
fire.Parent = firePart
label(firePart, "Fire")

local smokePart = part(
    "SmokeStation",
    Vector3.new(4, 2, 4),
    Vector3.new(8, 1, 8),
    Color3.new(0.18, 0.18, 0.18)
)
local smoke = Instance.new("Smoke")
smoke.Color = Color3.new(0.65, 0.68, 0.72)
smoke.Opacity = 0.72
smoke.RiseVelocity = 4
smoke.Size = 5
smoke.Enabled = true
smoke.Parent = smokePart
label(smokePart, "Smoke")

local emitterPart = part(
    "ParticleEmitterStation",
    Vector3.new(4, 2, 4),
    Vector3.new(24, 1, 8),
    Color3.new(0.05, 0.2, 0.28)
)
local emitter = Instance.new("ParticleEmitter")
emitter.Texture = "Textures/Smoke.png"
emitter.Enabled = true
emitter.Rate = 16
emitter.Lifetime = NumberRange.new(1.5, 2.5)
emitter.Speed = NumberRange.new(3, 6)
emitter.SpreadAngle = Vector3.new(35, 35, 0)
emitter.Rotation = NumberRange.new(0, 360)
emitter.RotSpeed = NumberRange.new(-45, 45)
emitter.Acceleration = Vector3.new(0, 1, 0)
emitter.Drag = 0.4
emitter.LightEmission = 0.25
emitter.Parent = emitterPart
label(emitterPart, "ParticleEmitter")

-- Light stations ------------------------------------------------------------

local pointPart = part(
    "PointLightStation",
    Vector3.new(4, 4, 4),
    Vector3.new(-18, 2, -7),
    Color3.new(0.12, 0.02, 0.02)
)
local point = Instance.new("PointLight")
point.Color = Color3.new(1, 0.12, 0.05)
point.Brightness = 3
point.Range = 18
point.Shadows = true
point.Enabled = true
point.Parent = pointPart
label(pointPart, "PointLight")

local spotPart = part(
    "SpotLightStation",
    Vector3.new(4, 4, 4),
    Vector3.new(0, 2, -7),
    Color3.new(0.02, 0.08, 0.2)
)
local spot = Instance.new("SpotLight")
spot.Color = Color3.new(0.12, 0.45, 1)
spot.Brightness = 4
spot.Range = 22
spot.Angle = 55
spot.Face = "Front"
spot.Shadows = true
spot.Enabled = true
spot.Parent = spotPart
label(spotPart, "SpotLight")

local surfacePart = part(
    "SurfaceLightStation",
    Vector3.new(8, 4, 2),
    Vector3.new(18, 2, -7),
    Color3.new(0.02, 0.18, 0.06)
)
local surface = Instance.new("SurfaceLight")
surface.Color = Color3.new(0.12, 1, 0.3)
surface.Brightness = 3
surface.Range = 18
surface.Angle = 100
surface.Face = "Front"
surface.Shadows = true
surface.Enabled = true
surface.Parent = surfacePart
label(surfacePart, "SurfaceLight")

-- Small unlit blockers expose whether each local light casts voxel shadows.
part("PointShadowBlocker", Vector3.new(2, 7, 2), Vector3.new(-18, 3.5, -11), Color3.new(0.08, 0.08, 0.08))
part("SpotShadowBlocker", Vector3.new(2, 7, 2), Vector3.new(0, 3.5, -11), Color3.new(0.08, 0.08, 0.08))
part("SurfaceShadowBlocker", Vector3.new(2, 7, 2), Vector3.new(18, 3.5, -11), Color3.new(0.08, 0.08, 0.08))

print("Particle and light test map created")
