(function (global) {
    "use strict";

    // index.html also loads this file for BloxMapStorage. Only emulator.html
    // owns the client loading screen and is allowed to auto-start its gate.
    const autoShowClientGate =
        document.currentScript?.dataset?.bloxEmulator === "true";

    const DB_NAME = "BloxEmulationMapDB";
    const DB_VERSION = 1;
    const STORE_NAME = "maps";
    const CURRENT_KEY = "current";
    const TEXT_DECODER = new TextDecoder("utf-8");

    const SERVICE_CLASSES = new Set([
        "DataModel", "Workspace", "Lighting", "StarterGui", "StarterPack", "StarterPlayer",
        "Teams", "SoundService", "ReplicatedStorage", "ReplicatedFirst",
        "ServerStorage", "ServerScriptService", "Players", "Chat", "RunService",
        "Debris", "InsertService", "CollectionService", "UserInputService",
        "ContextActionService"
    ]);

    const PART_CLASSES = new Set([
        "Part", "WedgePart", "CornerWedgePart", "TrussPart", "Seat", "VehicleSeat",
        "SpawnLocation", "MeshPart", "UnionOperation", "NegateOperation"
    ]);

    const CONNECTOR_CLASSES = new Set([
        "Weld", "Snap", "Glue", "Motor", "Motor6D", "Rotate", "RotateP", "RotateV",
        "VelocityMotor", "ManualWeld", "ManualGlue", "WeldConstraint", "HingeConstraint", "RodConstraint",
        "RopeConstraint", "SpringConstraint", "BallSocketConstraint", "PrismaticConstraint",
        "CylindricalConstraint"
    ]);

    const SUPPORTED_INSTANCE_CLASSES = new Set([
        "Part", "WedgePart", "CornerWedgePart", "TrussPart", "SpawnLocation", "Seat", "VehicleSeat", "Model", "Folder", "Backpack",
        "Tool", "HopperBin", "Humanoid", "HumanoidDescription", "BodyColors", "Shirt",
        "Pants", "ShirtGraphic", "Sound", "PointLight", "SpotLight", "SurfaceLight", "ForceField", "ClickDetector", "Sparkles",
        "Message", "Hint", "Sky", "Team", "Decal", "Texture", "ParticleEmitter", "Fire", "Smoke", "ScreenGui", "SurfaceGui",
        "Frame", "TextLabel", "TextButton", "TextBox", "ImageButton", "BillboardGui", "ScrollingFrame",
        "ImageLabel", "UIListLayout", "UIGridLayout", "UITableLayout", "UIPadding", "UIScale", "UIAspectRatioConstraint", "UISizeConstraint", "UITextSizeConstraint", "Explosion", "Terrain", "SelectionBox", "SelectionSphere", "SurfaceSelection",
        "Configuration", "SpecialMesh", "FileMesh", "BlockMesh", "CylinderMesh", "BindableEvent",
        "BindableFunction", "Weld", "Motor", "Motor6D", "Rotate", "RotateP", "RotateV", "VelocityMotor", "Snap",
        "Glue", "ManualWeld", "ManualGlue", "BodyVelocity", "BodyPosition", "BodyGyro", "BodyForce",
        "BodyAngularVelocity", "BodyThrust", "RocketPropulsion", "IntValue", "NumberValue",
        "BoolValue", "StringValue", "ObjectValue", "Vector3Value", "CFrameValue", "Color3Value",
        "BrickColorValue", "Script", "LocalScript", "ModuleScript"
    ]);

    // Properties that are useful to the emulator. Unknown properties are omitted instead of
    // spending thousands of assignments on metadata that the classic runtime cannot render/use.
    const COMMON_PROPERTIES = new Set([
        "Name", "Archivable", "Value", "Enabled", "Disabled", "Neutral", "Duration",
        "Source", "RunContext", "LinkedSource",
        "TeamColor", "AutoAssignable", "AllowTeamChangeOnTouch", "Transparency", "Reflectance",
        "Anchored", "CanCollide", "CanTouch", "CanQuery", "Locked", "Shape", "FormFactor",
        "CastShadow", "Massless", "CollisionGroup", "CollisionGroupId", "RootPriority",
        "Material", "MaterialVariant", "Friction", "Elasticity", "SpecificGravity", "CustomPhysicalProperties",
        "Size", "Position", "Orientation", "CFrame", "Color", "Color3", "BrickColor",
        "Velocity", "RotVelocity", "AssemblyLinearVelocity", "AssemblyAngularVelocity",
        "TopSurface", "BottomSurface", "LeftSurface", "RightSurface", "FrontSurface", "BackSurface",
        "Health", "MaxHealth", "WalkSpeed", "JumpPower", "Jump", "Sit", "PlatformStand", "AutoRotate",
        "SoundId", "Volume", "Looped", "PlaybackSpeed", "Pitch", "TimePosition",
        "Range", "Angle", "Shadows", "Heat", "SecondaryColor",
        "Texture", "TextureId", "TextureID", "MeshId", "MeshType", "Scale", "Offset", "VertexColor",
        "Face", "StudsPerTileU", "StudsPerTileV", "ZIndex",
        "Text", "TextColor3", "TextTransparency", "TextScaled", "TextWrapped", "TextXAlignment",
        "TextYAlignment", "Font", "BackgroundColor3", "BackgroundTransparency", "BorderColor3",
        "BorderSizePixel", "Visible", "Active", "Draggable", "Image", "ImageColor3", "ImageTransparency",
        "TextSize", "TextStrokeColor3", "TextStrokeTransparency", "TextWrap", "FontSize", "ClearTextOnFocus", "MultiLine",
        "ImageRectOffset", "ImageRectSize", "ScaleType", "SliceCenter", "TileSize", "AutoButtonColor", "Selected",
        "DisplayOrder", "ResetOnSpawn", "IgnoreGuiInset", "AlwaysOnTop", "Adornee", "CanvasSize", "CanvasPosition", "ScrollBarThickness", "ScrollingEnabled", "ClipsDescendants", "ClipDescendants", "LayoutOrder", "Selectable",
        "AnchorPoint", "AutomaticSize", "SizeConstraint", "Rotation", "Modal", "Interactable",
        "Rate", "Lifetime", "Speed", "SpreadAngle", "Rotation", "RotSpeed", "LightEmission", "Acceleration", "Drag", "VelocityInheritance", "ZOffset",
        "Rotation", "Ambient", "OutdoorAmbient", "Brightness", "ClockTime", "TimeOfDay", "FogStart",
        "FogEnd", "FogColor", "GlobalShadows", "GeographicLatitude", "SkyboxBk", "SkyboxDn", "SkyboxFt",
        "SkyboxLf", "SkyboxRt", "SkyboxUp", "CelestialBodiesShown", "StarCount", "MoonAngularSize",
        "SunAngularSize", "ShirtTemplate", "PantsTemplate", "Graphic", "HeadColor", "TorsoColor",
        "LeftArmColor", "RightArmColor", "LeftLegColor", "RightLegColor", "MaxForce", "P", "D",
        "MaxTorque", "Force", "AngularVelocity", "Location", "CartoonFactor", "MaxSpeed", "MaxThrust",
        "TargetOffset", "TargetRadius", "ThrustD", "ThrustP", "TurnD", "TurnP", "C0", "C1",
        "DesiredAngle", "CurrentAngle", "MaxVelocity", "BaseAngle",
        "Surface0", "Surface1", "F0", "F1", "F2", "F3", "Hole",
        "Part0", "Part1", "PrimaryPart", "Adornee",
        "Target", "WalkToPart", "Object", "CameraSubject",
        // Classic + newer BackpackItem/Tool serialization. These are required by
        // old rocket/sword tools and are intentionally preserved even when the
        // renderer does not use every field directly.
        "Grip", "GripPos", "GripForward", "GripRight", "GripUp", "ToolTip",
        "CanBeDropped", "RequiresHandle", "ManualActivationOnly", "BinType",
        "MaxActivationDistance", "CursorIcon"
    ]);

    const REF_PROPERTIES = new Set([
        "Part0", "Part1", "Hole", "PrimaryPart", "Adornee", "Target", "WalkToPart", "Object", "CameraSubject"
    ]);

    // Source containers, ValueBase instances, and serialized references must
    // survive even when a property is not part of the renderer-facing common
    // surface. Keeping this separate makes the large-map filter explicit and
    // prevents a future COMMON_PROPERTIES cleanup from disabling scripts,
    // values, or object links.
    const ALWAYS_IMPORT_PROPERTIES = new Set([
        "Name", "Source", "LinkedSource", "Value"
    ]);

    function shouldImportProperty(name, wrapped) {
        return COMMON_PROPERTIES.has(name) ||
            ALWAYS_IMPORT_PROPERTIES.has(name) ||
            REF_PROPERTIES.has(name) ||
            wrapped?.kind === "ref";
    }

    // Roblox has changed a number of serialized property names over the years.
    // Normalize those storage names to the API exposed by this emulator.
    // Examples:
    //   old RBXLX:  <Vector3 name="size">      -> Part.Size
    //   old RBXLX:  <token name="shape">       -> Part.Shape
    //   old RBXLX:  <token name="formFactorRaw"> -> Part.FormFactor
    //   modern:     Color3uint8                 -> Part.Color
    const PROPERTY_ALIASES = new Map([
        ["size", "Size"],
        ["shape", "Shape"],
        ["formFactorRaw", "FormFactor"],
        ["formfactorraw", "FormFactor"],
        ["Color3uint8", "Color"],
        ["color3uint8", "Color"],
        ["color", "Color"],
        ["AssemblyLinearVelocity", "Velocity"],
        ["AssemblyAngularVelocity", "RotVelocity"],
        ["TextureID", "TextureId"],
        ["part0", "Part0"],
        ["part1", "Part1"],
        ["hole", "Hole"],
        ["c0", "C0"],
        ["c1", "C1"],
        ["surface0", "Surface0"],
        ["surface1", "Surface1"],
        ["f0", "F0"],
        ["f1", "F1"],
        ["f2", "F2"],
        ["f3", "F3"],
        ["baseAngle", "BaseAngle"],
        ["baseangle", "BaseAngle"],
        ["desiredAngle", "DesiredAngle"],
        ["desiredangle", "DesiredAngle"],
        ["currentAngle", "CurrentAngle"],
        ["currentangle", "CurrentAngle"],
        ["maxVelocity", "MaxVelocity"],
        ["maxvelocity", "MaxVelocity"],
        ["anchored", "Anchored"],
        ["velocity", "Velocity"],
        ["rotVelocity", "RotVelocity"],
        ["rotvelocity", "RotVelocity"],
        ["material", "Material"],
        ["soundId", "SoundId"],
        ["soundid", "SoundId"],
        ["playbackSpeed", "PlaybackSpeed"],
        ["playbackspeed", "PlaybackSpeed"],
        ["rollOffMinDistance", "MinDistance"],
        ["rolloffmindistance", "MinDistance"],
        ["rollOffMaxDistance", "MaxDistance"],
        ["rolloffmaxdistance", "MaxDistance"],
        ["emitterSize", "EmitterSize"],
        ["emittersize", "EmitterSize"]
    ]);

    function normalizePropertyName(name) {
        const text=String(name || "");
        return PROPERTY_ALIASES.get(text) || text;
    }

    const TOKEN_ENUMS = {
        Shape: ["Ball", "Block", "Cylinder", "Wedge"],
        FormFactor: ["Symmetric", "Brick", "Plate", "Custom"],
        TopSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        BottomSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        LeftSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        RightSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        FrontSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        BackSurface: ["Smooth", "Glue", "Weld", "Studs", "Inlet", "Universal", "Hinge", "Motor", "SteppingMotor", "SmoothNoOutlines"],
        Face: ["Right", "Top", "Back", "Left", "Bottom", "Front"],
        // Roblox Enum.MeshType serialized token values. Keep this exact: old
        // places store the numeric token, and treating 5 as Cylinder instead
        // of FileMesh prevents their MeshId geometry from appearing.
        MeshType: [
            "Head", "Torso", "Wedge", "Sphere", "Cylinder", "FileMesh", "Brick",
            "Prism", "Pyramid", "ParallelRamp", "RightAngleRamp", "CornerWedge"
        ],
        BinType: ["Script", "GameTool", "Grab", "Clone", "Hammer"]
    };


    const MATERIAL_TOKENS = new Map([
        [256,"Plastic"],[272,"SmoothPlastic"],[288,"Neon"],
        [512,"Wood"],[528,"WoodPlanks"],
        [784,"Marble"],[788,"Basalt"],[800,"Slate"],[804,"CrackedLava"],
        [816,"Concrete"],[820,"Limestone"],[832,"Granite"],[836,"Pavement"],
        [848,"Brick"],[864,"Pebble"],[880,"Cobblestone"],[896,"Rock"],[912,"Sandstone"],
        [1040,"CorrodedMetal"],[1056,"DiamondPlate"],[1072,"Foil"],[1088,"Metal"],
        [1280,"Grass"],[1284,"LeafyGrass"],[1296,"Sand"],[1312,"Fabric"],
        [1328,"Snow"],[1344,"Mud"],[1360,"Ground"],[1376,"Asphalt"],[1392,"Salt"],
        [1536,"Ice"],[1552,"Glacier"],[1568,"Glass"],[1584,"ForceField"],
        [1792,"Air"],[2048,"Water"]
    ]);

    const ROTATION_IDS = new Map([
        [0x02,[1,0,0,0,1,0,0,0,1]], [0x03,[1,0,0,0,0,-1,0,1,0]],
        [0x05,[1,0,0,0,-1,0,0,0,-1]], [0x06,[1,0,0,0,0,1,0,-1,0]],
        [0x07,[0,1,0,1,0,0,0,0,-1]], [0x09,[0,0,1,1,0,0,0,1,0]],
        [0x0A,[0,-1,0,1,0,0,0,0,1]], [0x0C,[0,0,-1,1,0,0,0,-1,0]],
        [0x0D,[0,1,0,0,0,1,1,0,0]], [0x0E,[0,0,-1,0,1,0,1,0,0]],
        [0x10,[0,-1,0,0,0,-1,1,0,0]], [0x11,[0,0,1,0,-1,0,1,0,0]],
        [0x14,[-1,0,0,0,1,0,0,0,-1]], [0x15,[-1,0,0,0,0,1,0,1,0]],
        [0x17,[-1,0,0,0,-1,0,0,0,1]], [0x18,[-1,0,0,0,0,-1,0,-1,0]],
        [0x19,[0,1,0,-1,0,0,0,0,1]], [0x1B,[0,0,-1,-1,0,0,0,1,0]],
        [0x1C,[0,-1,0,-1,0,0,0,0,-1]], [0x1E,[0,0,1,-1,0,0,0,-1,0]],
        [0x1F,[0,1,0,0,0,-1,-1,0,0]], [0x20,[0,0,1,0,1,0,-1,0,0]],
        [0x22,[0,-1,0,0,0,1,-1,0,0]], [0x23,[0,0,-1,0,-1,0,-1,0,0]]
    ]);

    function extOf(name) {
        const m = /\.([^.]+)$/.exec(String(name || ""));
        return m ? m[1].toLowerCase() : "";
    }

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE_NAME)) {
                    req.result.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
        });
    }

    async function dbPut(value) {
        const db = await openDB();
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                tx.objectStore(STORE_NAME).put(value, CURRENT_KEY);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error || new Error("Map storage write failed"));
                tx.onabort = () => reject(tx.error || new Error("Map storage write aborted"));
            });
        } finally {
            db.close();
        }
    }

    async function dbGet() {
        const db = await openDB();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const req = tx.objectStore(STORE_NAME).get(CURRENT_KEY);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error || new Error("Map storage read failed"));
            });
        } finally {
            db.close();
        }
    }

    async function dbDelete() {
        try {
            const db = await openDB();
            try {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, "readwrite");
                    tx.objectStore(STORE_NAME).delete(CURRENT_KEY);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
            } finally { db.close(); }
        } catch (error) {
            console.warn("[RBX Loader] Could not clear map storage:", error);
        }
    }

    const Storage = {
        async saveFile(file) {
            const buffer = await file.arrayBuffer();
            const record = {
                name: file.name,
                ext: extOf(file.name),
                type: file.type || "application/octet-stream",
                size: file.size,
                modified: file.lastModified || Date.now(),
                buffer
            };
            await dbPut(record);
            return record;
        },
        loadCurrent: dbGet,
        clearCurrent: dbDelete
    };

    class Reader {
        constructor(bytes) {
            this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
            this.pos = 0;
        }
        remaining() { return this.bytes.length - this.pos; }
        ensure(n) { if (this.pos + n > this.bytes.length) throw new Error("Unexpected end of RBXL data"); }
        u8() { this.ensure(1); return this.bytes[this.pos++]; }
        u16le() { this.ensure(2); const v=this.view.getUint16(this.pos,true); this.pos+=2; return v; }
        i16le() { this.ensure(2); const v=this.view.getInt16(this.pos,true); this.pos+=2; return v; }
        u32le() { this.ensure(4); const v=this.view.getUint32(this.pos,true); this.pos+=4; return v; }
        i32le() { this.ensure(4); const v=this.view.getInt32(this.pos,true); this.pos+=4; return v; }
        u32be() { this.ensure(4); const v=this.view.getUint32(this.pos,false); this.pos+=4; return v; }
        f32le() { this.ensure(4); const v=this.view.getFloat32(this.pos,true); this.pos+=4; return v; }
        f64le() { this.ensure(8); const v=this.view.getFloat64(this.pos,true); this.pos+=8; return v; }
        bytesN(n) { this.ensure(n); const v=this.bytes.subarray(this.pos,this.pos+n); this.pos+=n; return v; }
        str() { const n=this.u32le(); return TEXT_DECODER.decode(this.bytesN(n)); }
    }

    function lz4Decompress(src, expectedLength) {
        const input = src instanceof Uint8Array ? src : new Uint8Array(src);
        const out = new Uint8Array(expectedLength);
        let ip=0, op=0;
        while (ip < input.length) {
            const token=input[ip++];
            let literalLen=token>>>4;
            if (literalLen===15) {
                let b=255;
                while (b===255) { if(ip>=input.length) throw new Error("Invalid LZ4 literal length"); b=input[ip++]; literalLen+=b; }
            }
            if (ip+literalLen>input.length || op+literalLen>out.length) throw new Error("Invalid LZ4 literal copy");
            out.set(input.subarray(ip,ip+literalLen),op); ip+=literalLen; op+=literalLen;
            if (ip>=input.length) break;
            if (ip+2>input.length) throw new Error("Invalid LZ4 offset");
            const offset=input[ip] | (input[ip+1]<<8); ip+=2;
            if (!offset || offset>op) throw new Error("Invalid LZ4 match offset");
            let matchLen=(token&15)+4;
            if ((token&15)===15) {
                let b=255;
                while (b===255) { if(ip>=input.length) throw new Error("Invalid LZ4 match length"); b=input[ip++]; matchLen+=b; }
            }
            if (op+matchLen>out.length) throw new Error("Invalid LZ4 match copy");
            let ref=op-offset;
            for (let i=0;i<matchLen;i++) out[op++]=out[ref++];
        }
        if (op !== expectedLength) {
            if (op > expectedLength) throw new Error("LZ4 output exceeded expected size");
            return out.subarray(0,op);
        }
        return out;
    }

    function deinterleave(bytes, count, width) {
        if (bytes.length < count*width) throw new Error("Interleaved RBXL data is truncated");
        const out=new Uint8Array(count*width);
        for(let byte=0;byte<width;byte++) {
            const base=byte*count;
            for(let i=0;i<count;i++) out[i*width+byte]=bytes[base+i];
        }
        return out;
    }

    function zigzag32(u) { return (u>>>1) ^ -(u&1); }
    function rotateFloatBits(encoded) {
        const bits=((encoded>>>1) | ((encoded&1)<<31))>>>0;
        const b=new ArrayBuffer(4), v=new DataView(b); v.setUint32(0,bits,false); return v.getFloat32(0,false);
    }

    function readInterleavedU32(r,count) {
        const b=deinterleave(r.bytesN(count*4),count,4), v=new DataView(b.buffer,b.byteOffset,b.byteLength), out=[];
        for(let i=0;i<count;i++) out.push(v.getUint32(i*4,false));
        return out;
    }
    function readInterleavedI32Zig(r,count) { return readInterleavedU32(r,count).map(zigzag32); }
    function readInterleavedFloat(r,count) { return readInterleavedU32(r,count).map(rotateFloatBits); }
    function readReferences(r,count) {
        const diffs=readInterleavedI32Zig(r,count), out=[]; let prev=0;
        for(const d of diffs){ const value=prev+d; out.push(value); prev=value; }
        return out;
    }
    function readVectorInterleaved(r,count,components) {
        const raw=readInterleavedFloat(r,count*components), out=[];
        // For struct arrays (~12 etc), byte interleaving spans the entire structure array,
        // but values are laid out component-wise after deinterleave. Read directly per struct.
        for(let i=0;i<count;i++) {
            const base=i*components;
            out.push(raw.slice(base,base+components));
        }
        return out;
    }

    function matrixToEulerXYZ(m) {
        if (!m || m.length<9) return {x:0,y:0,z:0};
        const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
        const r00=m[0],r01=m[1],r02=m[2],r11=m[4],r12=m[5],r21=m[7],r22=m[8];
        const y=Math.asin(clamp(r02,-1,1));
        let x,z;
        if (Math.abs(r02)<0.9999999) { x=Math.atan2(-r12,r22); z=Math.atan2(-r01,r00); }
        else { x=Math.atan2(r21,r11); z=0; }
        const d=180/Math.PI;
        return {x:x*d,y:y*d,z:z*d};
    }

    function quatToMatrix(x,y,z,w) {
        const xx=x*x, yy=y*y, zz=z*z, xy=x*y, xz=x*z, yz=y*z, wx=w*x, wy=w*y, wz=w*z;
        return [
            1-2*(yy+zz), 2*(xy-wz), 2*(xz+wy),
            2*(xy+wz), 1-2*(xx+zz), 2*(yz-wx),
            2*(xz-wy), 2*(yz+wx), 1-2*(xx+yy)
        ];
    }

    function parseBinaryValues(payload, count, sharedStrings) {
        const r=new Reader(payload), type=r.u8();
        const V=(kind,value)=>({kind,value});
        try {
            switch(type) {
                case 0x01: { const a=[]; for(let i=0;i<count;i++) a.push(V("string",r.str())); return a; }
                case 0x02: { const a=[]; for(let i=0;i<count;i++) a.push(V("bool",!!r.u8())); return a; }
                case 0x03: return readInterleavedI32Zig(r,count).map(x=>V("number",x));
                case 0x04: return readInterleavedFloat(r,count).map(x=>V("number",x));
                case 0x05: { const a=[]; for(let i=0;i<count;i++) a.push(V("number",r.f64le())); return a; }
                case 0x06: {
                    const b=deinterleave(r.bytesN(count*8),count,8), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++){ const enc=vr.u32be(), off=zigzag32(vr.u32be()); a.push(V("udim",{scale:rotateFloatBits(enc),offset:off})); } return a;
                }
                case 0x07: {
                    const b=deinterleave(r.bytesN(count*16),count,16), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++){ const sx=rotateFloatBits(vr.u32be()), sy=rotateFloatBits(vr.u32be()), ox=zigzag32(vr.u32be()), oy=zigzag32(vr.u32be()); a.push(V("udim2",{sx,ox,sy,oy})); } return a;
                }
                case 0x08: { const a=[]; for(let i=0;i<count;i++) a.push(V("ray",{origin:{x:r.f32le(),y:r.f32le(),z:r.f32le()},direction:{x:r.f32le(),y:r.f32le(),z:r.f32le()}})); return a; }
                case 0x09: { const a=[]; for(let i=0;i<count;i++) a.push(V("faces",r.u8())); return a; }
                case 0x0A: { const a=[]; for(let i=0;i<count;i++) a.push(V("axes",r.u8())); return a; }
                case 0x0B: return readInterleavedU32(r,count).map(x=>V("brickcolor",x));
                case 0x0C: {
                    const b=deinterleave(r.bytesN(count*12),count,12), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++) a.push(V("color3",{r:rotateFloatBits(vr.u32be()),g:rotateFloatBits(vr.u32be()),b:rotateFloatBits(vr.u32be())})); return a;
                }
                case 0x0D: {
                    const b=deinterleave(r.bytesN(count*8),count,8), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++) a.push(V("vector2",{x:rotateFloatBits(vr.u32be()),y:rotateFloatBits(vr.u32be())})); return a;
                }
                case 0x0E: {
                    const b=deinterleave(r.bytesN(count*12),count,12), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++) a.push(V("vector3",{x:rotateFloatBits(vr.u32be()),y:rotateFloatBits(vr.u32be()),z:rotateFloatBits(vr.u32be())})); return a;
                }
                case 0x0F: { const a=[]; for(let i=0;i<count;i++) a.push(V("vector2",{x:r.i16le(),y:r.i16le()})); return a; }
                case 0x10: {
                    const rotations=[];
                    for(let i=0;i<count;i++){
                        const id=r.u8(); let m;
                        if(id===0){ m=[]; for(let j=0;j<9;j++) m.push(r.f32le()); }
                        else m=ROTATION_IDS.get(id) || [1,0,0,0,1,0,0,0,1];
                        rotations.push(m);
                    }
                    const posBytes=deinterleave(r.bytesN(count*12),count,12), pr=new Reader(posBytes), positions=[];
                    for(let i=0;i<count;i++) positions.push({x:rotateFloatBits(pr.u32be()),y:rotateFloatBits(pr.u32be()),z:rotateFloatBits(pr.u32be())});
                    return rotations.map((m,i)=>V("cframe",{position:positions[i],matrix:m,orientation:matrixToEulerXYZ(m)}));
                }
                case 0x11: {
                    const rotations=[];
                    for(let i=0;i<count;i++){
                        const id=r.u8(); let m;
                        if(id===0) m=quatToMatrix(r.f32le(),r.f32le(),r.f32le(),r.f32le());
                        else m=ROTATION_IDS.get(id)||[1,0,0,0,1,0,0,0,1];
                        rotations.push(m);
                    }
                    const posBytes=deinterleave(r.bytesN(count*12),count,12), pr=new Reader(posBytes), positions=[];
                    for(let i=0;i<count;i++) positions.push({x:rotateFloatBits(pr.u32be()),y:rotateFloatBits(pr.u32be()),z:rotateFloatBits(pr.u32be())});
                    return rotations.map((m,i)=>V("cframe",{position:positions[i],matrix:m,orientation:matrixToEulerXYZ(m)}));
                }
                case 0x12: return readInterleavedU32(r,count).map(x=>V("token",x));
                case 0x13: return readReferences(r,count).map(x=>V("ref",x));
                case 0x14: { const a=[]; for(let i=0;i<count;i++) a.push(V("vector3",{x:r.i16le(),y:r.i16le(),z:r.i16le()})); return a; }
                case 0x15: { const a=[]; for(let i=0;i<count;i++){ const n=r.u32le(), keypoints=[]; for(let k=0;k<n;k++) keypoints.push({time:r.f32le(),value:r.f32le(),envelope:r.f32le()}); a.push(V("numbersequence",keypoints)); } return a; }
                case 0x16: { const a=[]; for(let i=0;i<count;i++){ const n=r.u32le(), keypoints=[]; for(let k=0;k<n;k++) keypoints.push({time:r.f32le(),r:r.f32le(),g:r.f32le(),b:r.f32le(),envelope:r.f32le()}); a.push(V("colorsequence",keypoints)); } return a; }
                case 0x17: { const a=[]; for(let i=0;i<count;i++) a.push(V("numberrange",{min:r.f32le(),max:r.f32le()})); return a; }
                case 0x18: {
                    const raw=readInterleavedFloat(r,count*4), a=[];
                    for(let i=0;i<count;i++) a.push(V("rect",{min:{x:raw[i],y:raw[count+i]},max:{x:raw[count*2+i],y:raw[count*3+i]}}));
                    return a;
                }
                case 0x19: { const a=[]; for(let i=0;i<count;i++){ const flags=r.u8(); if(flags&1){ const value={density:r.f32le(),friction:r.f32le(),elasticity:r.f32le(),frictionWeight:r.f32le(),elasticityWeight:r.f32le(),acousticAbsorption:(flags&2)?r.f32le():1}; a.push(V("physicalproperties",value)); } else { if(flags&2){} a.push(V("physicalproperties",null)); } } return a; }
                case 0x1A: {
                    const raw=r.bytesN(count*3), a=[];
                    for(let i=0;i<count;i++) a.push(V("color3",{r:raw[i]/255,g:raw[count+i]/255,b:raw[count*2+i]/255})); return a;
                }
                case 0x1B: {
                    // int64 is big-endian interleaved and zigzag encoded. Decode to safe Number where possible.
                    const b=deinterleave(r.bytesN(count*8),count,8), dv=new DataView(b.buffer,b.byteOffset,b.byteLength), a=[];
                    for(let i=0;i<count;i++){
                        let u=dv.getBigUint64(i*8,false); let n=(u>>1n) ^ (-(u&1n));
                        const safe=(n<=BigInt(Number.MAX_SAFE_INTEGER)&&n>=BigInt(Number.MIN_SAFE_INTEGER))?Number(n):Number(n);
                        a.push(V("number",safe));
                    } return a;
                }
                case 0x1C: return readInterleavedU32(r,count).map(i=>V("string",sharedStrings[i] || ""));
                default: return Array.from({length:count},()=>null);
            }
        } catch(error) {
            console.warn(`[RBX Loader] Could not decode property type 0x${type.toString(16)}:`, error);
            return Array.from({length:count},()=>null);
        }
    }

    function parseBinary(buffer) {
        const bytes=new Uint8Array(buffer), r=new Reader(bytes);
        const sig=[0x3c,0x72,0x6f,0x62,0x6c,0x6f,0x78,0x21,0x89,0xff,0x0d,0x0a,0x1a,0x0a];
        for(let i=0;i<sig.length;i++) if(r.u8()!==sig[i]) throw new Error("Not a Roblox binary place file");
        const version=r.u16le(); if(version!==0) throw new Error(`Unsupported RBXL version ${version}`);
        const classCount=r.u32le(), instanceCount=r.u32le(); r.bytesN(8);
        if(classCount>100000 || instanceCount>2000000) throw new Error("RBXL header contains unreasonable counts");
        const classes=new Map(), nodes=new Map(), sharedStrings=[];
        let sawEnd=false;
        while(r.remaining()>=16){
            const signature=String.fromCharCode(...r.bytesN(4));
            const compressedLength=r.u32le(), uncompressedLength=r.u32le(); r.bytesN(4);
            const storedLength=compressedLength===0?uncompressedLength:compressedLength;
            if(storedLength>r.remaining()) throw new Error("RBXL chunk extends beyond file");
            const stored=r.bytesN(storedLength);
            const payload=compressedLength===0?stored:lz4Decompress(stored,uncompressedLength);
            if(signature==="END\0"){ sawEnd=true; break; }
            const cr=new Reader(payload);
            if(signature==="SSTR"){
                const ver=cr.i32le(); if(ver!==0) console.warn("[RBX Loader] SSTR version",ver);
                const n=cr.u32le();
                for(let i=0;i<n;i++){ cr.bytesN(16); sharedStrings.push(cr.str()); }
            } else if(signature==="INST"){
                const classId=cr.i32le(), className=cr.str(), hasService=!!cr.u8(), n=cr.u32le();
                const ids=readReferences(cr,n), flags=[];
                if(hasService) for(let i=0;i<n;i++) flags.push(!!cr.u8());
                const rec={classId,className,ids,hasService,isService:flags}; classes.set(classId,rec);
                ids.forEach((id,i)=>nodes.set(id,{id,ref:String(id),className,parentId:-1,isService:hasService?flags[i]:false,properties:{},children:[]}));
            } else if(signature==="PROP"){
                const classId=cr.i32le(), name=cr.str(), rec=classes.get(classId);
                if(!rec || cr.remaining()<1) continue;
                const values=parseBinaryValues(cr.bytesN(cr.remaining()),rec.ids.length,sharedStrings);
                rec.ids.forEach((id,i)=>{ const n=nodes.get(id); if(n && values[i]) n.properties[name]=values[i]; });
            } else if(signature==="PRNT"){
                cr.u8(); const n=cr.u32le(), children=readReferences(cr,n), parents=readReferences(cr,n);
                for(let i=0;i<n;i++){ const node=nodes.get(children[i]); if(node) node.parentId=parents[i]; }
            }
        }
        if(!sawEnd) console.warn("[RBX Loader] RBXL ended without END chunk");
        for(const node of nodes.values()){
            if(node.parentId!==-1){ const p=nodes.get(node.parentId); if(p) p.children.push(node); }
        }
        const roots=[...nodes.values()].filter(n=>n.parentId===-1 || !nodes.has(n.parentId));
        return {format:"rbxl",nodes:[...nodes.values()],roots,header:{classCount,instanceCount}};
    }

    function firstElementChildByTag(parent, tag) {
        for(const child of parent.children || []) if(child.tagName===tag) return child;
        return null;
    }
    function xmlText(el){ return el ? (el.textContent || "") : ""; }
    function num(el, fallback=0){ const n=Number(xmlText(el)); return Number.isFinite(n)?n:fallback; }
    function xmlPropertyValue(el, shared) {
        const tag=el.tagName;
        if(["string","ProtectedString","BinaryString","Content"].includes(tag)) return {kind:"string",value:xmlText(el)};
        if(tag==="SharedString") return {kind:"string",value:shared.get(xmlText(el).trim()) || ""};
        if(tag==="bool") return {kind:"bool",value:/^true$/i.test(xmlText(el).trim())};
        if(["int","int64","float","double"].includes(tag)) return {kind:"number",value:num(el)};
        if(tag==="token") return {kind:"token",value:num(el)};
        if(tag==="BrickColor") return {kind:"brickcolor",value:num(el)};
        if(tag==="Ref") return {kind:"ref",value:xmlText(el).trim()};
        if(tag==="Color3") {
            const rEl=firstElementChildByTag(el,"R"), gEl=firstElementChildByTag(el,"G"), bEl=firstElementChildByTag(el,"B");
            if(rEl || gEl || bEl) return {kind:"color3",value:{r:num(rEl),g:num(gEl),b:num(bEl)}};
            const packed=Math.max(0,Math.trunc(num(el)))>>>0;
            return {kind:"color3",value:{r:((packed>>>16)&255)/255,g:((packed>>>8)&255)/255,b:(packed&255)/255}};
        }
        if(tag==="Color3uint8"){
            // Roblox usually writes Color3uint8 as packed 0xFFRRGGBB, but the XML
            // format also permits explicit integer R/G/B child elements.
            const rEl=firstElementChildByTag(el,"R"), gEl=firstElementChildByTag(el,"G"), bEl=firstElementChildByTag(el,"B");
            if(rEl || gEl || bEl) return {kind:"color3",value:{r:Math.max(0,Math.min(255,num(rEl)))/255,g:Math.max(0,Math.min(255,num(gEl)))/255,b:Math.max(0,Math.min(255,num(bEl)))/255}};
            const v=Math.max(0,Math.trunc(num(el)))>>>0; return {kind:"color3",value:{r:((v>>>16)&255)/255,g:((v>>>8)&255)/255,b:(v&255)/255}};
        }
        if(tag==="Vector2" || tag==="Vector2int16") return {kind:"vector2",value:{x:num(firstElementChildByTag(el,"X")),y:num(firstElementChildByTag(el,"Y"))}};
        if(tag==="Vector3" || tag==="Vector3int16") return {kind:"vector3",value:{x:num(firstElementChildByTag(el,"X")),y:num(firstElementChildByTag(el,"Y")),z:num(firstElementChildByTag(el,"Z"))}};
        if(tag==="Optional") {
            const child=(el.children||[])[0];
            return child ? xmlPropertyValue(child,shared) : null;
        }
        if(tag==="NumberSequence") {
            const nums=xmlText(el).trim().split(/\s+/).map(Number).filter(Number.isFinite), keypoints=[];
            for(let i=0;i+2<nums.length;i+=3) keypoints.push({time:nums[i],value:nums[i+1],envelope:nums[i+2]});
            return {kind:"numbersequence",value:keypoints};
        }
        if(tag==="ColorSequence") {
            const nums=xmlText(el).trim().split(/\s+/).map(Number).filter(Number.isFinite), keypoints=[];
            for(let i=0;i+4<nums.length;i+=5) keypoints.push({time:nums[i],r:nums[i+1],g:nums[i+2],b:nums[i+3],envelope:nums[i+4]});
            return {kind:"colorsequence",value:keypoints};
        }
        if(tag==="UDim") return {kind:"udim",value:{scale:num(firstElementChildByTag(el,"S")),offset:num(firstElementChildByTag(el,"O"))}};
        if(tag==="UDim2") return {kind:"udim2",value:{sx:num(firstElementChildByTag(el,"XS")),ox:num(firstElementChildByTag(el,"XO")),sy:num(firstElementChildByTag(el,"YS")),oy:num(firstElementChildByTag(el,"YO"))}};
        if(tag==="CoordinateFrame" || tag==="CFrame"){
            const pos={x:num(firstElementChildByTag(el,"X")),y:num(firstElementChildByTag(el,"Y")),z:num(firstElementChildByTag(el,"Z"))};
            const m=[]; for(let row=0;row<3;row++) for(let col=0;col<3;col++) m.push(num(firstElementChildByTag(el,`R${row}${col}`),row===col?1:0));
            return {kind:"cframe",value:{position:pos,matrix:m,orientation:matrixToEulerXYZ(m)}};
        }
        if(tag==="NumberRange") return {kind:"numberrange",value:{min:Number(el.getAttribute("min"))||0,max:Number(el.getAttribute("max"))||0}};
        return {kind:"opaque",value:{tag:String(tag||"Unknown"),text:xmlText(el)}};
    }

    function sanitizeLegacyXml(text) {
        // Some old Roblox serializers emitted XML 1.0-forbidden control bytes
        // (occasionally as numeric character references) inside legacy binary
        // properties. Browsers reject the entire place for one such byte. Keep
        // the document loadable and replace only values XML cannot represent.
        const isAllowedCodePoint=code=>(
            code===0x09 || code===0x0a || code===0x0d ||
            (code>=0x20 && code<=0xd7ff) ||
            (code>=0xe000 && code<=0xfffd) ||
            (code>=0x10000 && code<=0x10ffff)
        );

        return String(text)
            .replace(/&#(x[0-9a-f]+|\d+);/gi,(match,raw)=>{
                const code=raw[0].toLowerCase()==="x"
                    ? Number.parseInt(raw.slice(1),16)
                    : Number.parseInt(raw,10);
                return isAllowedCodePoint(code)?match:"\uFFFD";
            })
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"\uFFFD");
    }

    function parseXml(buffer) {
        const decoded=typeof buffer==="string"?buffer:TEXT_DECODER.decode(new Uint8Array(buffer));
        const text=sanitizeLegacyXml(decoded);
        const doc=new DOMParser().parseFromString(text,"application/xml");
        const parseError=doc.querySelector("parsererror"); if(parseError) throw new Error("Invalid RBXLX XML: "+parseError.textContent.slice(0,240));
        const shared=new Map();
        for(const el of doc.querySelectorAll("SharedStrings > SharedString")) {
            const key=el.getAttribute("md5") || "", raw=xmlText(el).trim();
            try { shared.set(key, atob(raw)); } catch { shared.set(key, raw); }
        }
        const nodes=[];
        const firstIdBySerializedRef=new Map();
        const usedInternalIds=new Set();
        let syntheticId=1;

        // Referents are intended to be unique, but some legacy places contain
        // copied subtrees whose referents were not regenerated. Instance
        // identity must therefore be occurrence-based. Keep the first raw
        // referent as its compact internal ID, and give every collision (or
        // missing referent) a deterministic synthetic ID. Ambiguous Ref
        // properties resolve to the first occurrence below; this preserves the
        // historic target without dropping later copied instances.
        function allocateInternalId(serializedRef){
            const preferred=String(serializedRef || "").trim();
            if(preferred && !usedInternalIds.has(preferred)){
                usedInternalIds.add(preferred);
                return preferred;
            }
            let id;
            do { id=`__blox_xml_${syntheticId++}`; }
            while(usedInternalIds.has(id));
            usedInternalIds.add(id);
            return id;
        }

        function visit(item,parentId){
            const serializedRef=String(item.getAttribute("referent") || "").trim();
            const id=allocateInternalId(serializedRef);
            if(serializedRef && !firstIdBySerializedRef.has(serializedRef)){
                firstIdBySerializedRef.set(serializedRef,id);
            }
            const node={id,ref:serializedRef || id,className:item.getAttribute("class") || "Folder",parentId,isService:false,properties:{},children:[]};
            const props=firstElementChildByTag(item,"Properties");
            if(props) for(const p of props.children){ const name=p.getAttribute("name"); if(!name) continue; const v=xmlPropertyValue(p,shared); if(v) node.properties[name]=v; }
            nodes.push(node);
            for(const child of item.children) if(child.tagName==="Item") { const c=visit(child,id); node.children.push(c); }
            return node;
        }
        const rootEl=doc.documentElement, roots=[];
        for(const child of rootEl.children) if(child.tagName==="Item") roots.push(visit(child,-1));

        // Serialized Ref values name legacy referents, while generated loader
        // tables are keyed by collision-safe internal IDs. Resolve every known
        // target once the full first-occurrence map is available. Unknown/null
        // references retain their original value and follow the existing
        // no-op resolution path.
        for(const node of nodes){
            for(const wrapped of Object.values(node.properties)){
                if(wrapped?.kind!=="ref") continue;
                const target=String(wrapped.value ?? "").trim();
                const resolved=firstIdBySerializedRef.get(target);
                if(resolved) wrapped.value=resolved;
            }
        }
        return {format:"rbxlx",nodes,roots,header:{instanceCount:nodes.length}};
    }

    function looksXml(buffer) {
        const b=new Uint8Array(buffer,0,Math.min(buffer.byteLength,256));
        let s=""; for(const x of b) s+=String.fromCharCode(x);
        s=s.replace(/^\ufeff/,"");
        return /<roblox(?:\s|>)/i.test(s) && !s.startsWith("<roblox!");
    }

    async function parse(record, onStage) {
        if(!record || !record.buffer) throw new Error("No stored Roblox map was found");
        onStage?.("Reading map...");
        await new Promise(r=>setTimeout(r,0));
        const format=record.ext==="rbxlx" || looksXml(record.buffer) ? "rbxlx" : "rbxl";
        onStage?.(format==="rbxlx"?"Parsing RBXLX...":"Decompressing RBXL...");
        await new Promise(r=>setTimeout(r,0));
        return format==="rbxlx" ? parseXml(record.buffer) : parseBinary(record.buffer);
    }

    function luaString(value) {
        const s=String(value ?? "");
        // JSON string escapes are not fully compatible with Luau. In
        // particular JSON.stringify emits control bytes as `\u0000`, while
        // Luau only accepts Unicode escapes in the `\u{0}` form. RBXL files
        // can contain BinaryString/SharedString values, so encode every C0
        // control byte with Luau's supported two-digit hexadecimal escape.
        let out='"';
        for(const character of s) {
            const code=character.codePointAt(0);
            if(character==='"') out+='\\"';
            else if(character==='\\') out+='\\\\';
            else if(character==='\n') out+='\\n';
            else if(character==='\r') out+='\\r';
            else if(character==='\t') out+='\\t';
            else if(code<0x20 || code===0x7f) out+=`\\x${code.toString(16).padStart(2,"0")}`;
            else if(code===0x2028 || code===0x2029) out+=`\\u{${code.toString(16)}}`;
            else out+=character;
        }
        return out+'"';
    }
    function safeNumber(n, fallback=0) { n=Number(n); return Number.isFinite(n)?n:fallback; }
    function genericLuaLiteral(value, depth=0) {
        if(depth>8) return "nil";
        if(value===null || value===undefined) return "nil";
        if(typeof value==="string") return luaString(value);
        if(typeof value==="boolean") return value?"true":"false";
        if(typeof value==="number") return String(safeNumber(value));
        if(Array.isArray(value)) return `{${value.map(v=>genericLuaLiteral(v,depth+1)).join(",")}}`;
        if(typeof value==="object") return `{${Object.entries(value).map(([k,v])=>`[${luaString(k)}]=${genericLuaLiteral(v,depth+1)}`).join(",")}}`;
        return luaString(String(value));
    }
    function convertImportedRobloxSource(source, sourceClass="Script") {
        let s=String(source ?? "");
        // Keep line numbers stable: only one-line token/API rewrites are used.
        s=s.replace(/^\uFEFF/,"").replace(/\u0000/g,"").replace(/\r\n?/g,"\n");

        // Pre-Luau Roblox scripts commonly used the lowercase service alias.
        // The emulator exposes GetService canonically, so normalize it before
        // the imported Source reaches the VM.
        // Never let a compatibility rewrite cross a source line. `\s` also
        // includes newlines and can join a comment ending in `word.` to an
        // Instance path on the next line, turning live code into comment text.
        s=s.replace(/\bgame[ \t]*:[ \t]*service[ \t]*\(/gi,"game:GetService(");
        s=s.replace(/\bgame[ \t]*\.[ \t]*service[ \t]*\(/gi,"game.GetService(");

        // Old scripts occasionally used capitalized scheduler helpers in copied
        // snippets. Normalize only direct global calls; do not touch fields.
        s=s.replace(/(^|[^.\w])Wait[ \t]*\(/g,"$1wait(");
        s=s.replace(/(^|[^.\w])Spawn[ \t]*\(/g,"$1spawn(");
        s=s.replace(/(^|[^.\w])Delay[ \t]*\(/g,"$1delay(");

        // Keep WaitForChild inside the per-script Luau scheduler. Calling the
        // Promise-backed host method would serialize the shared Asyncify VM and
        // stall every other Script while this one waits.
        s=s.replace(
            /\b([A-Za-z_]\w*(?:[ \t]*\.[ \t]*[A-Za-z_]\w*)*)[ \t]*:[ \t]*waitforchild[ \t]*\(/gi,
            (_match, instancePath) =>
                `__BloxWaitForChild(${String(instancePath).replace(/\s+/g, "")},`
        );

        // Canonicalize only well-known classic Instance collection calls. The
        // runtime member bridge is already case-insensitive, but this keeps
        // imported 2007-2010 source on the emulator's canonical API path and,
        // importantly, ensures these calls receive native Luau array tables.
        s=s.replace(/:[ \t]*(?:children|getchildren)[ \t]*\(/gi,":GetChildren(");
        s=s.replace(/:[ \t]*getdescendants[ \t]*\(/gi,":GetDescendants(");

        // Host CFrames are table-like through luau-web and therefore cannot
        // participate directly in Luau's `*` operator. Convert the common
        // classic composition forms to the equivalent host method.
        s=s.replace(
            /(\b[A-Za-z_]\w*(?:[ \t]*\.[ \t]*[A-Za-z_]\w*)*[ \t]*:[ \t]*(?:inverse|Inverse)[ \t]*\([ \t]*\))[ \t]*\*[ \t]*([A-Za-z_]\w*(?:[ \t]*\.[ \t]*[A-Za-z_]\w*)*)/g,
            "$1:Multiply($2)"
        );
        s=s.replace(
            /(CFrame[ \t]*\.[ \t]*(?:new|Angles|fromEulerAnglesXYZ|fromEulerAnglesYXZ)[ \t]*\([^()\n]*\))[ \t]*\*[ \t]*(CFrame[ \t]*\.[ \t]*(?:new|Angles|fromEulerAnglesXYZ|fromEulerAnglesYXZ)[ \t]*\([^()\n]*\))/gi,
            "$1:Multiply($2)"
        );

        // RunService frame-signal waits must yield inside the emulator's pure
        // Luau coroutine scheduler. A direct host Signal:wait() would turn into
        // an Asyncify Promise and serialize/block every other place Script.
        s=s.replace(
            /\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\.(Stepped|Heartbeat|RenderStepped)[ \t]*:[ \t]*wait[ \t]*\([ \t]*\)/gi,
            (_match, phase) => {
                const canonical = String(phase).toLowerCase() === "stepped"
                    ? "Stepped"
                    : String(phase).toLowerCase() === "heartbeat"
                        ? "Heartbeat"
                        : "RenderStepped";
                return `__BloxRunServiceWait(${JSON.stringify(canonical)})`;
            }
        );

        // The same rule applies to Touched/Changed/ChildAdded and other host
        // signals. The runtime owns __BloxSignalWait and wakes only the waiting
        // coroutine when that signal fires.
        s=s.replace(
            /\b([A-Za-z_]\w*(?:[ \t]*\.[ \t]*[A-Za-z_]\w*)*)[ \t]*:[ \t]*wait[ \t]*\([ \t]*\)/gi,
            (_match, signalPath) =>
                `__BloxSignalWait(${String(signalPath).replace(/\s+/g, "")})`
        );

        return s;
    }

    function tokenToLua(name, v) {
        if(name==="Material") {
            return luaString(MATERIAL_TOKENS.get(Number(v)) || "Plastic");
        }
        const list=TOKEN_ENUMS[name];
        if(list && list[v]) return luaString(list[v]);
        if(name==="Shape") { const shape={0:"Ball",1:"Block",2:"Cylinder"}[v]; if(shape) return luaString(shape); }
        return String(Math.trunc(safeNumber(v)));
    }
    function valueToLua(name, wrapped) {
        if(!wrapped) return null;
        const v=wrapped.value;

        // Older RBXLX files commonly serialize BrickColor using an <int> tag.
        if((name==="BrickColor" || name==="TeamColor") && (wrapped.kind==="number" || wrapped.kind==="token")) {
            return `BrickColor.new(${Math.trunc(safeNumber(v))})`;
        }

        switch(wrapped.kind){
            case "string": return luaString(v);
            case "bool": return v?"true":"false";
            case "number": return String(safeNumber(v));
            case "token": return tokenToLua(name,v);
            case "brickcolor": return `BrickColor.new(${Math.trunc(safeNumber(v))})`;
            case "color3": {
                const r=Math.max(0,Math.min(255,Math.round(safeNumber(v.r)*255)));
                const g=Math.max(0,Math.min(255,Math.round(safeNumber(v.g)*255)));
                const b=Math.max(0,Math.min(255,Math.round(safeNumber(v.b)*255)));
                return `Color3.fromRGB(${r},${g},${b})`;
            }
            case "vector2": return `Vector2.new(${safeNumber(v.x)},${safeNumber(v.y)})`;
            case "vector3": return `Vector3.new(${safeNumber(v.x)},${safeNumber(v.y)},${safeNumber(v.z)})`;
            case "udim": return `UDim.new(${safeNumber(v.scale)},${Math.trunc(safeNumber(v.offset))})`;
            case "udim2": return `UDim2.new(${safeNumber(v.sx)},${Math.trunc(safeNumber(v.ox))},${safeNumber(v.sy)},${Math.trunc(safeNumber(v.oy))})`;
            case "cframe": {
                const p=v.position||{}, m=v.matrix||[1,0,0,0,1,0,0,0,1];
                return `CFrame.new(${safeNumber(p.x)},${safeNumber(p.y)},${safeNumber(p.z)},${m.map(x=>safeNumber(x)).join(",")})`;
            }
            case "ray": return `Ray.new(Vector3.new(${safeNumber(v.origin?.x)},${safeNumber(v.origin?.y)},${safeNumber(v.origin?.z)}),Vector3.new(${safeNumber(v.direction?.x)},${safeNumber(v.direction?.y)},${safeNumber(v.direction?.z)}))`;
            case "numberrange": return `NumberRange.new(${safeNumber(v.min)},${safeNumber(v.max)})`;
            case "rect": return `Rect.new(${safeNumber(v.min?.x)},${safeNumber(v.min?.y)},${safeNumber(v.max?.x)},${safeNumber(v.max?.y)})`;
            case "axes": {
                const mask=Math.trunc(safeNumber(v)); const names=[];
                if(mask&1) names.push('"X"'); if(mask&2) names.push('"Y"'); if(mask&4) names.push('"Z"');
                return `Axes.new(${names.join(",")})`;
            }
            case "faces": {
                const mask=Math.trunc(safeNumber(v)); const names=[];
                if(mask&1) names.push('"Right"'); if(mask&2) names.push('"Top"'); if(mask&4) names.push('"Back"');
                if(mask&8) names.push('"Left"'); if(mask&16) names.push('"Bottom"'); if(mask&32) names.push('"Front"');
                return `Faces.new(${names.join(",")})`;
            }
            case "physicalproperties": {
                if(!v) return "nil";
                return `PhysicalProperties.new(${safeNumber(v.density)},${safeNumber(v.friction)},${safeNumber(v.elasticity)},${safeNumber(v.frictionWeight)},${safeNumber(v.elasticityWeight)},${safeNumber(v.acousticAbsorption,1)})`;
            }
            case "numbersequence": return `NumberSequence.new({${(v||[]).map(k=>`NumberSequenceKeypoint.new(${safeNumber(k.time)},${safeNumber(k.value)},${safeNumber(k.envelope)})`).join(",")}})`;
            case "colorsequence": return `ColorSequence.new({${(v||[]).map(k=>`ColorSequenceKeypoint.new(${safeNumber(k.time)},Color3.fromRGB(${Math.max(0,Math.min(255,Math.round(safeNumber(k.r)*255)))},${Math.max(0,Math.min(255,Math.round(safeNumber(k.g)*255)))},${Math.max(0,Math.min(255,Math.round(safeNumber(k.b)*255))) }))`).join(",")}})`;
            default: {
                // Lossless structural fallback for every decoded serialized value.
                // Specialized emulator datatypes are used above; otherwise keep
                // the payload script-visible as a normal Luau value/table.
                return genericLuaLiteral(v);
            }
        }
    }

    function classForEmulator(className) {
        // Workspace.CurrentCamera is host-owned. Serialized Camera data is kept
        // out of the hierarchy to avoid two competing current cameras.
        if(className==="Camera") return null;

        // This is an engine-owned cache containing opaque binary CSG data,
        // not a script-facing Instance. Importing its Value as source text can
        // create malformed Luau escapes and provides no usable geometry to the
        // emulator (solid geometry already follows the Part fallback below).
        if(className==="CSGDictionaryService" || className==="BinaryStringValue") return null;

        // The attached RobloxLinux client predates WeldConstraint. Preserve a
        // modern WeldConstraint place by translating it to classic Weld.
        if(className==="WeldConstraint") return "Weld";

        // Modern solid classes use the emulator's classic Part geometry/physics
        // implementation while RobloxSourceClassName preserves their file identity.
        if(className==="MeshPart" || className==="UnionOperation" || className==="NegateOperation") return "Part";

        // Do not collapse unknown serialized classes to Folder. Instance.new()
        // has a generic compatibility fallback and retains arbitrary properties.
        return className || "Folder";
    }

    const RIGID_JOINT_CLASSES = new Set([
        "Weld", "Snap", "Glue", "ManualWeld", "ManualGlue"
    ]);

    // Exact creatable JointInstance family reflected by the attached
    // RobloxLinux client. JointInstance, DynamicRotate and
    // ManualSurfaceJointInstance themselves are abstract/non-creatable.
    const ROBLOX_LINUX_JOINT_CLASSES = new Set([
        "Weld", "Snap", "Glue", "Motor", "Motor6D", "Rotate", "RotateP",
        "RotateV", "VelocityMotor", "ManualWeld", "ManualGlue", "WeldConstraint"
    ]);

    function flattenParentFirst(parsed) {
        const out=[], visited=new Set();
        function walk(n){ if(!n||visited.has(n.id)) return; visited.add(n.id); out.push(n); for(const c of n.children||[]) walk(c); }
        for(const r of parsed.roots||[]) walk(r);
        for(const n of parsed.nodes||[]) walk(n);
        return out;
    }

    function getMapLoaderMemorySettingMb(options={}) {
        const configured = Number(
            options.maxMemoryMb ??
            global.__bloxBootSettings?.mapLoaderMemoryMb ??
            512
        );
        return [32,48,64,96,128,192,256,384,512].includes(configured)
            ? configured
            : 512;
    }

    function getMapLoaderChunkBudgetBytes(options={}) {
        const mb = getMapLoaderMemorySettingMb(options);
        // Keep each Luau compile chunk conservative relative to the configured
        // memory ceiling. The luau-web WASM build itself is fixed-size, so large
        // maps are streamed as multiple chunks instead of one giant compile.
        const budget = Math.round(mb * 24576);
        return Math.max(160 * 1024, Math.min(1024 * 1024, budget));
    }

    function estimateLuaBytes(lines) {
        let total = 0;
        for (const line of lines) total += String(line).length + 1;
        return total;
    }

    function splitLuaStatements(statements, byteBudget) {
        const chunks=[];
        let current=[];
        let currentBytes=0;
        const flush=()=>{
            if(!current.length) return;
            chunks.push(current.join("\n"));
            current=[];
            currentBytes=0;
        };
        for (const statement of statements) {
            const line = String(statement);
            const bytes = line.length + 1;
            if (current.length && currentBytes + bytes > byteBudget) flush();
            current.push(line);
            currentBytes += bytes;
        }
        flush();
        return chunks;
    }

    function generateLuau(parsed, options={}) {
        const order=flattenParentFirst(parsed);
        const descriptors=[];
        const refs=[];
        let totalBricks=0,totalConnectors=0,totalImportedProperties=0,totalSkippedProperties=0;
        for(const node of order){
            const isService=node.isService || SERVICE_CLASSES.has(node.className);
            const emuClass=isService?node.className:classForEmulator(node.className);
            if(!emuClass) continue;
            if(PART_CLASSES.has(node.className) || ["Part","WedgePart","SpawnLocation","Seat"].includes(emuClass)) totalBricks++;
            if(CONNECTOR_CLASSES.has(node.className)) totalConnectors++;
            const props=[];
            const normalizedProperties=new Map();
            for(const [serializedName,wrapped] of Object.entries(node.properties||{})) {
                const normalizedName=normalizePropertyName(serializedName);
                if(shouldImportProperty(normalizedName,wrapped)) {
                    normalizedProperties.set(normalizedName,wrapped);
                    totalImportedProperties++;
                } else {
                    totalSkippedProperties++;
                }
            }
            const hasExactPartColor=PART_CLASSES.has(node.className) && normalizedProperties.has("Color");
            const cframe=normalizedProperties.get("CFrame") || normalizedProperties.get("CoordinateFrame");
            if(cframe?.kind==="cframe" && PART_CLASSES.has(node.className)){
                const p=cframe.value.position, o=cframe.value.orientation;
                props.push(["Position",`Vector3.new(${safeNumber(p.x)},${safeNumber(p.y)},${safeNumber(p.z)})`]);
                props.push(["Orientation",`Vector3.new(${safeNumber(o.x)},${safeNumber(o.y)},${safeNumber(o.z)})`]);
            }
            for(const [name,wrapped] of normalizedProperties){
                // Name is passed as a compact positional argument to shared.add;
                // emitting it again in the property table doubles one assignment
                // for every Instance in large places.
                if(name==="Name" || name==="CFrame" || name==="CoordinateFrame" || name==="Parent") continue;
                if(ROBLOX_LINUX_JOINT_CLASSES.has(node.className) && (name==="Enabled" || name==="Active")) continue;
                if(name==="Active") continue;
                if(hasExactPartColor && name==="BrickColor") continue;
                if(PART_CLASSES.has(node.className) && (name==="Velocity" || name==="RotVelocity")) continue;
                if(REF_PROPERTIES.has(name) || wrapped?.kind==="ref") { if(wrapped?.kind==="ref" && wrapped.value!=="null" && wrapped.value!==-1) refs.push([String(node.id),name,String(wrapped.value)]); continue; }
                let expr;
                if(name==="Source" && wrapped?.kind==="string" && (node.className==="Script" || node.className==="LocalScript" || node.className==="ModuleScript")) {
                    const converted=convertImportedRobloxSource(wrapped.value,node.className);
                    expr=luaString(converted);
                } else {
                    expr=valueToLua(name,wrapped);
                }
                if(expr!==null) props.push([name,expr]);
            }
            const nameWrapped=node.properties.Name;
            const displayName=nameWrapped?.kind==="string"?nameWrapped.value:node.className;
            const preserveRigidJointPose =
                !isService &&
                RIGID_JOINT_CLASSES.has(emuClass) &&
                !normalizedProperties.has("C0") &&
                !normalizedProperties.has("C1");
            descriptors.push({
                id:String(node.id),
                parent:String(node.parentId),
                className:emuClass,
                sourceClass:node.className,
                isService,
                name:displayName,
                props,
                preserveRigidJointPose
            });
        }

        const totalObjects=descriptors.length;
        const totalScripts=descriptors.filter(d=>d.sourceClass==="Script" || d.sourceClass==="LocalScript" || d.sourceClass==="ModuleScript").length;
        const memoryMb=getMapLoaderMemorySettingMb(options);
        const chunkByteBudget=getMapLoaderChunkBudgetBytes(options);
        const chunks=[];
        const pushChunk=(lines, kind)=>{
            const source=lines.join("\n");
            if(source.trim()) chunks.push(source);
        };

        const initLines=[];
        initLines.push("-- Generated by Blox Emulation RBXL/RBXLX incremental loader (chunked)");
        initLines.push("local shared=__BloxMapShared or {}");
        initLines.push("__BloxMapShared=shared");
        initLines.push(`shared.totalBricks=${totalBricks}`);
        initLines.push(`shared.totalConnectors=${totalConnectors}`);
        initLines.push("shared.loadedBricks=shared.loadedBricks or 0");
        initLines.push("shared.loadedConnectors=shared.loadedConnectors or 0");
        initLines.push("shared.made=shared.made or 0");
        initLines.push("shared.refsMade=shared.refsMade or 0");
        initLines.push("shared.created=shared.created or {}");
        initLines.push("shared.frozenParts=shared.frozenParts or {}");
        initLines.push("shared.allParts=shared.allParts or {}");
        initLines.push("if not shared.initialized then");
        initLines.push(' local Players=game:GetService("Players")');
        initLines.push(" local lp=Players.LocalPlayer");
        initLines.push(" local cam=workspace.CurrentCamera");
        initLines.push(" shared.firstPart=nil");
        initLines.push(" function shared.loadingCamera() if shared.firstPart and cam then local p=shared.firstPart.Position cam.CameraType=Enum.CameraType.Scriptable cam.CameraSubject=shared.firstPart cam.CFrame=CFrame.lookAt(Vector3.new(p.X,p.Y+600,p.Z+1374.773),p) end end");
        initLines.push(" function shared.progress() __BloxMapProgress(shared.loadedBricks,shared.loadedConnectors,shared.totalBricks,shared.totalConnectors) if shared.loadingCamera then shared.loadingCamera() end end");
        initLines.push(" function shared.setprop(o,k,v) local ok,err=pcall(function() o[k]=v end) end");
        initLines.push(' function shared.ispart(c) return c=="Part" or c=="WedgePart" or c=="CornerWedgePart" or c=="TrussPart" or c=="Seat" or c=="VehicleSeat" or c=="SpawnLocation" or c=="MeshPart" or c=="UnionOperation" or c=="NegateOperation" end');
        initLines.push(' function shared.add(id,parentId,className,sourceClass,name,isService,props) local o=nil if isService then if className=="DataModel" then o=game else local ok,res=pcall(function() return game:GetService(className) end) if ok then o=res end if not o then local ok2,res2=pcall(function() return Instance.new(className) end) if ok2 then o=res2 shared.setprop(o,"Parent",game) end end end else local ok,res=pcall(function() return Instance.new(className) end) if ok then o=res end end if not o then return nil end shared.created[id]=o shared.setprop(o,"RobloxSourceClassName",sourceClass) if name and name~="" then shared.setprop(o,"Name",name) end local basePart=shared.ispart(sourceClass) if props then for k,v in pairs(props) do if not (basePart and (k=="Anchored" or k=="Velocity" or k=="RotVelocity")) then shared.setprop(o,k,v) end end end if basePart then shared.allParts[#shared.allParts+1]=o shared.setprop(o,"Velocity",Vector3.new(0,0,0)) shared.setprop(o,"RotVelocity",Vector3.new(0,0,0)) local desired=false if props and props.Anchored~=nil then desired=props.Anchored==true end shared.setprop(o,"Anchored",true) if not desired then shared.frozenParts[#shared.frozenParts+1]=o end end if not isService then local par=shared.created[parentId] if not par then par=workspace end shared.setprop(o,"Parent",par) end if basePart then shared.loadedBricks=shared.loadedBricks+1 if not shared.firstPart then shared.firstPart=o if shared.loadingCamera then shared.loadingCamera() end end end if sourceClass=="Weld" or sourceClass=="Snap" or sourceClass=="Glue" or sourceClass=="Motor" or sourceClass=="Motor6D" or sourceClass=="Rotate" or sourceClass=="RotateP" or sourceClass=="RotateV" or sourceClass=="VelocityMotor" or sourceClass=="ManualWeld" or sourceClass=="ManualGlue" or sourceClass=="WeldConstraint" then shared.loadedConnectors=shared.loadedConnectors+1 end shared.made=shared.made+1 if shared.made%32==0 then shared.progress() wait(0.001) end return o end');
        initLines.push(' function shared.ref(a,k,b) local o=shared.created[a] local v=shared.created[b] if o and v then shared.setprop(o,k,v) end shared.refsMade=shared.refsMade+1 if shared.refsMade%64==0 then shared.progress() wait(0.001) end end');
        initLines.push(' function shared.preservejointpose(id) local j=shared.created[id] if j and j.Part0 and j.Part1 then local ok,rel=pcall(function() return j.Part0.CFrame:ToObjectSpace(j.Part1.CFrame) end) if ok and rel then shared.setprop(j,"C0",rel) shared.setprop(j,"C1",CFrame.new()) end end shared.preservedJointPoses=(shared.preservedJointPoses or 0)+1 if shared.preservedJointPoses%16==0 then wait(0.004) end end');
        initLines.push(" shared.initialized=true");
        initLines.push("end");
        initLines.push("shared.progress()");
        pushChunk(initLines,'init');

        const objectStatements=[];
        for(const d of descriptors){
            const pitems=d.props.map(([k,v])=>`[${luaString(k)}]=${v}`).join(",");
            objectStatements.push(`shared.add(${luaString(d.id)},${luaString(d.parent)},${luaString(d.className)},${luaString(d.sourceClass)},${luaString(d.name)},${d.isService?"true":"false"},{${pitems}})`);
            // shared.add temporarily freezes every BasePart as Anchored during
            // import. Preserve the serialized value separately so joint
            // reconstruction can distinguish real static scenery from an
            // authored unanchored construction while that barrier is active.
            if(["Part","WedgePart","CornerWedgePart","TrussPart","Seat","VehicleSeat","SpawnLocation","MeshPart","UnionOperation","NegateOperation"].includes(d.sourceClass)){
                const authoredAnchored=d.props.find(([key])=>key==="Anchored")?.[1]||"false";
                objectStatements.push(`if shared.created[${luaString(d.id)}] then shared.setprop(shared.created[${luaString(d.id)}],"__bloxImportAuthoredAnchored",${authoredAnchored}==true) end`);
            }
        }
        for(const chunk of splitLuaStatements(objectStatements, chunkByteBudget)) {
            pushChunk([
                "local shared=__BloxMapShared",
                chunk
            ], 'objects');
        }

        if(refs.length){
            pushChunk([
                "local shared=__BloxMapShared",
                "-- Resolve object references after every instance exists.",
                "__BloxMapStage(\"Resolving references...\")",
                "shared.progress()"
            ], 'refs-stage');
            const refStatements=refs.map(([a,k,b])=>`shared.ref(${luaString(a)},${luaString(k)},${luaString(b)})`);
            for(const chunk of splitLuaStatements(refStatements, chunkByteBudget)) {
                pushChunk([
                    "local shared=__BloxMapShared",
                    chunk
                ], 'refs');
            }
        }

        pushChunk([
            "if __BloxMapAssemblyDirty then __BloxMapAssemblyDirty() end",
            "__BloxMapStage(\"Resolving imported joints...\")"
        ], 'assembly');

        const posePreservingRigidJoints = descriptors.filter(d=>d.preserveRigidJointPose);
        if(posePreservingRigidJoints.length){
            pushChunk([
                "local shared=__BloxMapShared",
                "__BloxMapStage(\"Preserving joint poses...\")",
                "shared.progress()",
                "wait(0.016)"
            ], 'pose-stage');
            const poseStatements=posePreservingRigidJoints.map(d=>`shared.preservejointpose(${luaString(d.id)})`);
            for(const chunk of splitLuaStatements(poseStatements, chunkByteBudget)) {
                pushChunk([
                    "local shared=__BloxMapShared",
                    chunk
                ], 'pose');
            }
        }

        // IMPORTANT: Asyncify wait() does not return control as a detached
        // scheduler task. The old v4/v5 loader deadlocked here because the final
        // Luau chunk waited for __BloxMapCanReleasePhysics(), while JavaScript
        // did not allow physics release until AFTER that same chunk returned.
        //
        // Split completion and physics release into two separate chunks. JS runs
        // the completion chunk, finalizes joints/assemblies, enables release,
        // then runs the release chunk.
        const completionLines=[];
        completionLines.push("local shared=__BloxMapShared");
        completionLines.push('__BloxMapStage("Imported objects complete...")');
        completionLines.push("shared.progress()");
        completionLines.push("__BloxMapComplete(shared.loadedBricks,shared.loadedConnectors,shared.totalBricks,shared.totalConnectors,#shared.frozenParts)");
        completionLines.push("return true");
        pushChunk(completionLines,'completion');
        const completionChunkIndex=chunks.length-1;

        const releaseLines=[];
        releaseLines.push("local shared=__BloxMapShared");
        releaseLines.push('if not shared then error("RBXL loader state missing before physics release") end');
        releaseLines.push('local released=0 for _,p in ipairs(shared.frozenParts) do if p then shared.setprop(p,"Anchored",false) end released=released+1 if released%128==0 then wait(0.001) end end');
        releaseLines.push("__BloxMapPhysicsReleased(#shared.frozenParts)");
        releaseLines.push("__BloxMapShared=nil");
        releaseLines.push("return true");
        pushChunk(releaseLines,'release');
        const releaseChunkIndex=chunks.length-1;

        return {
            chunks,
            meta:{
                totalBricks,
                totalConnectors,
                totalObjects,
                totalScripts,
                format:parsed.format,
                chunkCount:chunks.length,
                completionChunkIndex,
                releaseChunkIndex,
                memoryMb,
                chunkByteBudget,
                totalImportedProperties,
                totalSkippedProperties
            }
        };
    }

    const CORE_UI_IDS=["classicTopBar","classicMessageStack","classicHealthHud","classicChatPanel","classicPlayerList","classicHotbar","classicChatBar","classicToolsMenu","classicInsertMenu","bloxGuiRoot","bloxGameMenu","start"];
    let uiDisplayCache=new Map();
    let loadingCancelTimer=null;
    let loadingTextTimer=null;
    let loadingGesturePromise=null;
    let loadingGestureResolve=null;
    let loadingGestureStarted=false;
    global.__bloxGameStarted=false;
    function setCoreUiHidden(hidden){
        for(const id of CORE_UI_IDS){ const el=document.getElementById(id); if(!el) continue; if(hidden){ if(!uiDisplayCache.has(id)) uiDisplayCache.set(id,el.style.display); el.style.display="none"; } else { const prev=uiDisplayCache.get(id); el.style.display=prev===undefined?"":prev; } }
    }
    function ensureLoadingOverlay(){
        let root=document.getElementById("bloxRbxLoadingScreen"); if(root) return root;
        const style=document.createElement("style"); style.id="bloxRbxLoadingStyle"; style.textContent=`
#bloxRbxLoadingScreen{position:fixed;inset:0;z-index:2147483000;display:none;min-height:100vh;box-sizing:border-box;overflow:hidden;pointer-events:auto;background-image:url("Textures/UI/background.png");background-repeat:repeat;background-size:350px 350px;color:#fff;font-family:Verdana,Arial,Helvetica,sans-serif;font-size:11px;opacity:1;transition:opacity .5s ease}
#bloxRbxLoadingScreen.blox-load-fading{opacity:0;pointer-events:none}
#bloxRbxLoadingTitle{position:absolute;left:48px;bottom:50px;max-width:min(65vw,720px);overflow:hidden;color:#fff;font-size:23px;line-height:29px;font-weight:400;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.85)}
#bloxRbxLoadingCancel{position:absolute;top:10px;right:10px;width:24px;height:24px;margin:0;padding:0;border:0;outline:0;background:transparent url("Textures/UI/cancelButton.png") center/24px 24px no-repeat;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .65s ease}
#bloxRbxLoadingCancel.visible{opacity:.76;pointer-events:auto}
#bloxRbxLoadingCancel:hover,#bloxRbxLoadingCancel:focus-visible{opacity:1}
#bloxRbxLoadingIndicator{position:absolute;right:47px;bottom:24px;width:102px;height:102px;display:flex;align-items:center;justify-content:center}
#bloxRbxLoadingCircle{position:absolute;inset:0;width:102px;height:102px;object-fit:contain;animation:bloxRbxLoadingSpin 1.15s linear infinite}
#bloxRbxLoadingWord{position:relative;z-index:1;width:76px;overflow:hidden;color:#fff;font-size:12px;line-height:15px;text-align:center;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.9)}
#bloxRbxClickToPlay{position:absolute;left:50%;bottom:55px;display:none;max-width:min(70vw,760px);transform:translateX(-50%);color:#fff;font-size:15px;line-height:20px;text-align:center;white-space:normal;text-shadow:0 1px 2px rgba(0,0,0,.9);pointer-events:none}
#bloxRbxClickToPlay.visible{display:block}
#bloxRbxClickToPlay.error{font-size:15px;color:#fff}
#bloxRbxLoadingCount,#bloxRbxLoadingStage{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes bloxRbxLoadingSpin{to{transform:rotate(360deg)}}
@media(max-width:520px){#bloxRbxLoadingTitle{left:22px;bottom:25px;max-width:calc(100vw - 155px);font-size:18px;line-height:23px}#bloxRbxClickToPlay{bottom:29px;max-width:54vw;font-size:13px}#bloxRbxLoadingIndicator{right:20px;bottom:16px;width:86px;height:86px}#bloxRbxLoadingCircle{width:86px;height:86px}}
`;
        document.head.appendChild(style);
        root=document.createElement("div"); root.id="bloxRbxLoadingScreen"; root.innerHTML='<button id="bloxRbxLoadingCancel" type="button" aria-label="Cancel loading"></button><div id="bloxRbxLoadingTitle"></div><div id="bloxRbxClickToPlay" role="status">Click the screen to play</div><div id="bloxRbxLoadingIndicator"><img id="bloxRbxLoadingCircle" src="Textures/UI/loadingCircle.png" alt=""><span id="bloxRbxLoadingWord">Loading.</span></div><div id="bloxRbxLoadingCount">Bricks: 0 Connectors: 0</div><div id="bloxRbxLoadingStage" aria-live="polite">Waiting to play...</div>';
        root.querySelector("#bloxRbxLoadingCancel").addEventListener("click",()=>{ location.href="index.html"; });
        document.body.appendChild(root); return root;
    }
    let mapStageLocked=false;
    let loaderStats={startedAt:0,finishedAt:0,stages:[],durations:{},map:null};

    function resetLoaderStats(){
        loaderStats={startedAt:performance.now(),finishedAt:0,stages:[],durations:{},map:null};
    }

    function markLoaderStage(name){
        if(!loaderStats.startedAt) resetLoaderStats();
        loaderStats.stages.push({name:String(name||""),atMs:performance.now()-loaderStats.startedAt});
    }

    function setLoaderDuration(name,startedAt){
        loaderStats.durations[name]=performance.now()-startedAt;
    }

    global.getBloxLoaderStats=function(){
        return JSON.parse(JSON.stringify(loaderStats));
    };

    function setLoadingMapName(name){
        const title=document.getElementById("bloxRbxLoadingTitle");
        if(title) title.textContent=String(name||"Loading Place");
    }

    function stopLoadingScreenTimers(){
        if(loadingCancelTimer!==null){ clearTimeout(loadingCancelTimer); loadingCancelTimer=null; }
        if(loadingTextTimer!==null){ clearInterval(loadingTextTimer); loadingTextTimer=null; }
    }

    function scheduleLoadingCancel(){
        const cancel=document.getElementById("bloxRbxLoadingCancel");
        if(!cancel) return;
        cancel.classList.remove("visible");
        if(loadingCancelTimer!==null) clearTimeout(loadingCancelTimer);
        loadingCancelTimer=setTimeout(()=>{
            loadingCancelTimer=null;
            cancel.classList.add("visible");
        },5000);
    }

    function showClickToPlay(){
        setCoreUiHidden(true);
        const root=ensureLoadingOverlay();
        stopLoadingScreenTimers();
        root.classList.remove("blox-load-fading");
        root.style.display="block";
        root.style.cursor="pointer";
        setLoadingMapName(sessionStorage.getItem("bloxScriptName")||"Loading Place");
        const title=document.getElementById("bloxRbxLoadingTitle");
        if(title) title.style.display="block";
        const indicator=document.getElementById("bloxRbxLoadingIndicator");
        if(indicator) indicator.style.display="none";
        const prompt=document.getElementById("bloxRbxClickToPlay");
        if(prompt){
            prompt.textContent="Click the screen to play";
            prompt.classList.remove("error");
            prompt.classList.add("visible");
        }
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Waiting for player input...";
        scheduleLoadingCancel();

        if(!loadingGesturePromise){
            loadingGesturePromise=new Promise(resolve=>{
                loadingGestureResolve=resolve;
            });
        }

        if(root.dataset.bloxGestureBound!=="1"){
            root.dataset.bloxGestureBound="1";
            root.addEventListener("click",event=>{
                if(event.target?.closest?.("#bloxRbxLoadingCancel") || loadingGestureStarted) return;
                loadingGestureStarted=true;
                root.style.cursor="default";
                showLoading("Starting game...");
                const resolve=loadingGestureResolve;
                loadingGestureResolve=null;
                resolve?.(true);
            });
        }
        return loadingGesturePromise;
    }

    function showLoading(stage="Reading map..."){
        setCoreUiHidden(true);
        const root=ensureLoadingOverlay();
        stopLoadingScreenTimers();
        root.classList.remove("blox-load-fading");
        root.style.display="block";
        root.style.cursor="default";
        setLoadingMapName(sessionStorage.getItem("bloxScriptName")||"Loading Place");
        const title=document.getElementById("bloxRbxLoadingTitle");
        if(title) title.style.display="block";
        scheduleLoadingCancel();
        const prompt=document.getElementById("bloxRbxClickToPlay");
        if(prompt){ prompt.classList.remove("visible","error"); prompt.textContent=""; }
        const word=document.getElementById("bloxRbxLoadingWord");
        let loadingDots=1;
        if(word) word.textContent="Loading.";
        loadingTextTimer=setInterval(()=>{ loadingDots=loadingDots%3+1; if(word) word.textContent="Loading"+".".repeat(loadingDots); },650);
        const indicator=document.getElementById("bloxRbxLoadingIndicator");
        if(indicator) indicator.style.display="flex";
        mapStageLocked=false;
        const s=document.getElementById("bloxRbxLoadingStage");
        if(s) s.textContent=stage;
    }

    function updateProgress(bricks,connectors,totalBricks,totalConnectors){
        const c=document.getElementById("bloxRbxLoadingCount");
        if(c) c.textContent=`Bricks: ${Math.max(0,Math.trunc(bricks||0))}   Connectors: ${Math.max(0,Math.trunc(connectors||0))}`;
        const s=document.getElementById("bloxRbxLoadingStage");
        if(s && totalBricks!=null && !mapStageLocked){
            s.textContent=`Loading map... ${Math.min(100,Math.round(((bricks||0)+(connectors||0))/Math.max(1,(totalBricks||0)+(totalConnectors||0))*100))}%`;
        }
    }
    async function hideLoading(){
        const root=document.getElementById("bloxRbxLoadingScreen");
        if(root){
            root.classList.add("blox-load-fading");
            await new Promise(resolve=>setTimeout(resolve,500));
            root.style.display="none";
            root.classList.remove("blox-load-fading");
        }
        stopLoadingScreenTimers();
        setCoreUiHidden(false);
        global.__bloxGameStarted=true;
    }

    function showLoadingError(error){
        setCoreUiHidden(true);
        const root=ensureLoadingOverlay();
        stopLoadingScreenTimers();
        root.classList.remove("blox-load-fading");
        root.style.display="block";
        root.style.cursor="default";
        global.__bloxGameStarted=false;

        const message="Load failed: "+(error?.message||String(error||"Unknown error"));
        const title=document.getElementById("bloxRbxLoadingTitle");
        if(title) title.style.display="none";
        const indicator=document.getElementById("bloxRbxLoadingIndicator");
        if(indicator) indicator.style.display="none";
        const cancel=document.getElementById("bloxRbxLoadingCancel");
        if(cancel) cancel.classList.add("visible");
        const prompt=document.getElementById("bloxRbxClickToPlay");
        if(prompt){
            prompt.textContent=message;
            prompt.classList.add("visible","error");
        }
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent=message;
    }

    // ---------------------------------------------------------------------
    // RBXL/RBXLX completion barrier
    //
    // The Blox JS Luau VM is cooperatively scheduled. Calling a chunk that
    // reaches wait() returns control to JavaScript while the SAME Lua thread
    // continues on later scheduler ticks. For a large incremental place this
    // means "chunk call returned" is NOT equivalent to "map finished".
    //
    // The generated loader calls __BloxMapComplete only after its final object
    // and final reference assignment have actually run.
    // ---------------------------------------------------------------------
    let mapCompletionPromise=null;
    let mapCompletionResolve=null;
    let mapCompletionResult=null;

    let mapPhysicsReleaseAllowed=false;
    let mapPhysicsReleasedPromise=null;
    let mapPhysicsReleasedResolve=null;
    let mapPhysicsReleasedResult=null;
    global.__bloxRbxPhysicsReleased=false;
    global.__bloxRbxAssembliesReady=false;

    function resetMapCompletionBarrier(){
        resetLoaderStats();
        markLoaderStage("barrier-reset");
        mapCompletionResult=null;
        mapCompletionPromise=new Promise(resolve=>{
            mapCompletionResolve=resolve;
        });

        mapPhysicsReleaseAllowed=false;
        mapPhysicsReleasedResult=null;
        global.__bloxRbxPhysicsReleased=false;
        global.__bloxRbxAssembliesReady=false;
        mapPhysicsReleasedPromise=new Promise(resolve=>{
            mapPhysicsReleasedResolve=resolve;
        });

        return mapCompletionPromise;
    }

    function ensureMapCompletionBarrier(){
        return mapCompletionPromise || resetMapCompletionBarrier();
    }

    function resolveMapCompletion(result){
        if(mapCompletionResult) return;
        mapCompletionResult=result;
        const resolve=mapCompletionResolve;
        mapCompletionResolve=null;
        if(resolve) resolve(result);
    }

    async function settleLoadedMap(){
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Finalizing map...";
        await new Promise(resolve=>{
            let frames=0;
            const next=()=>{
                frames++;
                if(frames>=12){ setTimeout(resolve,500); return; }
                requestAnimationFrame(next);
            };
            requestAnimationFrame(next);
        });
    }

    async function settleReleasedPhysics(){
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Starting physics...";
        await new Promise(resolve=>{
            let frames=0;
            const next=()=>{
                frames++;
                // Large classic maps need enough disabled-physics frames for
                // explicit Weld/Snap references and implicit surface joints to
                // finish resolving before the final atomic release.
                if(frames>=12){ setTimeout(resolve,500); return; }
                requestAnimationFrame(next);
            };
            requestAnimationFrame(next);
        });
    }

    global.__BloxMapStage=function(text){
        if(!isRbxMode()) return;
        markLoaderStage(text);
        mapStageLocked=true;
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent=String(text||"");
    };

    global.__BloxMapComplete=function(bricks,connectors,totalBricks,totalConnectors,frozenCount){
        markLoaderStage("object-reference-pass-complete");
        updateProgress(bricks,connectors,totalBricks,totalConnectors);
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Finalizing map...";
        resolveMapCompletion({ok:true,bricks:Number(bricks)||0,connectors:Number(connectors)||0,frozenCount:Number(frozenCount)||0});
    };

    global.__BloxMapCanReleasePhysics=function(){ return mapPhysicsReleaseAllowed===true; };
    global.__BloxMapPhysicsReleased=function(count){
        markLoaderStage("physics-released");
        global.__bloxRbxPhysicsReleased=true;
        if(mapPhysicsReleasedResult) return;
        mapPhysicsReleasedResult={ok:true,count:Number(count)||0};
        const resolve=mapPhysicsReleasedResolve;
        mapPhysicsReleasedResolve=null;
        if(resolve) resolve(mapPhysicsReleasedResult);
    };

    global.__BloxMapFail=function(message){
        global.__bloxRbxPhysicsReleased=false;
        resolveMapCompletion({
            ok:false,
            error:String(message||"RBXL/RBXLX loader failed")
        });
    };

    global.__bloxWaitForRbxMapCompletion=async function(){
        if(!isRbxMode()) return null;

        const result=await ensureMapCompletionBarrier();
        if(!result?.ok) throw new Error(result?.error||"RBXL/RBXLX loader failed");

        console.log(`[RBX Loader] Imported object/reference pass complete: ${result.bricks} bricks, ${result.connectors} connectors.`);

        const stage=document.getElementById("bloxRbxLoadingStage");

        if(typeof global.__bloxBuildImplicitSurfaceJoints==="function"){
            const surfaceStartedAt=performance.now();
            mapStageLocked=true;
            if(stage) stage.textContent="Joining surfaces...";

            const surfaceResult=await global.__bloxBuildImplicitSurfaceJoints(
                (done,total,created)=>{
                    if(stage){
                        const percent=total>0?Math.min(100,Math.round(done/total*100)):100;
                        stage.textContent=`Joining surfaces... ${percent}% (${created} joints)`;
                    }
                }
            );

            setLoaderDuration("implicitSurfaceJointsMs",surfaceStartedAt);

            console.log(`[RBX Loader] Implicit surface-joint pass complete: ${surfaceResult?.created||0} joint(s) created across ${surfaceResult?.parts||0} candidate Part(s).`);
        }

        // Do not repeatedly rebuild a partially imported Weld/Snap/Motor graph
        // on every render frame. The emulator resumes assembly work here, then
        // settleLoadedMap() provides twelve frames to build compound bodies and
        // native joints before any originally dynamic Part is released.
        global.__bloxRbxAssembliesReady=true;
        global.__bloxMarkRigidAssemblyDirty?.();

        const settleStartedAt=performance.now();
        await settleLoadedMap();
        setLoaderDuration("assemblySettleMs",settleStartedAt);

        if(stage) stage.textContent="Unfreezing map...";
        mapPhysicsReleaseAllowed=true;

        // Return to executeLuauScript() now. It must run the dedicated release
        // chunk after this flag becomes true; waiting here would deadlock the
        // Asyncify VM exactly as v4/v5 did.
        return result;
    };

    global.__bloxWaitForRbxMapPhysicsReleased=async function(){
        if(!isRbxMode()) return null;

        const physicsResult=await mapPhysicsReleasedPromise;
        if(!physicsResult?.ok) throw new Error("RBXL/RBXLX physics release failed");

        const releaseSettleStartedAt=performance.now();
        await settleReleasedPhysics();
        // The generated Luau release chunk only restores the authored
        // Anchored values.  Let the runtime synchronize all final shapes,
        // transforms and welded assemblies while bodies are still disabled,
        // then enable them atomically.  This keeps partially imported dynamic
        // map Parts from falling into the void or exploding out of place.
        await global.__bloxFinalizeImportedPhysicsRelease?.();
        setLoaderDuration("physicsReleaseSettleMs",releaseSettleStartedAt);
        return physicsResult;
    };

    let preparedPromise=null;
    async function prepareStoredMap(){
        if(preparedPromise) return preparedPromise;
        preparedPromise=(async()=>{
            showLoading("Reading map...");
            if(!loaderStats.startedAt) resetLoaderStats();
            markLoaderStage("reading-map");
            const storageStartedAt=performance.now();
            const record=await Storage.loadCurrent(); if(!record) throw new Error("The selected RBXL/RBXLX file was not found in browser storage. Return to the launcher and choose it again.");
            setLoadingMapName(record.name);
            setLoaderDuration("storageReadMs",storageStartedAt);
            loaderStats.map={name:record.name,size:Number(record.size)||0,ext:record.ext};
            const parseStartedAt=performance.now();
            const parsed=await parse(record,stage=>{ const s=document.getElementById("bloxRbxLoadingStage"); if(s) s.textContent=stage; });
            setLoaderDuration("parseMs",parseStartedAt);

            const classHistogram={};
            for(const node of parsed.nodes||[]){
                const name=String(node?.className||"Unknown");
                classHistogram[name]=(classHistogram[name]||0)+1;
            }
            const headerInstances=Number(parsed.header?.instanceCount);
            console.log(
                `[RBX Loader] Parsed ${parsed.nodes?.length||0}` +
                `${Number.isFinite(headerInstances)?`/${headerInstances}`:""} instance(s). Classes: ` +
                Object.entries(classHistogram).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(", ")
            );
            if(Number.isFinite(headerInstances) && headerInstances!==parsed.nodes.length){
                console.warn(`[RBX Loader] Instance-count mismatch: header=${headerInstances}, parsed=${parsed.nodes.length}.`);
            }

            const generateStartedAt=performance.now();
            const generated=generateLuau(parsed,{maxMemoryMb:global.__bloxBootSettings?.mapLoaderMemoryMb});
            setLoaderDuration("generateLuauMs",generateStartedAt);
            updateProgress(0,0,generated.meta.totalBricks,generated.meta.totalConnectors);
            console.log(`[RBX Loader] ${record.name}: ${generated.meta.totalObjects} objects, ${generated.meta.totalBricks} bricks, ${generated.meta.totalConnectors} connectors, ${generated.meta.totalScripts||0} script container(s), ${generated.meta.chunkCount} Luau chunk(s), ${generated.meta.chunkByteBudget} bytes/chunk target, Luau max memory ${generated.meta.memoryMb} MB.`);
            return {chunks:generated.chunks,name:`${record.name} [RBX loader]`,meta:generated.meta,originalName:record.name};
        })().catch(error=>{ const s=document.getElementById("bloxRbxLoadingStage"); if(s) s.textContent="Load failed: "+(error?.message||error); throw error; });
        return preparedPromise;
    }

    function isRbxMode(){ const k=(sessionStorage.getItem("bloxMapKind")||"").toLowerCase(); return k==="rbxl"||k==="rbxlx"; }
    function isLoading(){ return isRbxMode() && sessionStorage.getItem("bloxMapLoaded")!=="1"; }

    global.BloxMapStorage=Storage;
    global.BloxRbxMap={parseBinary,parseXml,parse,generateLuau,lz4Decompress,matrixToEulerXYZ,sanitizeLegacyXml,prepareStoredMap,isRbxMode,isLoading};
    global.__BloxMapProgress=updateProgress;
    global.__bloxAwaitClientGesture=showClickToPlay;
    global.__bloxFinishClientLoading=hideLoading;
    global.__bloxFailClientLoading=showLoadingError;
    global.__bloxGetMapSource=async function(){ return isRbxMode()?await prepareStoredMap():null; };
    global.__bloxBeginRbxMapLoading=function(){
        if(!isRbxMode()) return;
        global.__bloxRbxPhysicsReleased=false;
        global.__bloxRbxAssembliesReady=false;
        sessionStorage.removeItem("bloxMapLoaded");
        resetMapCompletionBarrier();
        showLoading("Reading map...");
    };
    global.__bloxFailRbxMapLoading=function(error){
        if(!isRbxMode()) return;
        global.__bloxRbxPhysicsReleased=false;
        global.__bloxRbxAssembliesReady=false;
        resolveMapCompletion({
            ok:false,
            error:error?.message||String(error||"Unknown error")
        });
        showLoadingError(error);
    };

    global.__bloxFinishRbxMapLoading=async function(){
        if(!isRbxMode()) return;

        // At this point __BloxMapComplete has fired and settleLoadedMap() has
        // completed. No generated loadingCamera() calls remain after this point.
        await hideLoading();

        sessionStorage.setItem("bloxMapLoaded","1");
        markLoaderStage("finished");
        loaderStats.finishedAt=performance.now()-loaderStats.startedAt;
    };

    // Render the 2014 client gate before the module boot reaches its first await.
    if(
        autoShowClientGate &&
        typeof global.HTMLElement === "function"
    ) showClickToPlay();

})(window);
