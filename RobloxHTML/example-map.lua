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

local sparkles = Instance.new("Sparkles")
sparkles.Parent = part2

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
    local explosion = Instance.new("Explosion")

    explosion.Position =
        hit.Position + Vector3.new(0, 2, 0)

    explosion.BlastRadius = 12
    explosion.BlastPressure = 500000
    explosion.DestroyJointRadiusPercent = 1
    explosion.Visible = true

    explosion.Parent = workspace

    local message = Instance.new("Message")
    message.Text = "Touched by: " .. hit.Name
    message.Parent = workspace

    wait(1)

    message:Remove()
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

for i = 1, 10 do
    local stare1 = Instance.new("Part")
    stare1.Name = "StarePart1"
    stare1.Size = Vector3.new(5,1,5)
    stare1.Position = Vector3.new(10,i*1.5,5)
    stare1.Anchored = true
    stare1.Parent = workspace
end

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

humanoid.Died:connect(function()
    print("Player died")
end)

local seat = Instance.new("Seat")
seat.Name = "TestSeat"
seat.Size = Vector3.new(4, 1, 2)
seat.Position = Vector3.new(0, 1, -10)
seat.Anchored = true
seat.Parent = workspace

local HUM = Instance.new("Humanoid")
HUM.Parent = seat


wait(5)
--[[
    Blox Emulation - Classic Feature Expansion Test
    Tests:

    1. Lighting
    2. TimeOfDay
    3. Fog
    4. Sky

    5. FindPartOnRay multi-return
    6. FindPartOnRayWithIgnoreList
    7. Region3

    8. Message / Hint
    9. TextButton.Style / Frame.Style
    10. Classic GUI

    11. BodyVelocity / BodyPosition / BodyGyro
    12. RocketPropulsion

    13. Weld / Snap / Glue / Motor
    14. MakeJoints / BreakJoints
    15. Explosion breaking joints

    16. Motor6D
]]

print("==========================================")
print(" Blox Classic Expansion Test Starting")
print("==========================================")

local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local Debris = game:GetService("Debris")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer

local function PASS(name)
    print("[PASS] " .. name)
end

local function FAIL(name, err)
    warn("[FAIL] " .. name .. " | " .. tostring(err))
end

local function TEST(name, callback)
    local ok, result = pcall(callback)

    if ok then
        PASS(name)
        return result
    else
        FAIL(name, result)
        return nil
    end
end

local function makePart(name, position, size, color)
    local p = Instance.new("Part")

    p.Name = name
    p.Position = position
    p.Size = size or Vector3.new(4, 1, 4)
    p.Anchored = true
    p.CanCollide = true

    if color then
        p.BrickColor = BrickColor.new(color)
    end

    p.Parent = workspace

    return p
end

-- =========================================================
-- 1. LIGHTING
-- =========================================================

TEST("Lighting service", function()

    assert(Lighting ~= nil)

    Lighting.Brightness = 1.5

    Lighting.Ambient =
        Color3.fromRGB(
            120,
            120,
            140
        )

    Lighting.OutdoorAmbient =
        Color3.fromRGB(
            150,
            150,
            160
        )

    print(
        "[Lighting]",
        "Brightness:",
        Lighting.Brightness
    )
end)

-- =========================================================
-- 2. TIME OF DAY
-- =========================================================

TEST("TimeOfDay", function()

    Lighting.TimeOfDay =
        "18:30:00"

    print(
        "[TimeOfDay]",
        Lighting.TimeOfDay
    )

    if Lighting.GetMinutesAfterMidnight then

        print(
            "[TimeOfDay] minutes:",
            Lighting:GetMinutesAfterMidnight()
        )

    end
end)

-- =========================================================
-- 3. FOG
-- =========================================================

TEST("Fog", function()

    Lighting.FogColor =
        Color3.fromRGB(
            170,
            180,
            195
        )

    Lighting.FogStart = 50
    Lighting.FogEnd = 250

    print(
        "[Fog]",
        Lighting.FogStart,
        Lighting.FogEnd
    )
end)

-- =========================================================
-- 4. SKY
-- =========================================================

