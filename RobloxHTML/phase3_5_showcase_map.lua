--[[
    Blox Emulation - Phase 3.5 Showcase Map (LITE)
    Lower object-count version of the previous test map.

    Keeps tests for:
      - Models / Folders
      - BrickColor / Color3
      - SelectionBox
      - CollectionService / Debris
      - BodyVelocity / BodyPosition
      - BindableEvent / BindableFunction
      - RemoteEvent / RemoteFunction
      - Ray / Region3 / GetPartsInPart
      - Value objects
      - Humanoid events / MoveTo
      - Mouse / UserInputService / ContextActionService
      - Workspace.Gravity / CurrentCamera
]]

print("=== Phase 3.5 Showcase Map LITE Loading ===")

local Players = game:GetService("Players")
local Debris = game:GetService("Debris")
local CollectionService = game:GetService("CollectionService")
local UIS = game:GetService("UserInputService")
local CAS = game:GetService("ContextActionService")

local player = Players.LocalPlayer
local character = player.Character
local humanoid = character:WaitForChild("Humanoid")

workspace.Gravity = 50

-- Map origin / spawn convention:
--   Main floor Part.Position = Vector3.new(0, 0, 0)
--   Player physics spawn     = Vector3.new(0, 4, 0)
--
-- The emulator already creates the playable character at 0,4,0, so the map
-- is built around that origin and keeps large geometry out of the spawn point.
print("[Map] Expected player spawn: 0, 4, 0")
print("[Map] Main floor center: 0, 0, 0")

-- =========================================================
-- HELPERS
-- =========================================================

local function makePart(name, size, pos, color, anchored, parent)
    local p = Instance.new("Part")
    p.Name = name
    p.Size = size
    p.Position = pos
    p.Anchored = anchored
    p.CanCollide = true
    p.BrickColor = BrickColor.new(color)
    p.Parent = parent or workspace
    return p
end

local function makeModel(name, parent)
    local m = Instance.new("Model")
    m.Name = name
    m.Parent = parent or workspace
    return m
end

local function makeFolder(name, parent)
    local f = Instance.new("Folder")
    f.Name = name
    f.Parent = parent or workspace
    return f
end

local function addSelection(part, color)
    local box = Instance.new("SelectionBox")
    box.Name = part.Name .. "_Selection"
    box.Adornee = part
    box.Color3 = color
    box.LineThickness = 0.05
    box.Parent = part
    return box
end

-- =========================================================
-- ROOT
-- =========================================================

local map = makeModel("ClassicCityLite")
CollectionService:AddTag(map, "Map")

local geometry = makeFolder("Geometry", map)
local interactives = makeFolder("Interactives", map)
local tests = makeFolder("Phase35Tests", map)

-- =========================================================
-- GROUND + ROADS
-- =========================================================

local grass = makePart(
    "Grass",
    Vector3.new(150, 1, 150),
    Vector3.new(0, 0, 0),
    "Bright green",
    true,
    geometry
)

grass.TopSurface = "Studs"
grass.BottomSurface = "Inlet"

makePart(
    "MainRoad",
    Vector3.new(20, 1, 150),
    Vector3.new(0, 0.55, 0),
    "Dark stone grey",
    true,
    geometry
)

makePart(
    "CrossRoad",
    Vector3.new(150, 1, 20),
    Vector3.new(0, 0.55, 0),
    "Dark stone grey",
    true,
    geometry
)

-- Only a few road stripes instead of dozens.
for z = -50, 50, 25 do
    local stripe = makePart(
        "RoadStripe",
        Vector3.new(1, 0.1, 8),
        Vector3.new(0, 1.05, z),
        "Bright yellow",
        true,
        geometry
    )
    stripe.CanCollide = false
end

-- =========================================================
-- SPAWN PLAZA
-- =========================================================

local plaza = makeModel("SpawnPlaza", map)

local plazaFloor = makePart(
    "PlazaFloor",
    Vector3.new(30, 1, 30),
    Vector3.new(0, 1.5, 20),
    "Light stone grey",
    true,
    plaza
)

