(function (global) {
    "use strict";

    const DB_NAME = "BloxEmulationMapDB";
    const DB_VERSION = 1;
    const STORE_NAME = "maps";
    const CURRENT_KEY = "current";
    const TEXT_DECODER = new TextDecoder("utf-8");

    const SERVICE_CLASSES = new Set([
        "DataModel", "Workspace", "Lighting", "StarterGui", "StarterPack", "StarterPlayer",
        "Teams", "SoundService", "ReplicatedStorage", "ReplicatedFirst",
        "ServerStorage", "ServerScriptService", "Players", "Chat"
    ]);

    const PART_CLASSES = new Set([
        "Part", "WedgePart", "CornerWedgePart", "TrussPart", "Seat", "VehicleSeat",
        "SpawnLocation", "MeshPart", "UnionOperation", "NegateOperation"
    ]);

    const CONNECTOR_CLASSES = new Set([
        "Weld", "Snap", "Glue", "Motor", "Motor6D", "Rotate", "RotateP", "RotateV",
        "ManualWeld", "ManualGlue", "WeldConstraint", "HingeConstraint", "RodConstraint",
        "RopeConstraint", "SpringConstraint", "BallSocketConstraint", "PrismaticConstraint",
        "CylindricalConstraint"
    ]);

    const SUPPORTED_INSTANCE_CLASSES = new Set([
        "Part", "WedgePart", "SpawnLocation", "Seat", "Model", "Folder", "Backpack",
        "Tool", "HopperBin", "Humanoid", "HumanoidDescription", "BodyColors", "Shirt",
        "Pants", "ShirtGraphic", "Sound", "ForceField", "ClickDetector", "Sparkles",
        "Message", "Hint", "Sky", "Team", "Decal", "ParticleEmitter", "ScreenGui",
        "Frame", "TextLabel", "TextButton", "TextBox", "ImageButton", "BillboardGui",
        "ImageLabel", "Explosion", "Terrain", "SelectionBox", "RemoteEvent", "BindableEvent",
        "RemoteFunction", "BindableFunction", "Weld", "Motor", "Motor6D", "Rotate", "Snap",
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
        "Material", "MaterialVariant", "CustomPhysicalProperties",
        "Size", "Position", "Orientation", "CFrame", "Color", "Color3", "BrickColor",
        "Velocity", "RotVelocity", "AssemblyLinearVelocity", "AssemblyAngularVelocity",
        "TopSurface", "BottomSurface", "LeftSurface", "RightSurface", "FrontSurface", "BackSurface",
        "Health", "MaxHealth", "WalkSpeed", "JumpPower", "Jump", "Sit", "PlatformStand", "AutoRotate",
        "SoundId", "Volume", "Looped", "PlaybackSpeed", "Pitch", "TimePosition",
        "Texture", "TextureId", "TextureID", "Face", "StudsPerTileU", "StudsPerTileV", "ZIndex",
        "Text", "TextColor3", "TextTransparency", "TextScaled", "TextWrapped", "TextXAlignment",
        "TextYAlignment", "Font", "BackgroundColor3", "BackgroundTransparency", "BorderColor3",
        "BorderSizePixel", "Visible", "Active", "Draggable", "Image", "ImageColor3", "ImageTransparency",
        "Rotation", "Ambient", "OutdoorAmbient", "Brightness", "ClockTime", "TimeOfDay", "FogStart",
        "FogEnd", "FogColor", "GlobalShadows", "GeographicLatitude", "SkyboxBk", "SkyboxDn", "SkyboxFt",
        "SkyboxLf", "SkyboxRt", "SkyboxUp", "CelestialBodiesShown", "StarCount", "MoonAngularSize",
        "SunAngularSize", "ShirtTemplate", "PantsTemplate", "Graphic", "HeadColor", "TorsoColor",
        "LeftArmColor", "RightArmColor", "LeftLegColor", "RightLegColor", "MaxForce", "P", "D",
        "MaxTorque", "Force", "AngularVelocity", "Location", "CartoonFactor", "MaxSpeed", "MaxThrust",
        "TargetOffset", "TargetRadius", "ThrustD", "ThrustP", "TurnD", "TurnP", "C0", "C1",
        "DesiredAngle", "CurrentAngle", "MaxVelocity", "Part0", "Part1", "PrimaryPart", "Adornee",
        "Target", "WalkToPart", "Object", "CameraSubject",
        // Classic + newer BackpackItem/Tool serialization. These are required by
        // old rocket/sword tools and are intentionally preserved even when the
        // renderer does not use every field directly.
        "Grip", "GripPos", "GripForward", "GripRight", "GripUp", "ToolTip",
        "CanBeDropped", "RequiresHandle", "ManualActivationOnly", "BinType",
        "MaxActivationDistance", "CursorIcon"
    ]);

    const REF_PROPERTIES = new Set([
        "Part0", "Part1", "PrimaryPart", "Adornee", "Target", "WalkToPart", "Object", "CameraSubject"
    ]);

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
        ["c0", "C0"],
        ["c1", "C1"],
        ["anchored", "Anchored"],
        ["velocity", "Velocity"],
        ["rotVelocity", "RotVelocity"],
        ["rotvelocity", "RotVelocity"]
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
        BinType: ["Script", "GameTool", "Grab", "Clone", "Hammer"]
    };

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
                    for(let i=0;i<count;i++){ const enc=vr.u32be(), off=zigzag32(vr.u32le()); a.push(V("udim",{scale:rotateFloatBits(enc),offset:off})); } return a;
                }
                case 0x07: {
                    const b=deinterleave(r.bytesN(count*16),count,16), vr=new Reader(b), a=[];
                    for(let i=0;i<count;i++){ const sx=rotateFloatBits(vr.u32be()), sy=rotateFloatBits(vr.u32be()), ox=zigzag32(vr.u32le()), oy=zigzag32(vr.u32le()); a.push(V("udim2",{sx,ox,sy,oy})); } return a;
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
        return null;
    }

    function parseXml(buffer) {
        const text=typeof buffer==="string"?buffer:TEXT_DECODER.decode(new Uint8Array(buffer));
        const doc=new DOMParser().parseFromString(text,"application/xml");
        const parseError=doc.querySelector("parsererror"); if(parseError) throw new Error("Invalid RBXLX XML: "+parseError.textContent.slice(0,240));
        const shared=new Map();
        for(const el of doc.querySelectorAll("SharedStrings > SharedString")) {
            const key=el.getAttribute("md5") || "", raw=xmlText(el).trim();
            try { shared.set(key, atob(raw)); } catch { shared.set(key, raw); }
        }
        const nodes=[], byRef=new Map(); let syntheticId=1;
        function visit(item,parentId){
            const ref=item.getAttribute("referent") || `xml-${syntheticId++}`;
            const node={id:ref,ref,className:item.getAttribute("class") || "Folder",parentId,isService:false,properties:{},children:[]};
            const props=firstElementChildByTag(item,"Properties");
            if(props) for(const p of props.children){ const name=p.getAttribute("name"); if(!name) continue; const v=xmlPropertyValue(p,shared); if(v) node.properties[name]=v; }
            nodes.push(node); byRef.set(ref,node);
            for(const child of item.children) if(child.tagName==="Item") { const c=visit(child,ref); node.children.push(c); }
            return node;
        }
        const rootEl=doc.documentElement, roots=[];
        for(const child of rootEl.children) if(child.tagName==="Item") roots.push(visit(child,-1));
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
        return JSON.stringify(s).replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
    }
    function safeNumber(n, fallback=0) { n=Number(n); return Number.isFinite(n)?n:fallback; }
    function tokenToLua(name, v) {
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
            case "numbersequence": return `NumberSequence.new({${(v||[]).map(k=>`NumberSequenceKeypoint.new(${safeNumber(k.time)},${safeNumber(k.value)},${safeNumber(k.envelope)})`).join(",")}})`;
            case "colorsequence": return `ColorSequence.new({${(v||[]).map(k=>`ColorSequenceKeypoint.new(${safeNumber(k.time)},Color3.fromRGB(${Math.max(0,Math.min(255,Math.round(safeNumber(k.r)*255)))},${Math.max(0,Math.min(255,Math.round(safeNumber(k.g)*255)))},${Math.max(0,Math.min(255,Math.round(safeNumber(k.b)*255))) }))`).join(",")}})`;
            default: return null;
        }
    }

    function classForEmulator(className) {
        // A Roblox place may serialize its editor/current Camera. The emulator
        // already exposes one host-only workspace.CurrentCamera, so never create
        // a second hierarchy object for serialized Cameras.
        if(className==="Camera") return null;

        if(SUPPORTED_INSTANCE_CLASSES.has(className)) return className;

        // Modern WeldConstraint has Part0/Part1 but no classic C0/C1. Import it
        // as a classic Weld and synthesize its rest transform after both parts
        // exist. RotateP/RotateV are old hinge variants represented by Rotate.
        if(className==="WeldConstraint") return "Weld";
        if(className==="RotateP" || className==="RotateV") return "Rotate";

        if(className==="CornerWedgePart" || className==="TrussPart" || className==="MeshPart" || className==="UnionOperation" || className==="NegateOperation" || className==="VehicleSeat") return "Part";
        if(className==="PointLight" || className==="SpotLight" || className==="SurfaceLight") return "Folder";
        if(className==="Attachment") return "Folder";
        return "Folder";
    }

    const RIGID_JOINT_CLASSES = new Set([
        "Weld", "Snap", "Glue", "ManualWeld", "ManualGlue"
    ]);

    function flattenParentFirst(parsed) {
        const out=[], visited=new Set();
        function walk(n){ if(!n||visited.has(n.id)) return; visited.add(n.id); out.push(n); for(const c of n.children||[]) walk(c); }
        for(const r of parsed.roots||[]) walk(r);
        for(const n of parsed.nodes||[]) walk(n);
        return out;
    }

    function generateLuau(parsed, options={}) {
        const order=flattenParentFirst(parsed);
        const descriptors=[];
        const refs=[];
        let totalBricks=0,totalConnectors=0;
        for(const node of order){
            const isService=node.isService || SERVICE_CLASSES.has(node.className);
            const emuClass=isService?node.className:classForEmulator(node.className);
            if(!emuClass) continue;
            if(PART_CLASSES.has(node.className) || ["Part","WedgePart","SpawnLocation","Seat"].includes(emuClass)) totalBricks++;
            if(CONNECTOR_CLASSES.has(node.className)) totalConnectors++;
            const props=[];
            const normalizedProperties=new Map();
            for(const [serializedName,wrapped] of Object.entries(node.properties||{})) {
                normalizedProperties.set(normalizePropertyName(serializedName),wrapped);
            }

            // Modern BaseParts serialize their true display color as Color3uint8, while
            // old files may only contain BrickColor. If an exact Color is present, do not
            // also assign legacy BrickColor during construction because the emulator's
            // BrickColor synchronizer would intentionally recolor the Part.
            const hasExactPartColor=PART_CLASSES.has(node.className) && normalizedProperties.has("Color");

            // CFrame is converted to Position+Orientation for BaseParts because the emulator's
            // physical Part sync tracks those fields directly.
            const cframe=normalizedProperties.get("CFrame") || normalizedProperties.get("CoordinateFrame");
            if(cframe?.kind==="cframe" && PART_CLASSES.has(node.className)){
                const p=cframe.value.position, o=cframe.value.orientation;
                props.push(["Position",`Vector3.new(${safeNumber(p.x)},${safeNumber(p.y)},${safeNumber(p.z)})`]);
                props.push(["Orientation",`Vector3.new(${safeNumber(o.x)},${safeNumber(o.y)},${safeNumber(o.z)})`]);
            }

            for(const [name,wrapped] of normalizedProperties){
                if(name==="CFrame" || name==="CoordinateFrame" || name==="Parent" || name==="Active") continue;
                if(hasExactPartColor && name==="BrickColor") continue;
                // A place file can contain the linear/angular velocity that a Part
                // happened to have when it was saved. Replaying those stale values
                // after the RBXL loading freeze is released can launch an entire
                // classic assembly. Roblox place startup should begin stable; map
                // scripts/BodyMovers can apply motion after loading.
                if(PART_CLASSES.has(node.className) && (name==="Velocity" || name==="RotVelocity")) continue;
                if(!COMMON_PROPERTIES.has(name)) continue;
                if(REF_PROPERTIES.has(name) || wrapped?.kind==="ref") { if(wrapped?.kind==="ref" && wrapped.value!=="null" && wrapped.value!==-1) refs.push([String(node.id),name,String(wrapped.value)]); continue; }
                const expr=valueToLua(name,wrapped); if(expr!==null) props.push([name,expr]);
            }
            const nameWrapped=node.properties.Name;
            const displayName=nameWrapped?.kind==="string"?nameWrapped.value:node.className;

            // Classic 2008 JointInstance uses Part0/Part1/C0/C1 and enforces:
            //     Part1.CFrame * C1 == Part0.CFrame * C0
            // valueToLua() emits serialized C0/C1 from the full 3x3 matrix, not
            // Euler angles. WeldConstraint (and a few old surface-joint records)
            // can omit both frames; only in that case derive a rest frame from
            // the authored Part transforms so the map does not collapse.
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
        const lines=[];
        lines.push("-- Generated by Blox Emulation RBXL/RBXLX incremental loader");
        lines.push(`local TOTAL_BRICKS=${totalBricks}`);
        lines.push(`local TOTAL_CONNECTORS=${totalConnectors}`);
        lines.push("local loadedBricks=0 local loadedConnectors=0 local made=0");
        lines.push("local created={}");
        lines.push("local frozenParts={}");
        lines.push("local allParts={}");
        lines.push("local Players=game:GetService(\"Players\") local lp=Players.LocalPlayer");
        lines.push("local cam=workspace.CurrentCamera local firstPart=nil");
        lines.push("local function loadingCamera() if firstPart and cam then local p=firstPart.Position cam.CameraType=Enum.CameraType.Scriptable cam.CameraSubject=firstPart cam.CFrame=CFrame.lookAt(Vector3.new(p.X,p.Y+600,p.Z+1374.773),p) end end");
        lines.push("local function progress() __BloxMapProgress(loadedBricks,loadedConnectors,TOTAL_BRICKS,TOTAL_CONNECTORS) loadingCamera() end");
        lines.push("local function setprop(o,k,v) local ok,err=pcall(function() o[k]=v end) end");
        lines.push("local function ispart(c) return c==\"Part\" or c==\"WedgePart\" or c==\"CornerWedgePart\" or c==\"TrussPart\" or c==\"Seat\" or c==\"VehicleSeat\" or c==\"SpawnLocation\" or c==\"MeshPart\" or c==\"UnionOperation\" or c==\"NegateOperation\" end");
        lines.push("progress()");
        lines.push("local function add(id,parentId,className,sourceClass,name,isService,props)");
        lines.push(" local o=nil");
        lines.push(" if isService then if className==\"DataModel\" then o=game else local ok,res=pcall(function() return game:GetService(className) end) if ok then o=res end end else local ok,res=pcall(function() return Instance.new(className) end) if ok then o=res end end");
        lines.push(" if not o then return nil end created[id]=o if name and name~=\"\" then setprop(o,\"Name\",name) end");
        lines.push(" local basePart=ispart(sourceClass)");
        lines.push(" if props then for k,v in pairs(props) do if not (basePart and (k==\"Anchored\" or k==\"Velocity\" or k==\"RotVelocity\")) then setprop(o,k,v) end end end");
        lines.push(" if basePart then allParts[#allParts+1]=o setprop(o,\"Velocity\",Vector3.new(0,0,0)) setprop(o,\"RotVelocity\",Vector3.new(0,0,0)) local desired=false if props and props.Anchored~=nil then desired=props.Anchored==true end setprop(o,\"Anchored\",true) if not desired then frozenParts[#frozenParts+1]=o end end");
        lines.push(" if not isService then local par=created[parentId] if not par then par=workspace end setprop(o,\"Parent\",par) end");
        lines.push(" if basePart then loadedBricks=loadedBricks+1 if not firstPart then firstPart=o loadingCamera() end end");
        lines.push(" if sourceClass==\"Weld\" or sourceClass==\"Snap\" or sourceClass==\"Glue\" or sourceClass==\"Motor\" or sourceClass==\"Motor6D\" or sourceClass==\"Rotate\" or sourceClass==\"RotateP\" or sourceClass==\"RotateV\" or sourceClass==\"ManualWeld\" or sourceClass==\"ManualGlue\" or sourceClass==\"WeldConstraint\" then loadedConnectors=loadedConnectors+1 end");
        lines.push(" made=made+1 if made%2==0 then progress() wait(0.012) end return o end");

        for(const d of descriptors){
            const pitems=d.props.map(([k,v])=>`[${luaString(k)}]=${v}`).join(",");
            lines.push(`add(${luaString(d.id)},${luaString(d.parent)},${luaString(d.className)},${luaString(d.sourceClass)},${luaString(d.name)},${d.isService?"true":"false"},{${pitems}})`);
        }
        if(refs.length){
            lines.push("-- Resolve object references after every instance exists.");
            lines.push("__BloxMapStage(\"Resolving references...\")");
            lines.push("local refsMade=0");
            lines.push("local function ref(a,k,b) local o=created[a] local v=created[b] if o and v then setprop(o,k,v) end refsMade=refsMade+1 if refsMade%4==0 then progress() wait(0.012) end end");
            for(const [a,k,b] of refs) lines.push(`ref(${luaString(a)},${luaString(k)},${luaString(b)})`);
        }

        // Explicit JointInstance references are now complete. Tell the host that
        // its cached rigid-assembly graph must be rebuilt before surface inference
        // and before the loading freeze is released.
        lines.push("if __BloxMapAssemblyDirty then __BloxMapAssemblyDirty() end");

        // Implicit classic surface joints are reconstructed by one optimized
        // host-side pass after all explicit objects/references have loaded.
        lines.push("__BloxMapStage(\"Resolving imported joints...\")");

        const posePreservingRigidJoints = descriptors.filter(d=>d.preserveRigidJointPose);
        if(posePreservingRigidJoints.length){
            // Let BasePart Position/Orientation reach the physics/CFrame mirror before
            // deriving a missing classic JointInstance rest transform.
            lines.push("__BloxMapStage(\"Preserving joint poses...\")");
            lines.push("progress() wait(0.016)");
            lines.push("local preservedJointPoses=0");
            lines.push("local function preservejointpose(id) local j=created[id] if j and j.Part0 and j.Part1 then local ok,rel=pcall(function() return j.Part0.CFrame:ToObjectSpace(j.Part1.CFrame) end) if ok and rel then setprop(j,\"C0\",rel) setprop(j,\"C1\",CFrame.new()) end end preservedJointPoses=preservedJointPoses+1 if preservedJointPoses%16==0 then wait(0.004) end end");
            for(const d of posePreservingRigidJoints) lines.push(`preservejointpose(${luaString(d.id)})`);
        }
        // IMPORTANT: the JS wrapper for the pure-JS Luau VM returns as soon as
        // this loader first yields. The host therefore must not assume the map
        // is finished just because activeLuauChunk() returned. Signal completion
        // explicitly from the END of the scheduled Luau task.
        lines.push("__BloxMapStage(\"Imported objects complete...\")");
        lines.push("progress()");
        lines.push("__BloxMapComplete(loadedBricks,loadedConnectors,TOTAL_BRICKS,TOTAL_CONNECTORS,#frozenParts)");
        lines.push("while not __BloxMapCanReleasePhysics() do wait(0.016) end");
        lines.push("for _,p in ipairs(frozenParts) do if p then setprop(p,\"Anchored\",false) end end");
        lines.push("__BloxMapPhysicsReleased(#frozenParts)");
        lines.push("return true");
        return {source:lines.join("\n"),meta:{totalBricks,totalConnectors,totalObjects,format:parsed.format}};
    }

    const CORE_UI_IDS=["classicTopBar","classicMessageStack","classicHealthHud","classicChatPanel","classicPlayerList","classicHotbar","classicChatBar","classicToolsMenu","classicInsertMenu","bloxGuiRoot","start"];
    let uiDisplayCache=new Map();
    function setCoreUiHidden(hidden){
        for(const id of CORE_UI_IDS){ const el=document.getElementById(id); if(!el) continue; if(hidden){ if(!uiDisplayCache.has(id)) uiDisplayCache.set(id,el.style.display); el.style.display="none"; } else { const prev=uiDisplayCache.get(id); el.style.display=prev===undefined?"":prev; } }
    }
    function ensureLoadingOverlay(){
        let root=document.getElementById("bloxRbxLoadingScreen"); if(root) return root;
        const style=document.createElement("style"); style.id="bloxRbxLoadingStyle"; style.textContent=`
#bloxRbxLoadingScreen{position:fixed;inset:0;z-index:2147483000;pointer-events:auto;font-family:Arial,Helvetica,sans-serif;color:#fff;display:none}
#bloxRbxLoadingScreen .blox-load-panel{position:absolute;left:15%;right:15%;top:25%;height:42%;background:rgba(135,135,135,.48);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-direction:column;text-shadow:0 1px 1px rgba(0,0,0,.22)}
#bloxRbxLoadingCount{font-size:clamp(30px,4vw,64px);font-weight:400;letter-spacing:1px;white-space:nowrap}
#bloxRbxLoadingStage{font-size:clamp(13px,1.3vw,21px);margin-top:18px;opacity:.9}
`;
        document.head.appendChild(style);
        root=document.createElement("div"); root.id="bloxRbxLoadingScreen"; root.innerHTML='<div class="blox-load-panel"><div id="bloxRbxLoadingCount">Bricks: 0&nbsp;&nbsp;&nbsp; Connectors: 0</div><div id="bloxRbxLoadingStage">Reading map...</div></div>';
        document.body.appendChild(root); return root;
    }
    let mapStageLocked=false;

    function showLoading(stage="Reading map..."){
        setCoreUiHidden(true);
        const root=ensureLoadingOverlay();
        root.style.display="block";
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
    function hideLoading(){ const root=document.getElementById("bloxRbxLoadingScreen"); if(root) root.style.display="none"; setCoreUiHidden(false); }

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

    function resetMapCompletionBarrier(){
        mapCompletionResult=null;
        mapCompletionPromise=new Promise(resolve=>{
            mapCompletionResolve=resolve;
        });

        mapPhysicsReleaseAllowed=false;
        mapPhysicsReleasedResult=null;
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
                if(frames>=6){ setTimeout(resolve,250); return; }
                requestAnimationFrame(next);
            };
            requestAnimationFrame(next);
        });
    }

    global.__BloxMapStage=function(text){
        if(!isRbxMode()) return;
        mapStageLocked=true;
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent=String(text||"");
    };

    global.__BloxMapComplete=function(bricks,connectors,totalBricks,totalConnectors,frozenCount){
        updateProgress(bricks,connectors,totalBricks,totalConnectors);
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Finalizing map...";
        resolveMapCompletion({ok:true,bricks:Number(bricks)||0,connectors:Number(connectors)||0,frozenCount:Number(frozenCount)||0});
    };

    global.__BloxMapCanReleasePhysics=function(){ return mapPhysicsReleaseAllowed===true; };
    global.__BloxMapPhysicsReleased=function(count){
        if(mapPhysicsReleasedResult) return;
        mapPhysicsReleasedResult={ok:true,count:Number(count)||0};
        const resolve=mapPhysicsReleasedResolve;
        mapPhysicsReleasedResolve=null;
        if(resolve) resolve(mapPhysicsReleasedResult);
    };

    global.__BloxMapFail=function(message){
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

            console.log(`[RBX Loader] Implicit surface-joint pass complete: ${surfaceResult?.created||0} joint(s) created across ${surfaceResult?.parts||0} candidate Part(s).`);
        }

        await settleLoadedMap();

        if(stage) stage.textContent="Unfreezing map...";
        mapPhysicsReleaseAllowed=true;

        const physicsResult=await mapPhysicsReleasedPromise;
        if(!physicsResult?.ok) throw new Error("RBXL/RBXLX physics release failed");

        await settleReleasedPhysics();

        return {...result,physicsReleased:physicsResult.count};
    };

    let preparedPromise=null;
    async function prepareStoredMap(){
        if(preparedPromise) return preparedPromise;
        preparedPromise=(async()=>{
            showLoading("Reading map...");
            const record=await Storage.loadCurrent(); if(!record) throw new Error("The selected RBXL/RBXLX file was not found in browser storage. Return to the launcher and choose it again.");
            const parsed=await parse(record,stage=>{ const s=document.getElementById("bloxRbxLoadingStage"); if(s) s.textContent=stage; });
            const generated=generateLuau(parsed);
            updateProgress(0,0,generated.meta.totalBricks,generated.meta.totalConnectors);
            console.log(`[RBX Loader] ${record.name}: ${generated.meta.totalObjects} objects, ${generated.meta.totalBricks} bricks, ${generated.meta.totalConnectors} connectors.`);
            return {source:generated.source,name:`${record.name} [RBX loader]`,meta:generated.meta,originalName:record.name};
        })().catch(error=>{ const s=document.getElementById("bloxRbxLoadingStage"); if(s) s.textContent="Load failed: "+(error?.message||error); throw error; });
        return preparedPromise;
    }

    function isRbxMode(){ const k=(sessionStorage.getItem("bloxMapKind")||"").toLowerCase(); return k==="rbxl"||k==="rbxlx"; }
    function isLoading(){ return isRbxMode() && sessionStorage.getItem("bloxMapLoaded")!=="1"; }

    global.BloxMapStorage=Storage;
    global.BloxRbxMap={parseBinary,parseXml,parse,generateLuau,lz4Decompress,matrixToEulerXYZ,prepareStoredMap,isRbxMode,isLoading};
    global.__BloxMapProgress=updateProgress;
    global.__bloxGetMapSource=async function(){ return isRbxMode()?await prepareStoredMap():null; };
    global.__bloxBeginRbxMapLoading=function(){
        if(!isRbxMode()) return;
        sessionStorage.removeItem("bloxMapLoaded");
        resetMapCompletionBarrier();
        showLoading("Reading map...");
    };
    global.__bloxFailRbxMapLoading=function(error){
        if(!isRbxMode()) return;
        resolveMapCompletion({
            ok:false,
            error:error?.message||String(error||"Unknown error")
        });
        showLoading("Load failed");
        const stage=document.getElementById("bloxRbxLoadingStage");
        if(stage) stage.textContent="Load failed: "+(error?.message||String(error||"Unknown error"));
        const panel=document.querySelector("#bloxRbxLoadingScreen .blox-load-panel");
        if(panel && !document.getElementById("bloxRbxLoadReturn")){
            const button=document.createElement("button"); button.id="bloxRbxLoadReturn"; button.textContent="Return";
            button.style.cssText="margin-top:22px;padding:8px 24px;font:16px Arial;cursor:pointer";
            button.onclick=()=>{ if(document.getElementById("launcherPage")) location.reload(); else location.href="index.html"; };
            panel.appendChild(button);
        }
    };

    global.__bloxFinishRbxMapLoading=async function(){
        if(!isRbxMode()) return;

        // At this point __BloxMapComplete has fired and settleLoadedMap() has
        // completed. No generated loadingCamera() calls remain after this point.
        hideLoading();

        const start=document.getElementById("start");
        if(start) start.style.display="none";

        sessionStorage.setItem("bloxMapLoaded","1");
    };

})(window);