TEST("Sky", function()

    local oldSky =
        Lighting:FindFirstChild(
            "ExpansionTestSky"
        )

    if oldSky then
        oldSky:Destroy()
    end

    local sky =
        Instance.new("Sky")

    sky.Name =
        "ExpansionTestSky"

    -- You can replace these with actual local asset paths
    -- supported by your emulator if desired.

    sky.CelestialBodiesShown = true
    sky.StarCount = 3000

    sky.Parent = Lighting

    assert(
        sky.Parent == Lighting
    )

    print(
        "[Sky] created:",
        sky.Name
    )
end)

-- =========================================================
-- RAY TEST AREA
-- =========================================================

local rayTarget =
    makePart(
        "RayTarget",
        Vector3.new(
            0,
            5,
            -30
        ),
        Vector3.new(
            12,
            10,
            2
        ),
        "Bright red"
    )

local rayIgnore =
    makePart(
        "RayIgnore",
        Vector3.new(
            0,
            5,
            -15
        ),
        Vector3.new(
            10,
            10,
            2
        ),
        "Bright yellow"
    )

-- =========================================================
-- 5. FINDPARTONRAY MULTI RETURN
-- =========================================================

TEST(
    "FindPartOnRay multi-return",
    function()

        local ray =
            Ray.new(
                Vector3.new(
                    0,
                    5,
                    0
                ),

                Vector3.new(
                    0,
                    0,
                    -100
                )
            )

        local hit,
              position =
            workspace:FindPartOnRay(
                ray
            )

        assert(
            hit ~= nil,
            "No part returned"
        )

        assert(
            position ~= nil,
            "No position returned"
        )

        print(
            "[Ray]",
            hit.Name,
            position
        )
    end
)

-- =========================================================
-- 6. FINDPARTONRAYWITHIGNORELIST
-- =========================================================

TEST(
    "FindPartOnRayWithIgnoreList",
    function()

        local ray =
            Ray.new(
                Vector3.new(
                    0,
                    5,
                    0
                ),

                Vector3.new(
                    0,
                    0,
                    -100
                )
            )

        local hit,
              position =
            workspace:
                FindPartOnRayWithIgnoreList(
                    ray,
                    {
                        rayIgnore
                    }
                )

        assert(
            hit ~= nil,
            "Nothing hit"
        )

        assert(
            hit ~= rayIgnore,
            "Ignore list failed"
        )

        print(
            "[IgnoreRay]",
            hit.Name,
            position
        )
    end
)

-- =========================================================
-- 7. REGION3
-- =========================================================

TEST(
    "Region3 behavior",
    function()

        local region =
            Region3.new(

                Vector3.new(
                    -20,
                    -5,
                    -45
                ),

                Vector3.new(
                    20,
                    20,
                    5
                )
            )

        local parts =
            workspace:
                FindPartsInRegion3(
                    region,
                    nil,
                    100
                )

        assert(
            parts ~= nil
        )

        print(
            "[Region3] count:",
            parts.Count or
            #parts or
            "?"
        )

        if workspace.IsRegion3Empty then

            print(
                "[Region3] Empty:",
                workspace:IsRegion3Empty(
                    region
                )
            )

        end
    end
)

-- =========================================================
-- 8. MESSAGE / HINT
-- =========================================================

TEST(
    "Message / Hint",
    function()

        local message =
            Instance.new("Message")

        message.Text =
            "Classic Message test!"

        message.Parent =
            workspace

        Debris:AddItem(
            message,
            3
        )

        local hint =
            Instance.new("Hint")

        hint.Text =
            "Classic Hint test!"

        hint.Parent =
            workspace

        Debris:AddItem(
            hint,
            5
        )
    end
)

-- =========================================================
-- 9 + 10. GUI / STYLES
-- =========================================================