local monument = makePart(
    "BloxMonument",
    Vector3.new(5, 10, 5),
    Vector3.new(0, 7, 20),
    "Bright blue",
    true,
    plaza
)

monument.Reflectance = 0.2

addSelection(
    monument,
    Color3.fromRGB(80, 170, 255)
)

CollectionService:AddTag(monument, "Landmark")

-- Two columns instead of four.
makePart(
    "PlazaColumnLeft",
    Vector3.new(2, 7, 2),
    Vector3.new(-11, 5, 10),
    "Institutional white",
    true,
    plaza
)

makePart(
    "PlazaColumnRight",
    Vector3.new(2, 7, 2),
    Vector3.new(11, 5, 10),
    "Institutional white",
    true,
    plaza
)

-- =========================================================
-- SMALL OFFICE
-- =========================================================

local office = makeModel("SmallOffice", map)

makePart(
    "OfficeFloor",
    Vector3.new(34, 1, 30),
    Vector3.new(-42, 1.5, -40),
    "Medium stone grey",
    true,
    office
)

makePart(
    "OfficeBack",
    Vector3.new(34, 20, 2),
    Vector3.new(-42, 11, -54),
    "Brick yellow",
    true,
    office
)

makePart(
    "OfficeLeft",
    Vector3.new(2, 20, 28),
    Vector3.new(-58, 11, -40),
    "Brick yellow",
    true,
    office
)

makePart(
    "OfficeRight",
    Vector3.new(2, 20, 28),
    Vector3.new(-26, 11, -40),
    "Brick yellow",
    true,
    office
)

-- Front split around doorway.
makePart(
    "OfficeFrontLeft",
    Vector3.new(12, 20, 2),
    Vector3.new(-53, 11, -26),
    "Brick yellow",
    true,
    office
)

makePart(
    "OfficeFrontRight",
    Vector3.new(12, 20, 2),
    Vector3.new(-31, 11, -26),
    "Brick yellow",
    true,
    office
)

makePart(
    "OfficeRoof",
    Vector3.new(34, 2, 30),
    Vector3.new(-42, 22, -40),
    "Dark stone grey",
    true,
    office
)

-- Only two windows.
local window1 = makePart(
    "Window1",
    Vector3.new(5, 4, 0.3),
    Vector3.new(-51, 11, -24.9),
    "Really blue",
    true,
    office
)
window1.Transparency = 0.3
window1.CanCollide = false

local window2 = makePart(
    "Window2",
    Vector3.new(5, 4, 0.3),
    Vector3.new(-33, 11, -24.9),
    "Really blue",
    true,
    office
)
window2.Transparency = 0.3
window2.CanCollide = false

-- =========================================================
-- SMALL PARK
-- =========================================================

local park = makeModel("SmallPark", map)

makePart(
    "ParkGrass",
    Vector3.new(42, 1, 40),
    Vector3.new(-42, 1.5, 42),
    "Bright green",
    true,
    park
)

local pond = makePart(
    "Pond",
    Vector3.new(16, 0.4, 12),
    Vector3.new(-42, 2.05, 42),
    "Bright blue",
    true,
    park
)
pond.Transparency = 0.35
pond.CanCollide = false

-- Two simple trees instead of six.
local function makeTree(name, x, z)
    local tree = makeModel(name, park)

    makePart(
        "Trunk",
        Vector3.new(3, 8, 3),
        Vector3.new(x, 6, z),
        "Reddish brown",
        true,
        tree
    )

    makePart(
        "Leaves",
        Vector3.new(8, 6, 8),
        Vector3.new(x, 12, z),
        "Dark green",
        true,
        tree
    )
end

makeTree("Tree1", -58, 31)
makeTree("Tree2", -27, 53)

-- =========================================================
-- SMALL TOWER / LANDMARK
-- =========================================================

local tower = makeModel("MiniTower", map)

makePart(
    "TowerBase",
    Vector3.new(20, 1, 20),
    Vector3.new(42, 1.5, 42),
    "Medium stone grey",
    true,
    tower
)

makePart(
    "TowerCore",
    Vector3.new(7, 24, 7),
    Vector3.new(42, 14, 42),
    "Bright red",
    true,
    tower
)

makePart(
    "TowerDeck",
    Vector3.new(20, 2, 20),
    Vector3.new(42, 27, 42),
    "Dark stone grey",
    true,
    tower
)

CollectionService:AddTag(tower, "Landmark")

-- =========================================================
-- PHYSICS TESTS
-- =========================================================

local physicsCube = makePart(
    "PhysicsCube",
    Vector3.new(5, 5, 5),
    Vector3.new(25, 12, -30),
    "Bright red",
    false,
    tests
)

physicsCube.CustomPhysicalProperties = {
    Friction = 0.35,
    Elasticity = 0.25
}

physicsCube.Velocity =
    Vector3.new(0, 0, 5)

addSelection(
    physicsCube,
    Color3.fromRGB(255, 80, 80)
)

-- One hover platform.
local hoverPlatform = makePart(
    "HoverPlatform",
    Vector3.new(12, 1, 12),
    Vector3.new(30, 8, 12),
    "Bright blue",
    false,
    interactives
)

local hoverBodyPosition =
    Instance.new("BodyPosition")

hoverBodyPosition.Position =
    Vector3.new(30, 8, 12)

hoverBodyPosition.MaxForce =
    Vector3.new(100000, 100000, 100000)

hoverBodyPosition.P = 10000
hoverBodyPosition.D = 1250
hoverBodyPosition.Parent = hoverPlatform

-- One moving platform.
local mover = makePart(
    "MovingPlatform",
    Vector3.new(10, 1, 10),
    Vector3.new(30, 5, -5),
    "Bright violet",
    false,
    interactives
)

local moverVelocity =
    Instance.new("BodyVelocity")

moverVelocity.Velocity =
    Vector3.new(3, 0, 0)

moverVelocity.MaxForce =
    Vector3.new(50000, 50000, 50000)

moverVelocity.Parent = mover

spawn(function()
    while mover.Parent do
        wait(3)
        moverVelocity.Velocity =
            Vector3.new(-3, 0, 0)

        wait(3)
        moverVelocity.Velocity =
            Vector3.new(3, 0, 0)
    end
end)

-- One temporary debris object.
local debrisPart = makePart(
    "DebrisTest",
    Vector3.new(3, 3, 3),
    Vector3.new(0, 20, 28),
    "Bright yellow",
    false,
    tests
)

Debris:AddItem(
    debrisPart,
    12
)

-- =========================================================
-- BINDABLE / REMOTE TESTS
-- =========================================================

local bindable =
    Instance.new("BindableEvent")

bindable.Name = "MapEvent"
bindable.Parent = tests

bindable.Event:connect(function(message)
    print(
        "[BindableEvent]",
        message
    )
end)

bindable:Fire(
    "LITE showcase map finished creating."
)

local mathFunction =
    Instance.new("BindableFunction")

mathFunction.Name = "DoubleNumber"
mathFunction.Parent = tests

mathFunction.OnInvoke =
    function(value)
        return value * 2
    end

print(
    "[BindableFunction] 21 * 2 =",
    mathFunction:Invoke(21)
)

local remote =
    Instance.new("RemoteEvent")

remote.Name = "LocalRemoteTest"
remote.Parent = tests

remote.OnClientEvent:connect(function(message)
    print(
        "[RemoteEvent Client]",
        message
    )
end)

remote:FireClient(
    player,
    "Single-player RemoteEvent works."
)

local remoteFunction =
    Instance.new("RemoteFunction")

remoteFunction.Name = "LocalRemoteFunction"
remoteFunction.Parent = tests

remoteFunction.OnServerInvoke =
    function(plr, value)
        print(
            "[RemoteFunction Server] from",
            plr.Name,
            value
        )

        return value + 100
    end

print(
    "[RemoteFunction result]",
    remoteFunction:InvokeServer(25)
)

-- =========================================================
-- RAY / REGION TESTS
-- =========================================================