TEST(
    "Classic GUI + styles",
    function()

        local gui =
            Instance.new(
                "ScreenGui"
            )

        gui.Name =
            "ClassicExpansionTestGui"

        gui.Parent =
            player.PlayerGui

        local frame =
            Instance.new(
                "Frame"
            )

        frame.Name =
            "ClassicWindow"

        frame.Position =
            UDim2.new(
                0,
                25,
                0,
                60
            )

        frame.Size =
            UDim2.new(
                0,
                260,
                0,
                140
            )

        frame.BackgroundColor3 =
            Color3.fromRGB(
                210,
                210,
                210
            )

        frame.Style =
            Enum.FrameStyle.RobloxSquare

        frame.Active = true
        frame.Draggable = true

        frame.Parent = gui

        local title =
            Instance.new(
                "TextLabel"
            )

        title.Position =
            UDim2.new(
                0,
                10,
                0,
                10
            )

        title.Size =
            UDim2.new(
                1,
                -20,
                0,
                30
            )

        title.Text =
            "Classic GUI Test"

        title.BackgroundTransparency =
            1

        title.Parent =
            frame

        local button =
            Instance.new(
                "TextButton"
            )

        button.Position =
            UDim2.new(
                0,
                40,
                0,
                65
            )

        button.Size =
            UDim2.new(
                0,
                180,
                0,
                40
            )

        button.Text =
            "Click Me"

        button.Style =
            Enum.ButtonStyle.RobloxButton

        button.AutoButtonColor =
            true

        button.Parent =
            frame

        button.MouseButton1Click:
            connect(function()

                print(
                    "[GUI] Button clicked"
                )

                button.Text =
                    "Works!"

            end)

        Debris:AddItem(
            gui,
            15
        )
    end
)

-- =========================================================
-- BODY MOVER AREA
-- =========================================================

local physicsBase =
    makePart(
        "BodyMoverFloor",
        Vector3.new(
            40,
            0,
            0
        ),
        Vector3.new(
            80,
            1,
            60
        ),
        "Dark stone grey"
    )

-- =========================================================
-- 11A. BODYVELOCITY
-- =========================================================