local downwardRay =
    Ray.new(
        Vector3.new(10, 60, 10),
        Vector3.new(0, -100, 0)
    )

local rayResult =
    workspace:FindPartOnRay(
        downwardRay,
        character
    )

-- Be defensive because Phase 3.5 ray-return behavior is still being tested.
if rayResult then
    print(
        "[Ray] Hit:",
        rayResult.PartName or "?",
        "at Y",
        rayResult.HitY or "?"
    )
else
    print(
        "[Ray] No valid Part returned"
    )
end

local plazaRegion =
    Region3.new(
        Vector3.new(-18, -2, -18),
        Vector3.new(18, 25, 18)
    )

local regionParts =
    workspace:FindPartsInRegion3(
        plazaRegion,
        character,
        50
    )

if regionParts then
    print(
        "[Region3] Parts around plaza:",
        regionParts.Count or 0
    )
else
    print(
        "[Region3] No result returned"
    )
end

local overlaps =
    workspace:GetPartsInPart(
        monument
    )

if overlaps then
    print(
        "[GetPartsInPart] Monument overlaps:",
        overlaps.Count or 0
    )
end

-- =========================================================
-- COLLECTION + VALUES
-- =========================================================

print(
    "[CollectionService] Monument landmark:",
    CollectionService:HasTag(
        monument,
        "Landmark"
    )
)

local landmarks =
    CollectionService:GetTagged(
        "Landmark"
    )

print(
    "[CollectionService] landmarks:",
    landmarks and landmarks.Count or 0
)

local stats =
    makeFolder(
        "MapStats",
        tests
    )

local mapName =
    Instance.new("StringValue")

mapName.Name = "MapName"
mapName.Value = "Classic City Lite"
mapName.Parent = stats

local visits =
    Instance.new("IntValue")

visits.Name = "Visits"
visits.Value = 1
visits.Parent = stats

visits.Changed:connect(function(value)
    print(
        "[ValueObject] Visits:",
        value
    )
end)

visits.Value = 2

-- =========================================================
-- HUMANOID / INPUT
-- =========================================================

humanoid.HealthChanged:connect(function(health)
    print(
        "[Humanoid] Health:",
        health
    )
end)

humanoid.StateChanged:connect(function(oldState, newState)
    print(
        "[Humanoid State]",
        oldState,
        "->",
        newState
    )
end)

local mouse =
    player:GetMouse()

mouse.Button1Down:connect(function()
    if mouse.Target then
        print(
            "[Mouse] Clicked:",
            mouse.Target.Name
        )

        local box =
            Instance.new("SelectionBox")

        box.Name = "ClickHighlight"
        box.Adornee = mouse.Target
        box.Color3 =
            Color3.fromRGB(
                255,
                255,
                0
            )

        box.Parent = mouse.Target

        Debris:AddItem(
            box,
            1.5
        )
    end
end)

UIS.InputBegan:connect(function(input, processed)
    if input.UserInputType ==
       Enum.UserInputType.Keyboard then

        if input.KeyCode ==
           Enum.KeyCode.E then

            print(
                "[UIS] E pressed - MoveTo test"
            )

            
        end
    end
end)

CAS:BindAction(
    "ShowMapInfo",

    function(actionName, state, input)
        if state ==
           Enum.UserInputState.Begin then

            print(
                "[CAS] Map:",
                mapName.Value,
                "| Landmarks:",
                CollectionService:GetTagged(
                    "Landmark"
                ).Count or 0
            )
        end
    end,

    false,

    Enum.KeyCode.F
)

-- =========================================================
-- CAMERA
-- =========================================================

local camera =
    workspace.CurrentCamera

camera.FieldOfView = 75
camera.CameraSubject = humanoid
camera.CameraType =
    Enum.CameraType.Custom

-- =========================================================
-- DONE
-- =========================================================

print(
    "=== Classic City LITE Loaded ==="
)

print(
    "Controls: Left click = highlight | E = MoveTo | F = info"
)

print(
    "Map loaded successfully."
)