TEST(
    "BodyVelocity",
    function()

        local part =
            makePart(
                "BodyVelocityPart",
                Vector3.new(
                    20,
                    8,
                    0
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright blue"
            )

        part.Anchored = false

        local mover =
            Instance.new(
                "BodyVelocity"
            )

        mover.Velocity =
            Vector3.new(
                10,
                0,
                0
            )

        mover.MaxForce =
            Vector3.new(
                100000,
                100000,
                100000
            )

        mover.P = 1250

        mover.Parent =
            part

        Debris:AddItem(
            mover,
            4
        )

        Debris:AddItem(
            part,
            8
        )
    end
)

-- =========================================================
-- 11B. BODYPOSITION
-- =========================================================

TEST(
    "BodyPosition",
    function()

        local part =
            makePart(
                "BodyPositionPart",
                Vector3.new(
                    35,
                    4,
                    0
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright green"
            )

        part.Anchored = false

        local mover =
            Instance.new(
                "BodyPosition"
            )

        mover.Position =
            Vector3.new(
                35,
                15,
                0
            )

        mover.MaxForce =
            Vector3.new(
                100000,
                100000,
                100000
            )

        mover.P = 10000
        mover.D = 1250

        mover.Parent =
            part

        Debris:AddItem(
            mover,
            6
        )

        Debris:AddItem(
            part,
            8
        )
    end
)

-- =========================================================
-- 11C. BODYGYRO
-- =========================================================

TEST(
    "BodyGyro",
    function()

        local part =
            makePart(
                "BodyGyroPart",
                Vector3.new(
                    50,
                    8,
                    0
                ),
                Vector3.new(
                    8,
                    2,
                    4
                ),
                "Bright violet"
            )

        part.Anchored =
            false

        local gyro =
            Instance.new(
                "BodyGyro"
            )

        gyro.MaxTorque =
            Vector3.new(
                100000,
                100000,
                100000
            )

        gyro.P = 3000
        gyro.D = 500

        gyro.CFrame =
            CFrame.Angles(
                0,
                math.rad(90),
                0
            )

        gyro.Parent =
            part

        Debris:AddItem(
            gyro,
            6
        )

        Debris:AddItem(
            part,
            8
        )
    end
)

-- =========================================================
-- 12. ROCKETPROPULSION
-- =========================================================

TEST(
    "RocketPropulsion",
    function()

        local rocket =
            makePart(
                "RocketPart",
                Vector3.new(
                    65,
                    8,
                    0
                ),
                Vector3.new(
                    5,
                    3,
                    8
                ),
                "Bright red"
            )

        rocket.Anchored =
            false

        local target =
            makePart(
                "RocketTarget",
                Vector3.new(
                    65,
                    15,
                    -35
                ),
                Vector3.new(
                    3,
                    3,
                    3
                ),
                "Bright yellow"
            )

        target.CanCollide =
            false

        local propulsion =
            Instance.new(
                "RocketPropulsion"
            )

        propulsion.Target =
            target

        propulsion.MaxSpeed =
            35

        propulsion.MaxThrust =
            10000

        propulsion.ThrustP =
            500

        propulsion.ThrustD =
            50

        propulsion.TurnP =
            3000

        propulsion.TurnD =
            500

        propulsion.TargetRadius =
            4

        propulsion.Parent =
            rocket

        propulsion.ReachedTarget:
            connect(function()

                print(
                    "[Rocket] Reached target"
                )

            end)

        propulsion:Fire()

        Debris:AddItem(
            rocket,
            12
        )

        Debris:AddItem(
            target,
            12
        )
    end
)

-- =========================================================
-- 13. WELD
-- =========================================================

TEST(
    "Weld",
    function()

        local a =
            makePart(
                "WeldA",
                Vector3.new(
                    -40,
                    8,
                    15
                ),
                Vector3.new(
                    5,
                    5,
                    5
                ),
                "Bright blue"
            )

        local b =
            makePart(
                "WeldB",
                Vector3.new(
                    -34,
                    8,
                    15
                ),
                Vector3.new(
                    5,
                    5,
                    5
                ),
                "Bright green"
            )

        a.Anchored =
            true

        b.Anchored =
            false

        local weld =
            Instance.new(
                "Weld"
            )

        weld.Part0 = a
        weld.Part1 = b

        weld.C0 =
            CFrame.new(
                3,
                0,
                0
            )

        weld.C1 =
            CFrame.new(
                -3,
                0,
                0
            )

        weld.Parent =
            a

        Debris:AddItem(
            a,
            12
        )

        Debris:AddItem(
            b,
            12
        )
    end
)

-- =========================================================
-- 13. SNAP
-- =========================================================

TEST(
    "Snap",
    function()

        local a =
            makePart(
                "SnapA",
                Vector3.new(
                    -40,
                    8,
                    30
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright yellow"
            )

        local b =
            makePart(
                "SnapB",
                Vector3.new(
                    -35,
                    8,
                    30
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright red"
            )

        local joint =
            Instance.new("Snap")

        joint.Part0 = a
        joint.Part1 = b
        joint.Parent = a
    end
)

-- =========================================================
-- 13. GLUE
-- =========================================================

TEST(
    "Glue",
    function()

        local a =
            makePart(
                "GlueA",
                Vector3.new(
                    -20,
                    8,
                    30
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright orange"
            )

        local b =
            makePart(
                "GlueB",
                Vector3.new(
                    -15,
                    8,
                    30
                ),
                Vector3.new(
                    4,
                    4,
                    4
                ),
                "Bright blue"
            )

        local glue =
            Instance.new("Glue")

        glue.Part0 = a
        glue.Part1 = b

        glue.Parent = a
    end
)

-- =========================================================
-- 13. MOTOR
-- =========================================================

TEST(
    "Motor",
    function()

        local base =
            makePart(
                "MotorBase",
                Vector3.new(
                    0,
                    10,
                    35
                ),
                Vector3.new(
                    5,
                    5,
                    5
                ),
                "Medium stone grey"
            )

        local arm =
            makePart(
                "MotorArm",
                Vector3.new(
                    6,
                    10,
                    35
                ),
                Vector3.new(
                    7,
                    2,
                    2
                ),
                "Bright blue"
            )

        base.Anchored = true
        arm.Anchored = false

        local motor =
            Instance.new("Motor")

        motor.Part0 = base
        motor.Part1 = arm

        motor.CurrentAngle = 0
        motor.DesiredAngle =
            math.rad(90)

        motor.MaxVelocity =
            math.rad(90)

        motor.Parent = base
    end
)

-- =========================================================
-- 14. MAKEJOINTS / BREAKJOINTS
-- =========================================================

TEST(
    "MakeJoints / BreakJoints",
    function()

        local a =
            makePart(
                "MakeJointA",
                Vector3.new(
                    20,
                    12,
                    35
                ),
                Vector3.new(
                    6,
                    6,
                    6
                ),
                "Bright red"
            )

        local b =
            makePart(
                "MakeJointB",
                Vector3.new(
                    26,
                    12,
                    35
                ),
                Vector3.new(
                    6,
                    6,
                    6
                ),
                "Bright green"
            )

        a.RightSurface =
            Enum.SurfaceType.Weld

        b.LeftSurface =
            Enum.SurfaceType.Weld

        a:MakeJoints()

        print(
            "[MakeJoints] called"
        )

        delay(
            4,
            function()

                a:BreakJoints()

                print(
                    "[BreakJoints] called"
                )

            end
        )
    end
)

-- =========================================================
-- 15. EXPLOSION BREAKING JOINTS
-- =========================================================

TEST(
    "Explosion joint breaking",
    function()

        local base =
            makePart(
                "ExplodeJointBase",
                Vector3.new(
                    45,
                    6,
                    35
                ),
                Vector3.new(
                    6,
                    6,
                    6
                ),
                "Dark stone grey"
            )

        local attached =
            makePart(
                "ExplodeJointAttached",
                Vector3.new(
                    51,
                    6,
                    35
                ),
                Vector3.new(
                    6,
                    6,
                    6
                ),
                "Bright red"
            )

        base.Anchored =
            true

        attached.Anchored =
            false

        local weld =
            Instance.new("Weld")

        weld.Part0 = base
        weld.Part1 = attached
        weld.Parent = base

        delay(
            2,
            function()

                local explosion =
                    Instance.new(
                        "Explosion"
                    )

                explosion.Position =
                    Vector3.new(
                        48,
                        6,
                        35
                    )

                explosion.BlastRadius =
                    12

                explosion.BlastPressure =
                    500000

                explosion.Parent =
                    workspace

                print(
                    "[Explosion] fired"
                )

            end
        )
    end
)

-- =========================================================
-- 16. MOTOR6D
-- =========================================================

TEST(
    "Motor6D",
    function()

        local torso =
            makePart(
                "Motor6DTorso",
                Vector3.new(
                    70,
                    10,
                    35
                ),
                Vector3.new(
                    6,
                    6,
                    4
                ),
                "Bright blue"
            )

        local limb =
            makePart(
                "Motor6DLimb",
                Vector3.new(
                    75,
                    10,
                    35
                ),
                Vector3.new(
                    3,
                    7,
                    3
                ),
                "Bright yellow"
            )

        torso.Anchored =
            true

        limb.Anchored =
            false

        local joint =
            Instance.new(
                "Motor6D"
            )

        joint.Name =
            "ShoulderTest"

        joint.Part0 =
            torso

        joint.Part1 =
            limb

        joint.C0 =
            CFrame.new(
                3,
                0,
                0
            )

        joint.C1 =
            CFrame.new(
                -1.5,
                0,
                0
            )

        joint.CurrentAngle =
            0

        joint.DesiredAngle =
            math.rad(
                90
            )

        joint.MaxVelocity =
            math.rad(
                45
            )

        joint.Parent =
            torso

        print(
            "[Motor6D]",
            joint.Name
        )
    end
)

-- =========================================================
-- RUNSERVICE YIELD TEST
-- =========================================================

TEST(
    "RunService yielding",
    function()

        local connection
        local executions = 0

        connection =
            RunService.Heartbeat:
                connect(function(dt)

                    executions =
                        executions + 1

                    if executions <= 3 then

                        print(
                            "[Heartbeat]",
                            executions,
                            dt
                        )

                    end

                    wait(0.25)

                    if executions >= 5 then

                        connection:
                            Disconnect()

                        print(
                            "[Heartbeat] yield test complete"
                        )

                    end
                end)
    end
)

-- =========================================================
-- FINAL
-- =========================================================

print("")
print("==========================================")
print(" All expansion tests were created.")
print("")
print(" Watch the world for about 15 seconds.")
print(" Check console for [PASS] and runtime output.")
print("==========================================")