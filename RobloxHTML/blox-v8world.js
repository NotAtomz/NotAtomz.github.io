/*
 * Blox v9 classic v8world-style physics kernel.
 * Browser-only, dependency-free physics compatibility layer.
 * Architecture reconstructed around Roblox's legacy Primitive -> Clump ->
 * Assembly -> Mechanism model. It intentionally does not use Rapier.
 */

const EPS = 1e-7;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v=(x=0,y=0,z=0)=>({x:+x||0,y:+y||0,z:+z||0});
const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const len2=a=>dot(a,a);
const len=a=>Math.sqrt(len2(a));
const norm=a=>{const l=len(a);return l>EPS?mul(a,1/l):v(0,1,0)};
const absVec=a=>v(Math.abs(a.x),Math.abs(a.y),Math.abs(a.z));
const q=(x=0,y=0,z=0,w=1)=>({x:+x||0,y:+y||0,z:+z||0,w:Number.isFinite(+w)?+w:1});
const qnorm=a=>{const l=Math.hypot(a.x,a.y,a.z,a.w)||1;return q(a.x/l,a.y/l,a.z/l,a.w/l)};
const qmul=(a,b)=>q(
 a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
 a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
 a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
 a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z
);
const qinv=a=>{const d=a.x*a.x+a.y*a.y+a.z*a.z+a.w*a.w||1;return q(-a.x/d,-a.y/d,-a.z/d,a.w/d)};
const qrot=(qq,p)=>{const t=mul(cross(v(qq.x,qq.y,qq.z),p),2);return add(p,add(mul(t,qq.w),cross(v(qq.x,qq.y,qq.z),t)))};
const integrateQ=(qq,w,dt)=>qnorm(qmul(q(w.x*dt*.5,w.y*dt*.5,w.z*dt*.5,1),qq));
const qFromAxis=(axis,ang)=>{axis=norm(axis);const s=Math.sin(ang/2);return q(axis.x*s,axis.y*s,axis.z*s,Math.cos(ang/2))};
const qToAxisAngle=qq=>{qq=qnorm(qq);let w=clamp(qq.w,-1,1);let a=2*Math.acos(w);let s=Math.sqrt(Math.max(0,1-w*w));return {axis:s<1e-5?v(1,0,0):v(qq.x/s,qq.y/s,qq.z/s),angle:a>Math.PI?a-2*Math.PI:a}};
const compMul=(a,b)=>v(a.x*b.x,a.y*b.y,a.z*b.z);
function invInertiaWorldMul(body,vec){
    if(!body||body.type!=='dynamic'||body.lockedRotations)return v();
    body._ensureMassProperties?.();
    const local=qrot(qinv(body.r),vec);
    const scaled=compMul(local,body.invInertia);
    const out=qrot(body.r,scaled);
    if(!body.enabledRotations[0])out.x=0;
    if(!body.enabledRotations[1])out.y=0;
    if(!body.enabledRotations[2])out.z=0;
    return out;
}
function applyImpulseAt(body,impulse,offset,wake=true){
    if(!body||body.type!=='dynamic')return;
    body._ensureMassProperties?.();
    body.lv=add(body.lv,mul(impulse,body.invMass));
    if(!body.lockedRotations){
        body.av=add(body.av,invInertiaWorldMul(body,cross(offset,impulse)));
    }
    if(wake)body.wakeUp();
}
function applyPositionImpulseAt(body,impulse,offset){
    if(!body||body.type!=='dynamic')return;
    body._ensureMassProperties?.();
    const targetCom=add(body.worldCom(),mul(impulse,body.invMass));
    if(!body.lockedRotations){
        let angularStep=invInertiaWorldMul(body,cross(offset,impulse));
        const angularLength=len(angularStep);
        // Position correction is a split impulse: it changes the pose without
        // manufacturing linear/angular velocity. Cap a pathological deep
        // overlap while allowing ordinary tilted edge contacts to level.
        if(angularLength>.12)angularStep=mul(angularStep,.12/angularLength);
        body.r=integrateQ(body.r,angularStep,1);
    }
    body._setWorldCom(targetCom);
}
function contactDominanceResponse(A,B){
    const affectA=A?.type==='dynamic';
    const affectB=B?.type==='dynamic';
    if(!affectA||!affectB||A.dominance===B.dominance){
        return {affectA,affectB,ia:affectA?(A.invMass||0):0,ib:affectB?(B.invMass||0):0};
    }
    // Match rigid-body dominance semantics: the body in the higher group is
    // treated as infinite-mass for this contact only. Non-dynamic bodies are
    // already immovable and therefore bypass this dynamic/dynamic rule.
    if(A.dominance>B.dominance){
        return {affectA:false,affectB:true,ia:0,ib:B.invMass||0};
    }
    return {affectA:true,affectB:false,ia:A.invMass||0,ib:0};
}
function effectiveMassAlong(A,B,ra,rb,axis,response=null){
    A?._ensureMassProperties?.();
    B?._ensureMassProperties?.();
    const affectA=response?response.affectA:A?.type==='dynamic';
    const affectB=response?response.affectB:B?.type==='dynamic';
    let k=response?(response.ia+response.ib):((A?.invMass||0)+(B?.invMass||0));
    if(affectA&&A?.type==='dynamic'&&!A.lockedRotations){
        const a=invInertiaWorldMul(A,cross(ra,axis));
        k+=dot(axis,cross(a,ra));
    }
    if(affectB&&B?.type==='dynamic'&&!B.lockedRotations){
        const b=invInertiaWorldMul(B,cross(rb,axis));
        k+=dot(axis,cross(b,rb));
    }
    return Math.max(EPS,k);
}

let NEXT_BODY=1,NEXT_COL=1,NEXT_JOINT=1;

class RigidBodyDesc {
 constructor(type){this.type=type;this.translation=v();this.rotation=q();this.additionalMass=0;this.linearDamping=.035;this.angularDamping=.05;this.gravityScale=1;this.ccd=false;this.lockedRotations=false;}
 static dynamic(){return new RigidBodyDesc('dynamic')}
 static fixed(){return new RigidBodyDesc('fixed')}
 static kinematicPositionBased(){return new RigidBodyDesc('kinematic')}
 static kinematicPosition(){return RigidBodyDesc.kinematicPositionBased()}
 setTranslation(x,y,z){ if(typeof x==='object')this.translation=v(x.x,x.y,x.z); else this.translation=v(x,y,z);return this }
 setRotation(r){this.rotation=qnorm(q(r?.x,r?.y,r?.z,r?.w));return this}
 setAdditionalMass(m){this.additionalMass=Math.max(0,+m||0);return this}
 setLinearDamping(x){this.linearDamping=Math.max(0,+x||0);return this}
 setAngularDamping(x){this.angularDamping=Math.max(0,+x||0);return this}
 setGravityScale(x){this.gravityScale=+x||0;return this}
 setCcdEnabled(x){this.ccd=!!x;return this}
 lockRotations(){this.lockedRotations=true;return this}
}

class ColliderDesc {
 constructor(shape,data={}){this.shape=shape;this.data=data;this.translation=v();this.rotation=q();this.mass=null;this.density=1;this.friction=.3;this.restitution=.5;this.frictionWeight=1;this.elasticityWeight=1;this.restitutionEnabled=false;this.sensor=false;this.enabled=true;this.groups=0xffffffff;this.activeHooks=0;}
 static cuboid(hx,hy,hz){return new ColliderDesc('cuboid',{hx:Math.abs(hx),hy:Math.abs(hy),hz:Math.abs(hz)})}
 static ball(r){return new ColliderDesc('ball',{r:Math.abs(r)})}
 static cylinder(hh,r){return new ColliderDesc('cylinder',{hh:Math.abs(hh),r:Math.abs(r),segments:16})}
 static capsule(hh,r){return new ColliderDesc('capsule',{hh:Math.abs(hh),r:Math.abs(r)})}
 static convexHull(arr){const a=Array.from(arr||[]);if(a.length<12)return null;return new ColliderDesc('convex',{verts:a})}
 setTranslation(x,y,z){if(typeof x==='object')this.translation=v(x.x,x.y,x.z);else this.translation=v(x,y,z);return this}
 setRotation(r){this.rotation=qnorm(q(r?.x,r?.y,r?.z,r?.w));return this}
 setMass(m){this.mass=Math.max(0,+m||0);return this}
 setDensity(d){this.density=Math.max(0,+d||0);return this}
 setFriction(x){this.friction=Math.max(0,+x||0);return this}
 setRestitution(x){this.restitution=clamp(+x||0,0,1);return this}
 setFrictionWeight(x){this.frictionWeight=Math.max(0,+x||0);return this}
 setElasticityWeight(x){this.elasticityWeight=Math.max(0,+x||0);return this}
 setRestitutionEnabled(x){this.restitutionEnabled=!!x;return this}
 setSensor(x){this.sensor=!!x;return this}
 setEnabled(x){this.enabled=!!x;return this}
 setCollisionGroups(x){this.groups=(x>>>0);return this}
 setActiveHooks(x){this.activeHooks=x|0;return this}
 setFrictionCombineRule(){return this}
 setRestitutionCombineRule(){return this}
}

class RigidBody {
 constructor(world,desc){
   this.world=world;this.handle=NEXT_BODY++;this.type=desc.type;
   this.p={...desc.translation};this.r={...desc.rotation};
   this.lv=v();this.av=v();this.force=v();this.torque=v();
   this.additionalMass=desc.additionalMass;this.linearDamping=desc.linearDamping;this.angularDamping=desc.angularDamping;
   this._gravityScale=desc.gravityScale;this.ccd=desc.ccd;this.lockedRotations=desc.lockedRotations;
   this.enabledRotations=[true,true,true];this.colliders=[];this.valid=true;this.enabled=true;this.sleeping=false;this.sleepTimer=0;
   this.massValue=Math.max(.001,this.additionalMass||1);this.invMass=this.type==='dynamic'?1/this.massValue:0;
   this.localCom=v();this.inertia=v(1,1,1);this.invInertia=v(1,1,1);this.dominance=0;this._massDirty=false;
 }
 translation(){return {...this.p}}
 rotation(){return {...this.r}}
 linvel(){return {...this.lv}}
 angvel(){return {...this.av}}
 mass(){this._ensureMassProperties();return this.massValue}
 gravityScale(){return this._gravityScale}
 isCcdEnabled(){return this.ccd}
 isSleeping(){return this.sleeping}
 isValid(){return this.valid}
 isEnabled(){return this.enabled}
 isDynamic(){return this.type==='dynamic'}
 isFixed(){return this.type==='fixed'}
 isKinematic(){return this.type==='kinematic'}
 bodyType(){return this.type==='dynamic'?RigidBodyType.Dynamic:(this.type==='fixed'?RigidBodyType.Fixed:RigidBodyType.KinematicPositionBased)}
 numColliders(){return this.colliders.filter(c=>c.valid).length}
 collider(i){return this.colliders.filter(c=>c.valid)[i]||null}
 wakeUp(){if(!this.valid)return;this.sleeping=false;this.sleepTimer=0}
 sleep(){if(!this.valid)return;this.sleeping=true;this.lv=v();this.av=v();this.force=v();this.torque=v()}
 setEnabled(x){const next=!!x;if(this.enabled===next)return;this.enabled=next;if(!next)this.sleep();else this.wakeUp();this.world._staticDirty=true}
  setTranslation(p,wake=true){const next=v(p?.x,p?.y,p?.z);if(wake)this.wakeUp();if(this.p.x===next.x&&this.p.y===next.y&&this.p.z===next.z)return;this.p=next;if(this.type==='fixed')this.world._staticDirty=true}
  setRotation(r,wake=true){const next=qnorm(q(r?.x,r?.y,r?.z,r?.w));if(wake)this.wakeUp();if(this.r.x===next.x&&this.r.y===next.y&&this.r.z===next.z&&this.r.w===next.w)return;this.r=next;if(this.type==='fixed')this.world._staticDirty=true}
 setLinvel(x,wake=true){this.lv=v(x?.x,x?.y,x?.z);if(wake)this.wakeUp()}
 setAngvel(x,wake=true){
   this.av=v(x?.x,x?.y,x?.z);
   if(this.lockedRotations)this.av=v();
   else{
     if(!this.enabledRotations[0])this.av.x=0;
     if(!this.enabledRotations[1])this.av.y=0;
     if(!this.enabledRotations[2])this.av.z=0;
   }
   if(wake)this.wakeUp()
 }
 setGravityScale(x,wake=true){this._gravityScale=Number.isFinite(+x)?+x:1;if(wake)this.wakeUp()}
 setLinearDamping(x){this.linearDamping=Math.max(0,+x||0)}
 setAngularDamping(x){this.angularDamping=Math.max(0,+x||0)}
 setAdditionalSolverIterations(){}
 enableCcd(x){this.ccd=!!x}
 setCcdEnabled(x){this.ccd=!!x}
 setDominanceGroup(x){this.dominance=x|0}
 setEnabledRotations(x,y,z,wake=true){this.enabledRotations=[!!x,!!y,!!z];this.lockedRotations=!x&&!y&&!z;if(this.lockedRotations)this.av=v();if(wake)this.wakeUp()}
 lockRotations(wake=true){this.lockedRotations=true;this.enabledRotations=[false,false,false];this.av=v();if(wake)this.wakeUp()}
  setBodyType(t,wake=true){const next=bodyTypeName(t);this._ensureMassProperties();if(wake)this.wakeUp();if(this.type===next)return;this.type=next;this.invMass=this.type==='dynamic'?1/this.massValue:0;this.world._staticDirty=true}
 addForce(f,wake=true){this.force=add(this.force,v(f?.x,f?.y,f?.z));if(wake)this.wakeUp()}
 addForceAtPoint(f,p,wake=true){this._ensureMassProperties();const F=v(f?.x,f?.y,f?.z);this.force=add(this.force,F);this.torque=add(this.torque,cross(sub(v(p?.x,p?.y,p?.z),this.worldCom()),F));if(wake)this.wakeUp()}
 addTorque(t,wake=true){this.torque=add(this.torque,v(t?.x,t?.y,t?.z));if(wake)this.wakeUp()}
 resetForces(wake=false){this.force=v();if(wake)this.wakeUp()}
 resetTorques(wake=false){this.torque=v();if(wake)this.wakeUp()}
 applyImpulse(i,wake=true){if(this.type!=='dynamic')return;this._ensureMassProperties();this.lv=add(this.lv,mul(v(i?.x,i?.y,i?.z),this.invMass));if(wake)this.wakeUp()}
 applyImpulseAtPoint(i,p,wake=true){if(this.type!=='dynamic')return;applyImpulseAt(this,v(i?.x,i?.y,i?.z),sub(v(p?.x,p?.y,p?.z),this.worldCom()));if(!wake)this.sleeping=false}
 applyTorqueImpulse(i,wake=true){if(this.type!=='dynamic')return;this.av=add(this.av,invInertiaWorldMul(this,v(i?.x,i?.y,i?.z)));if(wake)this.wakeUp()}
 velocityAtPoint(p){const com=this.worldCom();return add(this.lv,cross(this.av,sub(v(p?.x,p?.y,p?.z),com)))}
 worldCom(){this._ensureMassProperties();return add(this.p,qrot(this.r,this.localCom))}
 _setWorldCom(c){this._ensureMassProperties();this.p=sub(c,qrot(this.r,this.localCom))}
 recomputeMassPropertiesFromColliders(){this._recomputeMass()}
 _markMassDirty(){this._massDirty=true}
 _ensureMassProperties(){if(this._massDirty)this._recomputeMass()}
 _recomputeMass(){
   let M=this.additionalMass,com=v();const entries=[];
   for(const c of this.colliders){if(!c.valid||!c.enabled)continue;const m=c._mass();if(m<=0)continue;M+=m;com=add(com,mul(c.localP,m));entries.push([c,m]);}
   if(M<=EPS){M=Math.max(.001,this.additionalMass||1);com=v()}else com=mul(com,1/M);
   let I=v(.001,.001,.001);
   for(const [c,m] of entries){
      const bi=c._inertia(m),d=sub(c.localP,com);
      I.x+=bi.x+m*(d.y*d.y+d.z*d.z);
      I.y+=bi.y+m*(d.x*d.x+d.z*d.z);
      I.z+=bi.z+m*(d.x*d.x+d.y*d.y);
   }
   this.massValue=M;this.invMass=this.type==='dynamic'?1/M:0;this.localCom=com;this.inertia=I;this.invInertia=v(1/Math.max(EPS,I.x),1/Math.max(EPS,I.y),1/Math.max(EPS,I.z));this._massDirty=false;
 }
}

function bodyTypeName(t){if(t===0||t==='dynamic'||t===RigidBodyType.Dynamic)return'dynamic';if(t===1||t==='fixed'||t===RigidBodyType.Fixed)return'fixed';return'kinematic'}

function groupsCompatible(a,b){const am=(a.groups>>>16)&0xffff,af=a.groups&0xffff,bm=(b.groups>>>16)&0xffff,bf=b.groups&0xffff;return !!((am&bf)!==0&&(bm&af)!==0)}
function weightedContactCoefficient(aValue,aWeight,bValue,bWeight){
 const aw=Math.max(0,+aWeight||0),bw=Math.max(0,+bWeight||0),sum=aw+bw;
 return sum>EPS?((Math.max(0,+aValue||0)*aw+Math.max(0,+bValue||0)*bw)/sum):0;
}
function combinedAuthoredRestitution(a,b){
 if(a?.restitutionEnabled!==true&&b?.restitutionEnabled!==true)return 0;
 return clamp(weightedContactCoefficient(
   a?.restitutionEnabled===true?a.restitution:0,a?.elasticityWeight,
   b?.restitutionEnabled===true?b.restitution:0,b?.elasticityWeight
 ),0,1);
}

class Collider {
 constructor(world,desc,body){this.world=world;this.handle=NEXT_COL++;this.body=body;this.shape=desc.shape;this.data={...desc.data};this.localP={...desc.translation};this.localR={...desc.rotation};this.massOverride=desc.mass;this.density=desc.density;this.friction=desc.friction;this.restitution=desc.restitution;this.frictionWeight=desc.frictionWeight;this.elasticityWeight=desc.elasticityWeight;this.restitutionEnabled=desc.restitutionEnabled===true;this.sensor=desc.sensor;this.enabled=desc.enabled;this.groups=desc.groups>>>0;this.activeHooks=desc.activeHooks;this.valid=true;}
 parent(){return this.body}
 isValid(){return this.valid}
 isSensor(){return this.sensor}
 setSensor(x){const next=!!x;if(this.sensor===next)return;this.sensor=next}
 setEnabled(x){const next=!!x;if(this.enabled===next)return;this.enabled=next;this.body?._markMassDirty();this.world._staticDirty=true}
 setCollisionGroups(x){const next=x>>>0;if(this.groups===next)return;this.groups=next}
 setActiveHooks(x){const next=x|0;if(this.activeHooks===next)return;this.activeHooks=next}
 setMass(x){const next=Math.max(0,+x||0);if(this.massOverride===next)return;this.massOverride=next;this.body?._markMassDirty()}
 setDensity(x){const next=Math.max(0,+x||0);if(this.density===next)return;this.density=next;this.body?._markMassDirty()}
 setFriction(x){const next=Math.max(0,+x||0);if(this.friction===next)return;this.friction=next}
 setRestitution(x){const next=clamp(+x||0,0,1);if(this.restitution===next)return;this.restitution=next}
 setFrictionWeight(x){this.frictionWeight=Math.max(0,+x||0)}
 setElasticityWeight(x){this.elasticityWeight=Math.max(0,+x||0)}
 setRestitutionEnabled(x){this.restitutionEnabled=!!x}
 setTranslation(p){const next=v(p?.x,p?.y,p?.z);if(this.localP.x===next.x&&this.localP.y===next.y&&this.localP.z===next.z)return;this.localP=next;this.body?._markMassDirty();if(this.body?.type==='fixed')this.world._staticDirty=true}
 setRotation(r){const next=qnorm(q(r?.x,r?.y,r?.z,r?.w));if(this.localR.x===next.x&&this.localR.y===next.y&&this.localR.z===next.z&&this.localR.w===next.w)return;this.localR=next;this.body?._markMassDirty();if(this.body?.type==='fixed')this.world._staticDirty=true}
 _worldFrame(){const br=this.body?.r||q();return {p:add(this.body?.p||v(),qrot(br,this.localP)),r:qmul(br,this.localR)}}
 _volume(){const d=this.data;switch(this.shape){case'cuboid':return 8*d.hx*d.hy*d.hz;case'ball':return 4/3*Math.PI*d.r**3;case'cylinder':return Math.PI*d.r*d.r*(2*d.hh);case'capsule':return Math.PI*d.r*d.r*(2*d.hh)+4/3*Math.PI*d.r**3;case'convex':{const a=this._localMesh();const bb=meshAabb(a.vertices);return Math.max(.001,(bb.max.x-bb.min.x)*(bb.max.y-bb.min.y)*(bb.max.z-bb.min.z)*.5)}default:return 1}}
 _mass(){return this.massOverride!==null?this.massOverride:this._volume()*this.density}
 _inertia(m){const d=this.data;let sx=1,sy=1,sz=1;if(this.shape==='cuboid'){sx=2*d.hx;sy=2*d.hy;sz=2*d.hz}else if(this.shape==='ball'){const i=.4*m*d.r*d.r;return v(i,i,i)}else if(this.shape==='cylinder'){const h=2*d.hh,r=d.r;return v(m*(3*r*r+h*h)/12,.5*m*r*r,m*(3*r*r+h*h)/12)}else{const bb=meshAabb(this._localMesh().vertices);sx=bb.max.x-bb.min.x;sy=bb.max.y-bb.min.y;sz=bb.max.z-bb.min.z}return v(m*(sy*sy+sz*sz)/12,m*(sx*sx+sz*sz)/12,m*(sx*sx+sy*sy)/12)}
 // Shapes are immutable after collider creation (resizing recreates them).
 _localMesh(){return this._localShapeMesh||(this._localShapeMesh=shapeMesh(this.shape,this.data))}
 _worldMesh(){
   const f=this._worldFrame(),last=this._meshFrame;
   if(last&&last.p.x===f.p.x&&last.p.y===f.p.y&&last.p.z===f.p.z&&last.r.x===f.r.x&&last.r.y===f.r.y&&last.r.z===f.r.z&&last.r.w===f.r.w)return this._cachedWorldMesh;
   const m=this._localMesh();this._meshFrame=f;
   return this._cachedWorldMesh={vertices:m.vertices.map(x=>add(f.p,qrot(f.r,x))),faces:m.faces,edges:m.edges.map(x=>qrot(f.r,x))};
 }
 _aabb(){
   if(!this.enabled)return {min:v(Infinity,Infinity,Infinity),max:v(-Infinity,-Infinity,-Infinity)};
   const f=this._worldFrame();
   if(this.shape==='ball'){const r=this.data.r;return{min:v(f.p.x-r,f.p.y-r,f.p.z-r),max:v(f.p.x+r,f.p.y+r,f.p.z+r)}}
   // Exact rotated-box bounds: |R| * halfExtents. Broadphase queries do not
   // need to allocate a mesh, rotate eight vertices, or build its edge list.
   if(this.shape==='cuboid'){
     const {x,y,z,w}=f.r,{hx,hy,hz}=this.data;
     const ex=Math.abs(1-2*(y*y+z*z))*hx+Math.abs(2*(x*y-z*w))*hy+Math.abs(2*(x*z+y*w))*hz;
     const ey=Math.abs(2*(x*y+z*w))*hx+Math.abs(1-2*(x*x+z*z))*hy+Math.abs(2*(y*z-x*w))*hz;
     const ez=Math.abs(2*(x*z-y*w))*hx+Math.abs(2*(y*z+x*w))*hy+Math.abs(1-2*(x*x+y*y))*hz;
     return {min:v(f.p.x-ex,f.p.y-ey,f.p.z-ez),max:v(f.p.x+ex,f.p.y+ey,f.p.z+ez)};
   }
   return meshAabb(this._worldMesh().vertices);
 }
 projectPoint(p,solid=true){
   p=v(p?.x,p?.y,p?.z);
   if(this.shape==='ball'){
     const f=this._worldFrame(),d=sub(p,f.p),l=len(d),r=this.data.r,inside=l<=r;
     return {point:inside&&solid?p:add(f.p,mul(d,r/(l||1))),isInside:inside};
   }
   const mesh=this._worldMesh(),inside=pointInsideConvexMesh(p,mesh);
   if(inside&&solid)return{point:p,isInside:true};
   return{point:closestPointOnMesh(p,mesh),isInside:inside};
 }
}

function meshAabb(verts){const mn=v(Infinity,Infinity,Infinity),mx=v(-Infinity,-Infinity,-Infinity);for(const p of verts){mn.x=Math.min(mn.x,p.x);mn.y=Math.min(mn.y,p.y);mn.z=Math.min(mn.z,p.z);mx.x=Math.max(mx.x,p.x);mx.y=Math.max(mx.y,p.y);mx.z=Math.max(mx.z,p.z)}return{min:mn,max:mx}}

function meshCenter(mesh){
 const out=v();if(!mesh.vertices.length)return out;
 for(const p of mesh.vertices){out.x+=p.x;out.y+=p.y;out.z+=p.z}
 return mul(out,1/mesh.vertices.length);
}
function faceCenter(mesh,face){
 const out=v();if(!face.length)return out;
 for(const index of face){const p=mesh.vertices[index];out.x+=p.x;out.y+=p.y;out.z+=p.z}
 return mul(out,1/face.length);
}
function outwardFaceNormal(mesh,face,center=null){
 let normal=faceNormal(mesh,face);const fc=faceCenter(mesh,face),mc=center||meshCenter(mesh);
 if(dot(normal,sub(fc,mc))<0)normal=mul(normal,-1);
 return normal;
}
function buildUniqueMeshEdges(vertices,faces){
 const result=[];
 for(const face of faces){
   for(let i=0;i<face.length;i++){
     const edge=norm(sub(vertices[face[(i+1)%face.length]],vertices[face[i]]));
     if(len2(edge)<EPS)continue;
     if(!result.some(existing=>Math.abs(dot(existing,edge))>1-1e-5))result.push(edge);
   }
 }
 return result;
}

const meshCache=new Map();
function shapeMesh(shape,d){const key=shape+JSON.stringify(d);if(meshCache.has(key))return meshCache.get(key);let vertices=[],faces=[],edges=[];
 if(shape==='cuboid'||shape==='capsule'){const hx=d.hx??d.r,hy=d.hy??(d.hh+d.r),hz=d.hz??d.r;vertices=[v(-hx,-hy,-hz),v(hx,-hy,-hz),v(hx,hy,-hz),v(-hx,hy,-hz),v(-hx,-hy,hz),v(hx,-hy,hz),v(hx,hy,hz),v(-hx,hy,hz)];faces=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]];edges=[v(1,0,0),v(0,1,0),v(0,0,1)]}
 else if(shape==='cylinder'){const n=d.segments||16,hh=d.hh,r=d.r;for(let i=0;i<n;i++){const a=i*Math.PI*2/n;vertices.push(v(r*Math.cos(a),-hh,r*Math.sin(a)),v(r*Math.cos(a),hh,r*Math.sin(a)))}let lo=[],hi=[];for(let i=0;i<n;i++){lo.push(2*i);hi.push(2*i+1);const j=(i+1)%n;faces.push([2*i,2*j,2*j+1,2*i+1])}faces.push(lo.reverse(),hi);edges=[v(0,1,0)];for(let i=0;i<n;i++){const a=(i+.5)*Math.PI*2/n;edges.push(norm(v(-Math.sin(a),0,Math.cos(a))))}}
 else if(shape==='convex'){for(let i=0;i<d.verts.length;i+=3)vertices.push(v(d.verts[i],d.verts[i+1],d.verts[i+2]));if(vertices.length===6){faces=[[0,2,4],[1,5,3],[0,1,3,2],[2,3,5,4],[0,4,5,1]];edges=[norm(sub(vertices[1],vertices[0])),norm(sub(vertices[2],vertices[0])),norm(sub(vertices[4],vertices[2])),norm(sub(vertices[4],vertices[0]))]}else if(vertices.length===5){faces=[[0,3,2],[0,1,3],[2,3,4],[0,2,4],[0,4,1],[1,4,3]];edges=[norm(sub(vertices[1],vertices[0])),norm(sub(vertices[2],vertices[0])),norm(sub(vertices[4],vertices[0])),norm(sub(vertices[4],vertices[2])),norm(sub(vertices[3],vertices[1]))]}else{const bb=meshAabb(vertices);return shapeMesh('cuboid',{hx:(bb.max.x-bb.min.x)/2,hy:(bb.max.y-bb.min.y)/2,hz:(bb.max.z-bb.min.z)/2})}}
 else if(shape==='ball'){const out={vertices:[],faces:[],edges:[]};meshCache.set(key,out);return out}
 edges=buildUniqueMeshEdges(vertices,faces);
 const out={vertices,faces,edges};meshCache.set(key,out);return out}

function faceNormal(mesh,face){if(face.length<3)return v(0,1,0);return norm(cross(sub(mesh.vertices[face[1]],mesh.vertices[face[0]]),sub(mesh.vertices[face[2]],mesh.vertices[face[0]])))}
function projVerts(verts,axis){let mn=Infinity,mx=-Infinity;for(const p of verts){const d=dot(p,axis);mn=Math.min(mn,d);mx=Math.max(mx,d)}return[mn,mx]}
function clipPolygonAgainstPlane(points,planePoint,planeNormal,keepSign){
 const out=[];if(!points.length)return out;
 const distance=p=>dot(planeNormal,sub(p,planePoint))*keepSign;
 for(let i=0;i<points.length;i++){
   const current=points[i],next=points[(i+1)%points.length];
   const dc=distance(current),dn=distance(next),currentInside=dc>=-1e-6,nextInside=dn>=-1e-6;
   if(currentInside)out.push(current);
   if(currentInside!==nextInside){
     const t=dc/(dc-dn);
     out.push(add(current,mul(sub(next,current),clamp(t,0,1))));
   }
 }
 return out;
}
function reduceContactPoints(points,limit=4){
 const unique=[];
 for(const point of points){if(!unique.some(other=>len2(sub(point,other))<1e-8))unique.push(point)}
 if(unique.length<=limit)return unique;
 const center=mul(unique.reduce((sum,p)=>add(sum,p),v()),1/unique.length);
 unique.sort((a,b)=>len2(sub(b,center))-len2(sub(a,center)));
 return unique.slice(0,limit);
}
function clippedFaceContacts(reference,incident,referenceNormal,depth){
 const referenceCenter=meshCenter(reference),incidentCenter=meshCenter(incident);
 let referenceFace=null,referenceFaceNormal=null,bestReference=-Infinity;
 for(const face of reference.faces){
   const normal=outwardFaceNormal(reference,face,referenceCenter),alignment=dot(normal,referenceNormal);
   if(alignment>bestReference){bestReference=alignment;referenceFace=face;referenceFaceNormal=normal}
 }
 let incidentFace=null,bestIncident=Infinity;
 for(const face of incident.faces){
   const normal=outwardFaceNormal(incident,face,incidentCenter),alignment=dot(normal,referenceFaceNormal);
   if(alignment<bestIncident){bestIncident=alignment;incidentFace=face}
 }
 if(!referenceFace||!incidentFace)return[];
 const refPoint=reference.vertices[referenceFace[0]],refCenter=faceCenter(reference,referenceFace);
 let polygon=incidentFace.map(index=>incident.vertices[index]);
 for(let i=0;i<referenceFace.length&&polygon.length;i++){
   const edgeStart=reference.vertices[referenceFace[i]],edgeEnd=reference.vertices[referenceFace[(i+1)%referenceFace.length]];
   const sideNormal=norm(cross(referenceFaceNormal,sub(edgeEnd,edgeStart)));
   const keepSign=dot(sideNormal,sub(refCenter,edgeStart))>=0?1:-1;
   polygon=clipPolygonAgainstPlane(polygon,edgeStart,sideNormal,keepSign);
 }
 const contacts=[];
 for(const point of polygon){
   const separation=dot(referenceFaceNormal,sub(point,refPoint));
   if(separation<=.002&&separation>=-depth-.01)contacts.push(sub(point,mul(referenceFaceNormal,separation*.5)));
 }
 return reduceContactPoints(contacts,4);
}
function convexConvex(a,b){
 const A=a._worldMesh(),B=b._worldMesh(),axes=[];
 for(const face of A.faces)axes.push({axis:outwardFaceNormal(A,face),kind:'faceA'});
 for(const face of B.faces)axes.push({axis:outwardFaceNormal(B,face),kind:'faceB'});
 for(const ea of A.edges)for(const eb of B.edges){const c=cross(ea,eb);if(len2(c)>1e-8)axes.push({axis:norm(c),kind:'edge'})}
 let best=Infinity,n=v(0,1,0),bestKind='edge';const ca=a._worldFrame().p,cb=b._worldFrame().p;
 for(const candidate of axes){
   let axis=candidate.axis;if(len2(axis)<EPS)continue;axis=norm(axis);
   const [a0,a1]=projVerts(A.vertices,axis),[b0,b1]=projVerts(B.vertices,axis),overlap=Math.min(a1,b1)-Math.max(a0,b0);
    // Treat sub-millistud overlap as touching, not penetration. At a rail seam
    // two adjacent fixed colliders otherwise acquire a tiny cross-seam overlap
    // after floating-point transforms. SAT then selects the horizontal seam
    // axis and fires an impulse into the cart instead of supporting it upward.
    if(overlap<=1e-4)return null;
   if(overlap<best){best=overlap;n=dot(sub(cb,ca),axis)>=0?axis:mul(axis,-1);bestKind=candidate.kind}
 }
 let points=[];
 if(bestKind==='faceA')points=clippedFaceContacts(A,B,n,best);
 else if(bestKind==='faceB')points=clippedFaceContacts(B,A,mul(n,-1),best);
 if(!points.length){
   const pa=support(A.vertices,n),pb=support(B.vertices,mul(n,-1));
   points=[mul(add(pa,pb),.5)];
 }
 return{normal:n,depth:best,point:points[0],points};
}
function support(verts,axis){let bd=-Infinity,bp=verts[0]||v();for(const p of verts){const d=dot(p,axis);if(d>bd){bd=d;bp=p}}return bp}
function closestPointTriangle(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));const den=1/(va+vb+vc),vv=vb*den,ww=vc*den;return add(a,add(mul(ab,vv),mul(ac,ww)))}
function closestPointOnMesh(point,mesh){
 let best=point,bestDistance=Infinity;
 for(const face of mesh.faces)for(let i=1;i<face.length-1;i++){
   const candidate=closestPointTriangle(point,mesh.vertices[face[0]],mesh.vertices[face[i]],mesh.vertices[face[i+1]]),distance=len2(sub(point,candidate));
   if(distance<bestDistance){bestDistance=distance;best=candidate}
 }
 return best;
}
function pointInsideConvexMesh(point,mesh,tolerance=1e-6){
 const center=meshCenter(mesh);
 for(const face of mesh.faces){const normal=outwardFaceNormal(mesh,face,center);if(dot(normal,sub(point,mesh.vertices[face[0]]))>tolerance)return false}
 return mesh.faces.length>0;
}
function sphereConvex(s,p){
 const sf=s._worldFrame(),r=s.data.r,M=p._worldMesh(),best=closestPointOnMesh(sf.p,M),delta=sub(best,sf.p),distance=len(delta),inside=pointInsideConvexMesh(sf.p,M);
 if(!inside&&distance>=r)return null;
 const fallback=norm(sub(p._worldFrame().p,sf.p));
 const normal=inside?(distance>EPS?mul(delta,-1/distance):fallback):(distance>EPS?mul(delta,1/distance):fallback);
 const depth=inside?r+distance:r-distance;
 return{normal,depth,point:best,points:[best]};
}
function collide(a,b){if(a.shape==='ball'&&b.shape==='ball'){const pa=a._worldFrame().p,pb=b._worldFrame().p,d=sub(pb,pa),L=len(d),r=a.data.r+b.data.r;if(L>=r)return null;const n=L>EPS?mul(d,1/L):v(0,1,0);return{normal:n,depth:r-L,point:add(pa,mul(n,a.data.r-(r-L)*.5))}}if(a.shape==='ball'){return sphereConvex(a,b)}if(b.shape==='ball'){const c=sphereConvex(b,a);if(c)c.normal=mul(c.normal,-1);return c}return convexConvex(a,b)}

class ImpulseJoint {
 constructor(world,data,a,b){this.world=world;this.handle=NEXT_JOINT++;this.data=data;this.a=a;this.b=b;this.valid=true;this.contactsEnabled=true;this.motorVelocity=0;this.motorFactor=1;this.motorMaxForce=Infinity;}
 isValid(){return this.valid&&this.a?.valid&&this.b?.valid}
 setContactsEnabled(x){this.contactsEnabled=!!x}
 configureMotorVelocity(speed,factor=1){
   const nextSpeed=+speed||0,nextFactor=+factor||1;
   const changed=Math.abs(nextSpeed-this.motorVelocity)>1e-8||Math.abs(nextFactor-this.motorFactor)>1e-8;
   this.motorVelocity=nextSpeed;this.motorFactor=nextFactor;
   if(changed){this.a?.wakeUp();this.b?.wakeUp()}
 }
 setMotorMaxForce(f){this.motorMaxForce=Math.abs(+f||0)}
}
class JointData {
 static fixed(a1,r1,a2,r2){return{type:'fixed',a1:v(a1.x,a1.y,a1.z),r1:q(r1.x,r1.y,r1.z,r1.w),a2:v(a2.x,a2.y,a2.z),r2:q(r2.x,r2.y,r2.z,r2.w)}}
 static revolute(a1,a2,axis){return{type:'revolute',a1:v(a1.x,a1.y,a1.z),a2:v(a2.x,a2.y,a2.z),axis1:norm(v(axis.x,axis.y,axis.z)),axis2:norm(v(axis.x,axis.y,axis.z))}}
 static revoluteWithAxes(a1,a2,axis1,axis2){return{type:'revolute',a1:v(a1.x,a1.y,a1.z),a2:v(a2.x,a2.y,a2.z),axis1:norm(v(axis1.x,axis1.y,axis1.z)),axis2:norm(v(axis2.x,axis2.y,axis2.z))}}
}

class Ray{constructor(origin,dir){this.origin=v(origin?.x,origin?.y,origin?.z);this.dir=v(dir?.x,dir?.y,dir?.z)}}
class EventQueue{constructor(){} drainCollisionEvents(){} drainContactForceEvents(){}}

function rayAabb(o,d,a,maxT){let tmin=0,tmax=maxT;for(const k of ['x','y','z']){if(Math.abs(d[k])<EPS){if(o[k]<a.min[k]||o[k]>a.max[k])return null;continue}let t1=(a.min[k]-o[k])/d[k],t2=(a.max[k]-o[k])/d[k];if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return null}return tmin}
function rayTri(o,d,a,b,c){const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<EPS)return null;const inv=1/det,s=sub(o,a),u=inv*dot(s,h);if(u<0||u>1)return null;const qq=cross(s,e1),vv=inv*dot(d,qq);if(vv<0||u+vv>1)return null;const t=inv*dot(e2,qq);return t>=0?t:null}
function rayCollider(ray,c,maxT,cachedAabb=null){if(!c.enabled)return null;if(rayAabb(ray.origin,ray.dir,cachedAabb||c._aabb(),maxT)==null)return null;if(c.shape==='ball'){const p=c._worldFrame().p,oc=sub(ray.origin,p),a=dot(ray.dir,ray.dir),b=2*dot(oc,ray.dir),cc=dot(oc,oc)-c.data.r*c.data.r,disc=b*b-4*a*cc;if(disc<0)return null;const s=Math.sqrt(disc);let t=(-b-s)/(2*a);if(t<0)t=(-b+s)/(2*a);if(t<0||t>maxT)return null;const hit=add(ray.origin,mul(ray.dir,t));return{t,normal:norm(sub(hit,p))}}const M=c._worldMesh();let bt=Infinity,bn=v(0,1,0);for(const f of M.faces){for(let i=1;i<f.length-1;i++){const t=rayTri(ray.origin,ray.dir,M.vertices[f[0]],M.vertices[f[i]],M.vertices[f[i+1]]);if(t!==null&&t<bt&&t<=maxT){bt=t;bn=faceNormal(M,[f[0],f[i],f[i+1]]);if(dot(bn,ray.dir)>0)bn=mul(bn,-1)}}}return Number.isFinite(bt)?{t:bt,normal:bn}:null}

class ContactManifold {
 constructor(c){this.c=c}
 numSolverContacts(){return Math.max(1,this.c.points?.length||0)}
 solverContactPoint(index=0){return this.c.points?.[index]||this.c.point}
 solverContactDist(){return -this.c.depth}
 normal(){return this.c.normal}
}

const BROADPHASE_LEAF_SIZE=8;

function aabbOverlaps(a,b){
 return !(a.max.x<b.min.x||a.min.x>b.max.x||a.max.y<b.min.y||a.min.y>b.max.y||a.max.z<b.min.z||a.min.z>b.max.z);
}

function boundsForEntries(entries){
 const bounds={min:v(Infinity,Infinity,Infinity),max:v(-Infinity,-Infinity,-Infinity)};
 for(const entry of entries){
   const a=entry.aabb;
   bounds.min.x=Math.min(bounds.min.x,a.min.x);bounds.min.y=Math.min(bounds.min.y,a.min.y);bounds.min.z=Math.min(bounds.min.z,a.min.z);
   bounds.max.x=Math.max(bounds.max.x,a.max.x);bounds.max.y=Math.max(bounds.max.y,a.max.y);bounds.max.z=Math.max(bounds.max.z,a.max.z);
 }
 return bounds;
}

// Anchored scenery is effectively immutable for long stretches. A small BVH
// makes player rays, touch queries, and dynamic-vs-map collision proportional
// to nearby geometry instead of the total number of bricks in the place.
function buildAabbTree(entries){
 if(!entries.length)return null;
 const bounds=boundsForEntries(entries);
 if(entries.length<=BROADPHASE_LEAF_SIZE)return{bounds,entries,left:null,right:null};
 const extent=sub(bounds.max,bounds.min);
 const axis=extent.x>=extent.y&&extent.x>=extent.z?'x':(extent.y>=extent.z?'y':'z');
 entries.sort((a,b)=>(a.aabb.min[axis]+a.aabb.max[axis])-(b.aabb.min[axis]+b.aabb.max[axis]));
 const middle=entries.length>>1;
 return{
   bounds,
   entries:null,
   left:buildAabbTree(entries.slice(0,middle)),
   right:buildAabbTree(entries.slice(middle))
 };
}

function visitAabbTree(node,query,callback){
 if(!node||!aabbOverlaps(node.bounds,query))return true;
 if(node.entries){
   for(const entry of node.entries){
     if(aabbOverlaps(entry.aabb,query)&&callback(entry)===false)return false;
   }
   return true;
 }
 return visitAabbTree(node.left,query,callback)!==false&&visitAabbTree(node.right,query,callback)!==false;
}

function visitRayTree(node,ray,getMaxToi,callback){
 if(!node||rayAabb(ray.origin,ray.dir,node.bounds,getMaxToi())===null)return true;
 if(node.entries){
   for(const entry of node.entries){
     if(rayAabb(ray.origin,ray.dir,entry.aabb,getMaxToi())!==null&&callback(entry)===false)return false;
   }
   return true;
 }
 return visitRayTree(node.left,ray,getMaxToi,callback)!==false&&visitRayTree(node.right,ray,getMaxToi,callback)!==false;
}

function bodyPairKey(a,b){
 const x=Math.min(a.handle,b.handle),y=Math.max(a.handle,b.handle);
 return x+':'+y;
}

class World {
 constructor(gravity=v(0,-196.2,0)){this.gravity=v(gravity.x,gravity.y,gravity.z);this.timestep=1/60;this.maxCcdSubsteps=1;this.bodies=new Map();this.colliders=new Map();this.joints=new Map();this.contacts=new Map();this._contactHistory=new Map();this._stepId=0;this._staticDirty=true;this._static=[];this._dynamic=[];this._staticTree=null;this._sleepLin=.15;this._sleepAng=.15;this._restingSleepLin=.75;this._restingSleepAng=.5;this._sleepTime=.4;this.xyz='v8world';this.debugStats={staticColliders:0,movingColliders:0,activeMovingColliders:0,broadphasePairs:0,narrowphasePairs:0,activeContacts:0,fixedContacts:0,sleepingBodies:0,restitutionImpacts:0,totalRestitutionImpacts:0,maxContactDepth:0,maxNormalImpulse:0,adaptiveSubsteps:1,adaptiveHz:60,warmStartedContacts:0};}
 createRigidBody(desc){const b=new RigidBody(this,desc);this.bodies.set(b.handle,b);this._staticDirty=true;return b}
 removeRigidBody(body){if(!body?.valid)return;for(const j of [...this.joints.values()])if(j.a===body||j.b===body)this.removeImpulseJoint(j);for(const c of [...body.colliders])this.removeCollider(c,false);body.valid=false;this.bodies.delete(body.handle);this._staticDirty=true}
 createCollider(desc,body){if(!body)throw new Error('Collider requires assembly body');const c=new Collider(this,desc,body);this.colliders.set(c.handle,c);body.colliders.push(c);body._markMassDirty();this._staticDirty=true;return c}
 removeCollider(c){if(!c?.valid)return;c.valid=false;this.colliders.delete(c.handle);if(c.body){const i=c.body.colliders.indexOf(c);if(i>=0)c.body.colliders.splice(i,1);c.body._markMassDirty()}this._staticDirty=true}
 createImpulseJoint(data,a,b,wake=true){const j=new ImpulseJoint(this,data,a,b);this.joints.set(j.handle,j);if(wake){a?.wakeUp();b?.wakeUp()}return j}
 removeImpulseJoint(j,wake=true){if(!j?.valid)return;j.valid=false;this.joints.delete(j.handle);if(wake){j.a?.wakeUp();j.b?.wakeUp()}}
 propagateModifiedBodyPositionsToColliders(){this._staticDirty=true}
 _rebuildBroadphase(){
   if(!this._staticDirty)return;
   const fixed=[],moving=[];
   for(const collider of this.colliders.values()){
     if(!collider.valid||!collider.enabled||!collider.body?.valid||!collider.body?.enabled)continue;
     if(collider.body.type==='fixed')fixed.push({collider,aabb:collider._aabb()});
     else moving.push(collider);
   }
   this._static=fixed;
   this._dynamic=moving;
   this._staticTree=buildAabbTree(fixed.slice());
   this._staticDirty=false;
   this.debugStats.staticColliders=fixed.length;
   this.debugStats.movingColliders=moving.length;
 }
 _movingEntries(){
   this._rebuildBroadphase();
   const entries=[];
   for(const collider of this._dynamic){
     if(collider.valid&&collider.enabled&&collider.body?.valid&&collider.body?.enabled&&collider.body.type!=='fixed')entries.push({collider,aabb:collider._aabb()});
   }
   return entries;
 }
 _activeCols(){this._rebuildBroadphase();return this._static.map(entry=>entry.collider).concat(this._dynamic.filter(c=>c.valid&&c.enabled&&c.body?.valid))}
 collidersWithAabbIntersectingAabb(center,half,cb){
   const query={min:v(center.x-half.x,center.y-half.y,center.z-half.z),max:v(center.x+half.x,center.y+half.y,center.z+half.z)};
   this._rebuildBroadphase();
   if(visitAabbTree(this._staticTree,query,entry=>cb(entry.collider))===false)return;
   for(const entry of this._movingEntries())if(aabbOverlaps(entry.aabb,query)&&cb(entry.collider)===false)break;
 }
 _castRay(ray,maxToi=1000,flags=0,groups=0xffffffff,excludeCollider=null,excludeBody=null,predicate=null,withNormal=false){
   this._rebuildBroadphase();
   let best=null;
   const fake={groups:groups>>>0};
   const test=entry=>{
     const c=entry.collider;
     if(c===excludeCollider||c.body===excludeBody||(c.sensor&&flags===QueryFilterFlags.EXCLUDE_SENSORS))return true;
     if(groups!==undefined&&groups!==null&&groups!==0xffffffff&&!groupsCompatible(fake,c))return true;
     if(predicate&&predicate(c)===false)return true;
     const limit=best?best.timeOfImpact:maxToi;
     const h=rayCollider(ray,c,limit,entry.aabb);
     if(h&&(!best||h.t<best.timeOfImpact))best=withNormal?{collider:c,timeOfImpact:h.t,toi:h.t,normal:h.normal}:{collider:c,timeOfImpact:h.t,toi:h.t};
     return true;
   };
   visitRayTree(this._staticTree,ray,()=>best?best.timeOfImpact:maxToi,test);
   for(const entry of this._movingEntries())if(rayAabb(ray.origin,ray.dir,entry.aabb,best?best.timeOfImpact:maxToi)!==null)test(entry);
   return best;
 }
 castRay(ray,maxToi=1000,solid=true,flags=0,groups=0xffffffff,excludeCollider=null,excludeBody=null,predicate=null){return this._castRay(ray,maxToi,flags,groups,excludeCollider,excludeBody,predicate,false)}
 castRayAndGetNormal(ray,maxToi=1000,solid=true,flags=0,groups=0xffffffff,excludeCollider=null,excludeBody=null,predicate=null){return this._castRay(ray,maxToi,flags,groups,excludeCollider,excludeBody,predicate,true)}
 castRayStatic(ray,maxToi=1000,flags=0,predicate=null){
   this._rebuildBroadphase();
   let best=null;
   const test=entry=>{
     const c=entry.collider;
     if(!c?.valid||!c.enabled||(c.sensor&&flags===QueryFilterFlags.EXCLUDE_SENSORS))return true;
     if(predicate&&predicate(c)===false)return true;
     const limit=best?best.timeOfImpact:maxToi;
     const h=rayCollider(ray,c,limit,entry.aabb);
     if(h&&(!best||h.t<best.timeOfImpact))best={collider:c,timeOfImpact:h.t,toi:h.t};
     return true;
   };
   visitRayTree(this._staticTree,ray,()=>best?best.timeOfImpact:maxToi,test);
   return best;
 }
 contactPairsWith(c,cb){for(const rec of this.contacts.values()){if(rec.a===c)cb(rec.b);else if(rec.b===c)cb(rec.a)}}
 contactPair(a,b,cb){const k=pairKey(a,b),rec=this.contacts.get(k);if(rec)cb(new ContactManifold(rec.contact),rec.a!==a)}
 forEachContactPair(cb){for(const rec of this.contacts.values())if(rec.solverActive!==false)cb(rec.a,rec.b)}
 _jointStep(j,dt,applyMotor=true,correctPosition=true){
   if(!j.isValid())return;
   const a=j.a,b=j.b,d=j.data;
   if(!a||!b)return;
   a._ensureMassProperties?.();
   b._ensureMassProperties?.();

   // Velocity/impulse attachment servo. Classic joints have no translational
   // freedom, but directly teleporting a body onto its anchor destroys its
   // momentum and makes scripted CFrame changes snap. Instead, drive the two
   // anchor velocities together with equal-and-opposite impulses. Positional
   // error becomes a bounded return velocity, so a teleported wheel eases back
   // to its axle while ordinary gravity error is rejected in the same frame.
   // Keep both anchors in world space; corrections are mass/inertia weighted
   // and interleaved with contacts, never a unilateral wheel teleport.
   let wa=add(a.p,qrot(a.r,d.a1||v()));
   let wb=add(b.p,qrot(b.r,d.a2||v()));
   // Impulse lever arms are measured from the compound centre of mass,
   // whereas serialized joint anchors are measured from the Part origin.
   const ra=sub(wa,a.worldCom()),rb=sub(wb,b.worldCom()),err=sub(wb,wa);
   if(a.type==='dynamic'||b.type==='dynamic'){
      const recoveryRate=Math.max(1,Number(d.recoveryRate)||12);
      const maxRecoverySpeed=Math.max(1,Number(d.maxRecoverySpeed)||30);
      const linearSlop=.00025;
      for(const axis of [v(1,0,0),v(0,1,0),v(0,0,1)]){
         const errorAlong=dot(err,axis);
         const correctedError=Math.abs(errorAlong)>linearSlop
            ?Math.sign(errorAlong)*(Math.abs(errorAlong)-linearSlop)
            :0;
         const targetRelativeSpeed=clamp(-correctedError*recoveryRate,-maxRecoverySpeed,maxRecoverySpeed);
         const va=add(a.lv,cross(a.av,ra)),vb=add(b.lv,cross(b.av,rb));
         const currentRelativeSpeed=dot(sub(vb,va),axis);
         const effectiveMass=effectiveMassAlong(a,b,ra,rb,axis);
         const impulseMagnitude=(targetRelativeSpeed-currentRelativeSpeed)/effectiveMass;
         const impulse=mul(axis,impulseMagnitude);
         applyImpulseAt(a,mul(impulse,-1),ra,false);
         applyImpulseAt(b,impulse,rb,false);

         // Split correction removes only ordinary solver/gravity drift without
         // changing linear or angular velocity. Large scripted teleports stay
         // on the smooth velocity-return path above instead of snapping.
         if(correctPosition&&Math.abs(errorAlong)>linearSlop&&Math.abs(errorAlong)<=.5){
            const positionImpulseMagnitude=(-errorAlong*.45)/effectiveMass;
            const positionImpulse=mul(axis,positionImpulseMagnitude);
            applyPositionImpulseAt(a,mul(positionImpulse,-1),ra);
            applyPositionImpulseAt(b,positionImpulse,rb);
         }
      }
   }

   if(d.type==='fixed'){
      const target=qmul(a.r,qmul(d.r1||q(),qinv(d.r2||q())));
      const dq=qmul(target,qinv(b.r)),aa=qToAxisAngle(dq);
      if(b.type==='dynamic'&&!b.lockedRotations){
         b.av=add(b.av,mul(aa.axis,aa.angle/dt*.65));
      }else if(a.type==='dynamic'&&!a.lockedRotations){
         a.av=sub(a.av,mul(aa.axis,aa.angle/dt*.65));
      }
   }else if(d.type==='revolute'){
      const axA=norm(qrot(a.r,d.axis1||v(0,0,1)));
      const axB=norm(qrot(b.r,d.axis2||d.axis1||v(0,0,1)));
      const mis=cross(axB,axA);
      // BodyGyro-like axis alignment expressed as angular impulses. Preserve
      // the one free hinge component and remove only swing about its two
      // forbidden axes. Equal/opposite impulses retain mechanism momentum.
      const basisSeed=Math.abs(axA.x)<.75?v(1,0,0):v(0,1,0);
      const tangent1=norm(cross(axA,basisSeed));
      const tangent2=norm(cross(axA,tangent1));
      for(const axis of [tangent1,tangent2]){
         const relW=sub(b.av,a.av);
         const current=dot(relW,axis);
         const target=dot(mul(mis,18),axis);
         let angularMass=0;
         if(a.type==='dynamic'&&!a.lockedRotations)angularMass+=dot(axis,invInertiaWorldMul(a,axis));
         if(b.type==='dynamic'&&!b.lockedRotations)angularMass+=dot(axis,invInertiaWorldMul(b,axis));
         if(angularMass>EPS){
            const angularImpulse=mul(axis,(target-current)/angularMass);
            if(a.type==='dynamic'&&!a.lockedRotations)a.av=sub(a.av,invInertiaWorldMul(a,angularImpulse));
            if(b.type==='dynamic'&&!b.lockedRotations)b.av=add(b.av,invInertiaWorldMul(b,angularImpulse));
         }
      }

      if(applyMotor&&Math.abs(j.motorVelocity)>1e-7){
         const current=dot(sub(b.av,a.av),axA);
         let angularMass=0;
         if(a.type==='dynamic'&&!a.lockedRotations)angularMass+=dot(axA,invInertiaWorldMul(a,axA));
         if(b.type==='dynamic'&&!b.lockedRotations)angularMass+=dot(axA,invInertiaWorldMul(b,axA));
         if(angularMass>EPS){
            const rawFactor=Math.abs(Number(j.motorFactor)||1);
            const responsiveness=clamp(rawFactor>1?rawFactor/100:rawFactor,0,1);
            let motorImpulse=(j.motorVelocity-current)*responsiveness/angularMass;
            if(Number.isFinite(j.motorMaxForce)){
               const maxImpulse=Math.max(.0001,j.motorMaxForce*dt);
               motorImpulse=clamp(motorImpulse,-maxImpulse,maxImpulse);
            }
            const impulse=mul(axA,motorImpulse);
            if(a.type==='dynamic'&&!a.lockedRotations)a.av=sub(a.av,invInertiaWorldMul(a,impulse));
            if(b.type==='dynamic'&&!b.lockedRotations)b.av=add(b.av,invInertiaWorldMul(b,impulse));
         }
      }
   }
 }
 _projectContact(rec){
   const {a,b}=rec;
   if(a.sensor||b.sensor)return false;
   const A=a.body,B=b.body;
   if(!A||!B||A===B)return false;
   A._ensureMassProperties?.();
   B._ensureMassProperties?.();
   const response=contactDominanceResponse(A,B);
   const {ia,ib}=response,sum=ia+ib;
   if(sum<=0)return false;

   // Refresh after every projection. Correcting an upper brick changes the
   // lower contacts, so a one-shot depth correction leaves stacks compressed.
   const refreshed=collide(a,b);
   if(!refreshed){rec.solverActive=false;return false;}
   rec.contact=refreshed;
   rec.solverActive=true;
   const n=norm(refreshed.normal);
    // Keep only a sub-millistud numerical skin. The previous .004-stud slop,
    // combined with 90% projection, left a visible ~.0045-stud overlap that
    // gravity recreated every frame on awake bodies.
    const pen=Math.max(0,refreshed.depth-.0008);
   if(pen<=0)return true;
   // Shock projection keeps an already-supported lower body in place and
   // moves the body above it. Splitting this correction equally makes every
   // layer push the layers below back into the floor.
   if(n.y<-.42&&A.type==='dynamic'){
      // Leave a small fraction of the correction for the impulse solver. A
      // mathematically exact projection separates stacked contacts, resets
      // their persistent manifolds, then lets gravity re-impact the stack.
      if(response.affectA){
         const manifold=refreshed.points?.length?refreshed.points:[refreshed.point];
         if(B.type!=='dynamic'&&manifold.length===2&&!A.lockedRotations&&A.colliders.filter(c=>c.valid&&c.enabled&&!c.sensor).length===1){
            const point=mul(manifold.reduce((sum,p)=>add(sum,p),v()),1/manifold.length);
            const ra=sub(point,A.worldCom()),axis=mul(n,-1);
            const k=effectiveMassAlong(A,null,ra,v(),axis,{affectA:true,affectB:false,ia:A.invMass,ib:0});
            const edgePen=Math.max(0,refreshed.depth-.00025);
            applyPositionImpulseAt(A,mul(axis,edgePen*.94/k),ra);
         }else A._setWorldCom(sub(A.worldCom(),mul(n,pen*.9)));
      }
      else if(response.affectB)B._setWorldCom(add(B.worldCom(),mul(n,pen*.9)));
     return true;
   }
   if(n.y>.42&&B.type==='dynamic'){
      if(response.affectB){
         const manifold=refreshed.points?.length?refreshed.points:[refreshed.point];
         if(A.type!=='dynamic'&&manifold.length===2&&!B.lockedRotations&&B.colliders.filter(c=>c.valid&&c.enabled&&!c.sensor).length===1){
            const point=mul(manifold.reduce((sum,p)=>add(sum,p),v()),1/manifold.length);
            const rb=sub(point,B.worldCom());
            const k=effectiveMassAlong(B,null,rb,v(),n,{affectA:true,affectB:false,ia:B.invMass,ib:0});
            const edgePen=Math.max(0,refreshed.depth-.00025);
            applyPositionImpulseAt(B,mul(n,edgePen*.94/k),rb);
         }else B._setWorldCom(add(B.worldCom(),mul(n,pen*.9)));
      }
      else if(response.affectA)A._setWorldCom(sub(A.worldCom(),mul(n,pen*.9)));
     return true;
   }
   const correction=mul(n,pen*.62/sum);
   if(response.affectA)A._setWorldCom(sub(A.worldCom(),mul(correction,ia)));
   if(response.affectB)B._setWorldCom(add(B.worldCom(),mul(correction,ib)));
   return true;
 }
  _warmStartContact(rec){
    if(!rec?.solverActive||rec.warmStarted||rec.a.sensor||rec.b.sensor)return;
    rec.warmStarted=true;
    const impulse=Math.max(0,Number(rec.accumulatedNormalImpulses?.[0])||0);
    if(impulse<=EPS)return;
    const A=rec.a.body,B=rec.b.body,c=rec.contact;
    if(!A||!B||!c||A===B)return;
    const response=contactDominanceResponse(A,B);
    const points=c.points?.length?c.points:[c.point];
    const point=mul(points.reduce((sum,p)=>add(sum,p),v()),1/points.length);
    const n=norm(c.normal),ra=sub(point,A.worldCom()),rb=sub(point,B.worldCom());
    const normalImpulse=mul(n,impulse);
    if(response.affectA)applyImpulseAt(A,mul(normalImpulse,-1),ra,false);
    if(response.affectB)applyImpulseAt(B,normalImpulse,rb,false);
    this.debugStats.warmStartedContacts=(this.debugStats.warmStartedContacts||0)+1;
  }
 _resolve(rec,dt,iteration=0){
   const {a,b,contact:c}=rec;
   if(!rec.solverActive||!c||a.sensor||b.sensor)return;
   const A=a.body,B=b.body;
   if(!A||!B||A===B)return;
   A._ensureMassProperties?.();
   B._ensureMassProperties?.();
   const response=contactDominanceResponse(A,B);
   const {ia,ib}=response,sum=ia+ib;
   if(sum<=0)return;
   const n=norm(c.normal);

   const againstImmovable=A.type!=='dynamic'||B.type!=='dynamic';
   const manifoldPoints=c.points?.length?c.points:[c.point];
   const points=[mul(manifoldPoints.reduce((sum,p)=>add(sum,p),v()),1/manifoldPoints.length)];
   // Keep the clipped 2–4 point manifold for queries/debugging, while this
   // Velocity uses the balanced pressure center. Tilted two-point edges are
   // leveled by the split positional pass above, which cannot inject the
   // alternating angular speed that made a box wobble rapidly in place.
   rec.accumulatedNormalImpulses??=[];
   rec.restitutionVelocities??=[];
   let positiveNormalDelta=0;
   for(let pointPass=0;pointPass<points.length;pointPass++){
      // Alternate the manifold order between solver passes so neither the
      // left nor right edge of a symmetric box receives permanent priority.
      const pointIndex=iteration%2===0?pointPass:points.length-1-pointPass;
      const point=points[pointIndex];
      const comA=A.worldCom(),comB=B.worldCom();
      const ra=sub(point,comA),rb=sub(point,comB);
      let va=add(A.lv,cross(A.av,ra)),vb=add(B.lv,cross(B.av,rb));
      let rv=sub(vb,va),vn=dot(rv,n);

      // Low speed contacts are resting support, not impacts.  Suppressing
      // restitution below this threshold lets gravity settle without turning
      // the default classic Elasticity into perpetual tiny hops.
      // Restitution is only an impact response. A body recovered from an
      // authored/deep overlap with anchored geometry must be separated without
      // being launched, and short gravity drops should settle like classic
      // bricks instead of producing repeated tiny hops.
      const e=iteration===0&&rec.allowRestitution===true&&c.depth<.08&&Math.abs(vn)>40
         ?combinedAuthoredRestitution(a,b)
         :0;
      // A small capped Baumgarte bias resolves persistent overlap through the
      // velocity solver. Position-only correction could not propagate the
      // weight of a stack, leaving every member falling into its neighbour and
      // generating contacts forever. The cap prevents correction itself from
      // becoming a visible bounce.
      // Positional projection above already removes overlap with immovable
      // scenery. Adding a positive velocity bias as well launches a dynamic
      // assembly away from every rail seam/floor contact. Keep bias only for
      // dynamic stacks, where it is needed to propagate load between bodies.
      const separationBias=againstImmovable
         ?0
         :Math.min(.35,Math.max(0,c.depth-.012)*.04/dt);
      if(iteration===0){
         rec.restitutionVelocities[pointIndex]=e>0?Math.max(0,-e*vn):0;
         if(e>0)rec.restitutionApplied=true;
      }
      const restitutionVelocity=rec.restitutionVelocities[pointIndex]||0;
      const targetNormalVelocity=Math.max(separationBias,restitutionVelocity);
      const kn=effectiveMassAlong(A,B,ra,rb,n,response);
      if(kn<=EPS)continue;
      // Projected Gauss-Seidel needs an accumulated unilateral impulse. The
      // previous positive-only update could add support at one side of a
      // compound cart but never remove the excess after another contact made
      // that side separating. The result was a frame-to-frame torque/bounce.
      const previousNormalImpulse=rec.accumulatedNormalImpulses[pointIndex]||0;
      const nextNormalImpulse=Math.max(
         0,
         previousNormalImpulse+(targetNormalVelocity-vn)/kn
      );
      const jn=nextNormalImpulse-previousNormalImpulse;
      rec.accumulatedNormalImpulses[pointIndex]=nextNormalImpulse;
      positiveNormalDelta+=Math.max(0,jn);
      if(Math.abs(jn)<=EPS)continue;
      this.debugStats.maxNormalImpulse=Math.max(this.debugStats.maxNormalImpulse||0,Math.abs(jn));
      const normalImpulse=mul(n,jn);
      const impact=Math.abs(vn)>6;
      if(response.affectA)applyImpulseAt(A,mul(normalImpulse,-1),ra,impact);
      if(response.affectB)applyImpulseAt(B,normalImpulse,rb,impact);
   }

   // Friction acts once at the manifold pressure center and is limited by the
   // sum of the point loads. Applying a full friction solve at every corner
   // manufactured yaw/roll energy even when all normal contacts were stable.
   const pressureCenter=points.length>1
      ?mul(points.reduce((sum,p)=>add(sum,p),v()),1/points.length)
      :points[0];
   const centreA=A.worldCom(),centreB=B.worldCom();
   const centerRa=sub(pressureCenter,centreA),centerRb=sub(pressureCenter,centreB);
   const centerVa=add(A.lv,cross(A.av,centerRa));
   const centerVb=add(B.lv,cross(B.av,centerRb));
   const centerRv=sub(centerVb,centerVa);
   let tangent=sub(centerRv,mul(n,dot(centerRv,n)));
   const tangentLength=len(tangent);
   const totalNormalImpulse=rec.accumulatedNormalImpulses.reduce((sum,value)=>sum+(value||0),0);
   if(tangentLength>EPS&&totalNormalImpulse>EPS&&(positiveNormalDelta>EPS||(iteration===0&&rec.warmStarted))){
      tangent=mul(tangent,1/tangentLength);
      const kt=effectiveMassAlong(A,B,centerRa,centerRb,tangent,response);
      if(kt>EPS){
         // Preserve deliberately slippery colliders. An arithmetic mean turned
         // the player's 0.03 physics-state box into a high-friction block on
         // every 0.7 map Part, making it creep or stop on slopes. Ordinary
         // materials retain geometric mixing; an explicit <=.05 value acts as
         // a low-friction override for either touching surface.
         const frictionA=Math.max(0,a.friction),frictionB=Math.max(0,b.friction);
         const mu=clamp(weightedContactCoefficient(
           frictionA,a.frictionWeight,frictionB,b.frictionWeight
         ),0,4);
         const maxF=totalNormalImpulse*mu;
         const frictionDelta=clamp(-dot(centerRv,tangent)/kt,-maxF,maxF);
         if(Math.abs(frictionDelta)>EPS){
            const frictionImpulse=mul(tangent,frictionDelta);
            if(response.affectA)applyImpulseAt(A,mul(frictionImpulse,-1),centerRa,false);
            if(response.affectB)applyImpulseAt(B,frictionImpulse,centerRb,false);
         }
      }
   }
 }
 _resolveSupport(rec){
   if(!rec.solverActive||rec.a.sensor||rec.b.sensor||!rec.contact)return;
   const A=rec.a.body,B=rec.b.body,n=norm(rec.contact.normal);
   const response=contactDominanceResponse(A,B);
   const manifoldPoints=rec.contact.points?.length?rec.contact.points:[rec.contact.point];
   const point=manifoldPoints.length>1
     ?mul(manifoldPoints.reduce((sum,p)=>add(sum,p),v()),1/manifoldPoints.length)
     :manifoldPoints[0];
   let upper=null,lower=null,upperOffset=null,impulseAxis=null,upperAffected=false;
   if(n.y<-.42&&A?.type==='dynamic'){
     upper=A;lower=B;upperOffset=sub(point,A.worldCom());impulseAxis=mul(n,-1);upperAffected=response.affectA;
   }else if(n.y>.42&&B?.type==='dynamic'){
     upper=B;lower=A;upperOffset=sub(point,B.worldCom());impulseAxis=n;upperAffected=response.affectB;
   }else return;
   if(!upperAffected)return;
   const upperVelocity=add(upper.lv,cross(upper.av,upperOffset));
   const lowerOffset=sub(point,lower.worldCom());
   const lowerVelocity=add(lower.lv,cross(lower.av,lowerOffset));
   const closing=dot(sub(upperVelocity,lowerVelocity),impulseAxis);
   if(closing<0){
     const k=effectiveMassAlong(upper,null,upperOffset,v(),impulseAxis);
     if(k>EPS)applyImpulseAt(upper,mul(impulseAxis,-closing/k),upperOffset,false);
   }

   // An off-centre support impulse can make the contact point stationary
   // while leaving the body's centre moving down under gravity. Visually the
   // Part then looks as though it is continuously trying to fall through the
   // floor, and the angular component keeps the contact island awake. Once a
   // support contact has survived the initial impact, remove that residual
   // centre-of-mass motion along the support normal as well. Fast/new impacts
   // are left to the ordinary impulse solver so authored motion and bounce are
   // not swallowed.
   const supportAge=this._stepId-(rec.firstSeenStep??this._stepId);
   const centreClosing=dot(sub(upper.lv,lower.lv),impulseAxis);
   if(supportAge>=2&&centreClosing<0&&centreClosing>-12){
     upper.lv=add(upper.lv,mul(impulseAxis,-centreClosing));
   }
 }
  _stepOnce(eventQueue=null,hooks=null,advanceStep=true){
   const dt=Math.max(1e-5,+this.timestep||1/60);
   if(advanceStep)this._stepId++;
    this.contacts.clear();
    this.debugStats.fixedContacts=0;
    this.debugStats.restitutionImpacts=0;
    this.debugStats.maxContactDepth=0;
    this.debugStats.maxNormalImpulse=0;
    this.debugStats.warmStartedContacts=0;

   // Wake the entire connected mechanism before integration/contact discovery.
   // A sleeping wheel otherwise skips its floor contacts while the awake
   // chassis pulls on it, allowing both the axle and vehicle to sink.
   const jointNeighbors=new Map(),wakeQueue=[],wakeVisited=new Set();
   const revoluteBodies=new Set(),drivenBodies=new Set();
   for(const j of this.joints.values()){
     if(!j.isValid())continue;
     if(j.data.type==='revolute'){
       revoluteBodies.add(j.a);revoluteBodies.add(j.b);
       if(Math.abs(j.motorVelocity)>1e-7&&j.motorMaxForce>0){
         drivenBodies.add(j.a);drivenBodies.add(j.b);
         if(j.a.type==='dynamic'&&j.a.sleeping)j.a.wakeUp();
         if(j.b.type==='dynamic'&&j.b.sleeping)j.b.wakeUp();
       }
     }
     for(const [body,other] of [[j.a,j.b],[j.b,j.a]]){
       if(!jointNeighbors.has(body))jointNeighbors.set(body,[]);
       jointNeighbors.get(body).push(other);
       if(body.enabled&&((body.type==='dynamic'&&!body.sleeping)||
          (body.type!=='dynamic'&&(len2(body.lv)>EPS||len2(body.av)>EPS)))&&!wakeVisited.has(body)){
         wakeVisited.add(body);wakeQueue.push(body);
       }
     }
   }
   for(let i=0;i<wakeQueue.length;i++)for(const other of jointNeighbors.get(wakeQueue[i])||[]){
     if(!other.enabled||other.type!=='dynamic'||wakeVisited.has(other))continue;
     if(other.sleeping)other.wakeUp();
     wakeVisited.add(other);wakeQueue.push(other);
   }
   for(const b of this.bodies.values()){
   if(!b.valid||!b.enabled||b.type!=='dynamic')continue;
     b._ensureMassProperties();
     if(b.sleeping)continue;
      const com=b.worldCom();
      const gravityAcceleration=mul(this.gravity,b._gravityScale);
      b.lv=add(b.lv,mul(gravityAcceleration,dt));
     b.lv=add(b.lv,mul(b.force,b.invMass*dt));
     if(!b.lockedRotations)b.av=add(b.av,mul(invInertiaWorldMul(b,b.torque),dt));
     b.force=v();b.torque=v();
     const ld=Math.max(0,1-b.linearDamping*dt),ad=Math.max(0,1-b.angularDamping*dt);
     b.lv=mul(b.lv,ld);b.av=mul(b.av,ad);
     if(b.lockedRotations)b.av=v();
     else{
       if(!b.enabledRotations[0])b.av.x=0;
       if(!b.enabledRotations[1])b.av.y=0;
       if(!b.enabledRotations[2])b.av.z=0;
     }
     b._setWorldCom(add(com,mul(b.lv,dt)));
     b.r=integrateQ(b.r,b.av,dt);
   }

   // Constraint rows need several Gauss-Seidel iterations, while motor torque
   // must consume its per-step force budget only once.
   for(let it=0;it<5;it++)for(const j of this.joints.values())this._jointStep(j,dt,it===0);

   this._rebuildBroadphase();
   const moving=this._movingEntries();
   const blockedBodyPairs=new Set();
   for(const joint of this.joints.values()){
     if(joint.valid&&!joint.contactsEnabled&&joint.a?.valid&&joint.b?.valid){
       blockedBodyPairs.add(bodyPairKey(joint.a,joint.b));
     }
   }

   let broadphasePairs=0,narrowphasePairs=0;
   const processPair=(left,right)=>{
     const a=left.collider,b=right.collider,A=a.body,B=b.body;
     if(!A?.valid||!B?.valid||!A.enabled||!B.enabled||A===B)return;
     if(A.type!=='dynamic'&&B.type!=='dynamic')return;
     const aSleeping=A.type==='dynamic'&&A.sleeping;
     const bSleeping=B.type==='dynamic'&&B.sleeping;
     // A sleeping body resting on fixed scenery has no state to solve, and two
     // sleeping bodies cannot wake each other. Active-vs-sleeping pairs remain
     // candidates so a moving dynamic (or kinematic body) wakes the sleeper.
      const aFixedMoving=A.type==='fixed'&&(len2(A.lv)>1e-8||len2(A.av)>1e-8);
      const bFixedMoving=B.type==='fixed'&&(len2(B.lv)>1e-8||len2(B.av)>1e-8);
      if(
        (aSleeping&&B.type==='fixed'&&!bFixedMoving)||
        (bSleeping&&A.type==='fixed'&&!aFixedMoving)||
        (aSleeping&&bSleeping)
      )return;
     broadphasePairs++;
     if(!groupsCompatible(a,b)||blockedBodyPairs.has(bodyPairKey(A,B)))return;
     if(!aabbOverlaps(left.aabb,right.aabb))return;
     if(hooks?.filterContactPair&&(a.activeHooks||b.activeHooks)){
       const accepted=hooks.filterContactPair(a,b);
       if(accepted===null||accepted===undefined||accepted===false)return;
     }
     narrowphasePairs++;
      const contact=collide(a,b);
      if(!contact)return;
      this.debugStats.maxContactDepth=Math.max(this.debugStats.maxContactDepth,Math.max(0,contact.depth||0));
      if(A.type!=='dynamic'||B.type!=='dynamic')this.debugStats.fixedContacts++;
     if(A.sleeping||B.sleeping){
       const relativeSpeed=len(sub(B.lv,A.lv));
       if(relativeSpeed>4.5){
         // A real impact wakes the island and restarts its sleep timer.
         A.wakeUp();B.wakeUp();
       }else{
         // Let the solver treat a low-speed stack contact normally without
         // erasing the sleeper's completed timer. It can return to sleep at
         // the end of this same step instead of being kept awake forever by
         // the gravity impulse of the body above it.
         if(A.type==='dynamic')A.sleeping=false;
         if(B.type==='dynamic')B.sleeping=false;
       }
     }
     const key=pairKey(a,b);
     const previous=this._contactHistory.get(key);
     // Restitution belongs to a new impact, not every solver frame of one
     // persistent overlap. Keep a short cooldown after separation as well so
     // a nearly-resting Part cannot repeatedly manufacture bounce energy.
     const allowRestitution=!previous||(
       this._stepId-previous.lastSeenStep>2&&
       this._stepId-(previous.lastImpactStep??-Infinity)>30
     );
     const firstSeenStep=previous&&this._stepId-previous.lastSeenStep<=1
       ?(previous.firstSeenStep??previous.lastSeenStep)
       :this._stepId;
     const currentPoints=contact.points?.length?contact.points:[contact.point];
     const currentPoint=mul(currentPoints.reduce((sum,p)=>add(sum,p),v()),1/currentPoints.length);
     const currentNormal=norm(contact.normal);
     const previousNormal=previous?.normal;
     const previousPoint=previous?.point;
     const normalMatches=previousNormal&&dot(previousNormal,currentNormal)>.92;
     const pointMatches=previousPoint&&len2(sub(previousPoint,currentPoint))<.25;
     const timestepScale=previous?.dt>EPS?clamp(dt/previous.dt,.25,4):1;
     const warmNormalImpulse=normalMatches&&pointMatches
       ?Math.max(0,Number(previous.normalImpulse)||0)*timestepScale*.88
       :0;
     const historyState={
       firstSeenStep,
       lastSeenStep:this._stepId,
       lastImpactStep:allowRestitution?this._stepId:(previous?.lastImpactStep??-Infinity),
       normal:currentNormal,
       point:currentPoint,
       normalImpulse:warmNormalImpulse,
       dt
     };
     this._contactHistory.set(key,historyState);
      const rec={key,a,b,contact,allowRestitution,solverActive:true,firstSeenStep,restitutionApplied:false,restitutionVelocities:[],accumulatedNormalImpulses:[warmNormalImpulse],warmStarted:false,historyState};
     this.contacts.set(key,rec);
   };

   // Dynamic/kinematic bodies only visit nearby fixed scenery through the BVH.
   for(const entry of moving){
     if(entry.collider.body.type!=='dynamic'||entry.collider.body.sleeping)continue;
     visitAabbTree(this._staticTree,entry.aabb,fixed=>{
       processPair(entry,fixed);
       return true;
     });
   }

   // Anchored Parts can still act as classic conveyor belts by assigning
   // Velocity/RotVelocity. They remain spatially fixed, but their contact
   // surface is moving and must wake a cart that previously settled to sleep.
   // Ordinary fixed scenery stays entirely on the cheap sleeping fast path.
   for(const fixed of this._static){
     const fixedBody=fixed.collider.body;
     if(len2(fixedBody.lv)<=1e-8&&len2(fixedBody.av)<=1e-8)continue;
     for(const entry of moving){
       const movingBody=entry.collider.body;
       if(movingBody.type!=='dynamic'||!movingBody.sleeping)continue;
       if(aabbOverlaps(entry.aabb,fixed.aabb))processPair(entry,fixed);
     }
   }

   // Sweep-and-prune along X, driven only by awake/kinematic bodies. A map may
   // contain thousands of serialized dynamic Parts that are asleep at rest;
   // enumerating every sleeping/sleeping overlap is pure quadratic work and
   // cannot produce a wake-up or a solver contact.
   moving.sort((a,b)=>a.aabb.min.x-b.aabb.min.x);
   let activeMovingColliders=0;
   for(let i=0;i<moving.length;i++){
     const a=moving[i];
     const aActive=a.collider.body.type!=='dynamic'||!a.collider.body.sleeping;
     if(!aActive)continue;
     activeMovingColliders++;
     for(let k=i+1;k<moving.length;k++){
       const b=moving[k];
       if(b.aabb.min.x>a.aabb.max.x)break;
       if(a.aabb.max.y<b.aabb.min.y||a.aabb.min.y>b.aabb.max.y||a.aabb.max.z<b.aabb.min.z||a.aabb.min.z>b.aabb.max.z)continue;
       processPair(a,b);
     }
     // A sleeping entry before this active entry was skipped as an initiator,
     // so visit only those preceding sleepers. Preceding active entries have
     // already emitted this unordered pair in their forward scan.
     for(let k=i-1;k>=0;k--){
       const b=moving[k];
       if(b.aabb.max.x<a.aabb.min.x)break;
       if(b.collider.body.type!=='dynamic'||!b.collider.body.sleeping)continue;
       if(a.aabb.max.y<b.aabb.min.y||a.aabb.min.y>b.aabb.max.y||a.aabb.max.z<b.aabb.min.z||a.aabb.min.z>b.aabb.max.z)continue;
       processPair(a,b);
     }
   }

   // Sequential impulses over the complete set of contacts provide stable
   // 2–4 point support manifolds for boxes, wedges, and cylinders.  Solving
   // pair-by-pair immediately made the last contact win and caused rotation
   // and residual motion on otherwise level surfaces.
   const solverContacts=[...this.contacts.values()].sort((left,right)=>{
     const ly=left.contact?.point?.y??0,ry=right.contact?.point?.y??0;
     return ly-ry;
   });
   // Recompute and project contact depths from the ground upward. This
   // propagates support through piles without injecting separation velocity.
   for(let iteration=0;iteration<2;iteration++){
     for(const rec of solverContacts)this._projectContact(rec);
   }
   // Reapply last frame's converged normal impulse as the initial PGS guess.
   // This is velocity-only warm starting: it supports resting stacks without
   // teleporting them or turning penetration correction into bounce energy.
   for(const rec of solverContacts)this._warmStartContact(rec);
   // Multiple Gauss-Seidel passes are required when one compound assembly has
   // several rail/floor contacts. A single pass makes the last collider win:
   // its off-centre impulse undoes the preceding support and alternates angular
   // velocity every frame, which looks like a welded coaster bouncing itself
   // off the track even with restitution disabled.
   const jointBodies=new Set();
   for(const j of this.joints.values())if(j.isValid()){jointBodies.add(j.a);jointBodies.add(j.b)}
   const jointContacts=solverContacts.filter(rec=>jointBodies.has(rec.a.body)||jointBodies.has(rec.b.body));
   for(let iteration=0;iteration<(jointBodies.size?24:6);iteration++){
     // Wheel support and axle constraints must converge together. A unilateral
     // wheel snap after contact solving bypassed the floor and lost support.
     for(const j of this.joints.values())this._jointStep(j,dt,false);
     for(const rec of jointContacts)this._projectContact(rec);
     // Resolve from the top of a resting island toward its support so the
     // accumulated load reaches the floor in one pass instead of requiring a
     // pass per brick.
     const passContacts=iteration<6?solverContacts:jointContacts;
     for(let index=passContacts.length-1;index>=0;index--){
       this._resolve(passContacts[index],dt,iteration);
     }
   }
   // A final bottom-up shock pass carries the floor's velocity through a
   // resting island without kicking the already-solved supports downward.
   for(const rec of solverContacts)this._resolveSupport(rec);

   // Save the converged pressure-centre impulse for the next fixed step. The
   // next contact validates both its normal and world-space contact point
   // before using it, so a different face or a newly-created collision cannot
   // inherit stale support force.
   for(const rec of solverContacts){
     if(!rec.historyState||!rec.solverActive||!rec.contact)continue;
     const points=rec.contact.points?.length?rec.contact.points:[rec.contact.point];
     rec.historyState.point=mul(points.reduce((sum,p)=>add(sum,p),v()),1/points.length);
     rec.historyState.normal=norm(rec.contact.normal);
     rec.historyState.normalImpulse=Math.max(0,rec.accumulatedNormalImpulses?.[0]||0);
     rec.historyState.dt=dt;
   }

   // Contact impulses are solved after the main joint pass and can change a
   // wheel's anchor velocity. Two inexpensive non-motor passes restore the
   // constraint before sleep/output without reapplying motor torque.
   for(let it=0;it<2;it++)for(const j of this.joints.values())this._jointStep(j,dt,false,false);

   this.debugStats.staticColliders=this._static.length;
   this.debugStats.movingColliders=moving.length;
   this.debugStats.activeMovingColliders=activeMovingColliders;
   this.debugStats.broadphasePairs=broadphasePairs;
   this.debugStats.narrowphasePairs=narrowphasePairs;
   this.debugStats.activeContacts=solverContacts.reduce((count,rec)=>count+(rec.solverActive?1:0),0);
   const supportedBodies=new Map();
   for(const rec of solverContacts){
     if(!rec.solverActive||!rec.contact||rec.a.sensor||rec.b.sensor)continue;
     const A=rec.a.body,B=rec.b.body,n=norm(rec.contact.normal);
     const contactAge=this._stepId-(rec.firstSeenStep??this._stepId);
     if(A?.type==='dynamic'&&n.y<-.42){
       const normal=mul(n,-1),previous=supportedBodies.get(A);
       if(!previous||normal.y>previous.normal.y){
         const inheritedStable=supportedBodies.get(B)?.stable===true;
         const lowerStable=Boolean(B)&&(
           (B.type!=='dynamic'&&len2(B.lv)<=1e-8&&len2(B.av)<=1e-8)||
           (B.type==='dynamic'&&(
             B.sleeping===true||
             (inheritedStable&&len2(B.lv)<16&&len2(B.av)<16)
           ))
         );
         supportedBodies.set(A,{age:contactAge,normal,lower:B,stable:lowerStable,collider:rec.a,depth:rec.contact.depth||0});
       }else previous.age=Math.max(previous.age,contactAge);
     }
     if(B?.type==='dynamic'&&n.y>.42){
       const normal=n,previous=supportedBodies.get(B);
       if(!previous||normal.y>previous.normal.y){
         const inheritedStable=supportedBodies.get(A)?.stable===true;
         const lowerStable=Boolean(A)&&(
           (A.type!=='dynamic'&&len2(A.lv)<=1e-8&&len2(A.av)<=1e-8)||
           (A.type==='dynamic'&&(
             A.sleeping===true||
             (inheritedStable&&len2(A.lv)<16&&len2(A.av)<16)
           ))
         );
         supportedBodies.set(B,{age:contactAge,normal,lower:A,stable:lowerStable,collider:rec.b,depth:rec.contact.depth||0});
       }else previous.age=Math.max(previous.age,contactAge);
     }
     if(rec.restitutionApplied)this.debugStats.restitutionImpacts++;
   }
   this.debugStats.totalRestitutionImpacts+=this.debugStats.restitutionImpacts;

   for(const b of this.bodies.values()){
     if(!b.valid||!b.enabled||b.type!=='dynamic'||b.sleeping)continue;
     const support=supportedBodies.get(b)||null;
     const supported=Boolean(support);
     const supportAge=support?.age||0;
     const levelSupport=Boolean(
       support&&
       support.stable&&
       support.normal.y>=.999
     );

     // Persistent low-energy support contacts should converge instead of
     // preserving tiny horizontal/spin errors forever. Real impacts and fast
     // sliding remain untouched. Crucially, never apply resting damping on a
     // slope: that was deleting downhill gravity each frame and causing creep.
     // Rest stabilization is for loose resting objects, not an axle's free
     // rotational degree of freedom. Applying it after the joint solver
     // erased low-speed wheel motion on every step.
     if(!revoluteBodies.has(b)&&levelSupport&&supportAge>=8&&len2(b.lv)<16&&len2(b.av)<16){
       b.lv=mul(b.lv,.65);
       const boxLikeSupport=support.collider?.shape==='cuboid'||support.collider?.shape==='convex';
       if(boxLikeSupport){
         // Once a box has an established nearly-level support face, angular
         // velocity tangent to that face can only tip an edge back through the
         // floor. Remove that low-energy rolling component at the end of the
         // step. Keep spin around the support normal, and leave slopes,
         // cylinders, balls, fresh impacts and fast authored motion alone.
         const normalSpin=dot(b.av,support.normal);
         b.av=mul(support.normal,normalSpin*.55);
         if(
           support.lower?.type!=='dynamic'&&
           b.colliders.filter(c=>c.valid&&c.enabled&&!c.sensor).length===1
         ){
           // Finish an established box-on-anchored contact with a tiny split
           // translation. This occurs after velocity solving and therefore
           // cannot become bounce energy. Leave a 0.00025-stud numerical skin
           // so SAT keeps a persistent contact instead of flickering.
           const residualDepth=Math.max(0,(support.depth||0)-.00025);
           if(residualDepth>0){
             const finalLift=Math.min(.001,residualDepth*.9);
             b._setWorldCom(add(b.worldCom(),mul(support.normal,finalLift)));
           }
         }
       }else b.av=mul(b.av,.55);
       if(Math.abs(b.lv.y)<.35)b.lv.y=0;
     }
     const speed=len2(b.lv),spin=len2(b.av);
     const sleepLin=levelSupport?this._restingSleepLin:this._sleepLin;
     const sleepAng=levelSupport?this._restingSleepAng:this._sleepAng;
     if(drivenBodies.has(b)){
       b.sleepTimer=0;
     }else if(speed<sleepLin*sleepLin&&spin<sleepAng*sleepAng){
       b.sleepTimer+=dt;
       if(b.sleepTimer>=this._sleepTime)b.sleep();
     }else{
       // One noisy manifold frame should not erase the whole quiet period.
       // Decay the timer so resting piles converge to sleep while genuinely
       // moving bodies still stay awake.
       b.sleepTimer=Math.max(0,b.sleepTimer-dt*.5);
     }
   }

   let sleepingBodies=0;
   for(const b of this.bodies.values())if(b.valid&&b.enabled&&b.type==='dynamic'&&b.sleeping)sleepingBodies++;
   this.debugStats.sleepingBodies=sleepingBodies;

   // Bound persistent-pair memory on places that continuously create/destroy
   // debris. Two seconds is longer than the restitution cooldown above.
   if(this._stepId%120===0){
     for(const [key,state] of this._contactHistory){
       if(this._stepId-state.lastSeenStep>120)this._contactHistory.delete(key);
     }
   }
 }

 _adaptiveSubstepCount(dt){
   const maximum=clamp(Math.trunc(Number(this.maxCcdSubsteps)||1),1,4);
   if(maximum<=1)return 1;
   const jointBodies=new Set();
   for(const joint of this.joints.values()){
     if(!joint?.valid)continue;
     if(joint.a?.valid)jointBodies.add(joint.a);
     if(joint.b?.valid)jointBodies.add(joint.b);
   }
   let requested=(this.debugStats.maxContactDepth||0)>.08?Math.min(2,maximum):1;
   for(const body of this.bodies.values()){
     if(!body.valid||!body.enabled||body.type!=='dynamic'||body.sleeping)continue;
     body._ensureMassProperties?.();
     let feature=Infinity;
     for(const collider of body.colliders){
       if(!collider.valid||!collider.enabled||collider.sensor)continue;
       const data=collider.data||{};
       let current=.5;
       if(collider.shape==='cuboid')current=Math.min(data.hx,data.hy,data.hz);
       else if(collider.shape==='ball')current=data.r;
       else if(collider.shape==='cylinder')current=Math.min(data.hh,data.r);
       else if(collider.shape==='capsule')current=data.r;
       else{
         const box=collider._aabb();
         current=Math.min(box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z)*.5;
       }
       if(Number.isFinite(current)&&current>0)feature=Math.min(feature,current);
     }
     if(!Number.isFinite(feature))feature=.5;
     feature=Math.max(.05,feature);
     const speed=len(body.lv),spin=len(body.av);
     const acceleration=len(add(mul(this.gravity,body._gravityScale),mul(body.force,body.invMass||0)));
     const travel=speed*dt+.5*acceleration*dt*dt+spin*feature*dt;
     const ratio=travel/feature;
     if((body.ccd&&ratio>.2)||ratio>.9){
       requested=maximum;
       if(requested>=4)return 4;
     }else if(ratio>.35||(jointBodies.has(body)&&(speed>12||acceleration>260))){
       requested=Math.max(requested,Math.min(2,maximum));
     }
   }
   return requested;
 }

 step(eventQueue=null,hooks=null){
   const outerDt=Math.max(1e-5,+this.timestep||1/60);
   const substeps=this._adaptiveSubstepCount(outerDt);
   if(substeps<=1){
     this._stepOnce(eventQueue,hooks,true);
     this.debugStats.adaptiveSubsteps=1;
     this.debugStats.adaptiveHz=Math.round(1/outerDt);
     return;
   }

   // Forces authored for one 60 Hz game tick remain constant throughout its
   // 120/240 Hz micro-steps. Reusing the same force with the smaller dt keeps
   // total impulse unchanged instead of weakening BodyMovers or gravity.
   const authoredForces=[];
   for(const body of this.bodies.values()){
     if(!body.valid||!body.enabled||body.type!=='dynamic')continue;
     authoredForces.push({body,force:{...body.force},torque:{...body.torque}});
   }
   const aggregate={broadphasePairs:0,narrowphasePairs:0,fixedContacts:0,restitutionImpacts:0,warmStartedContacts:0,maxContactDepth:0,maxNormalImpulse:0};
   const microDt=outerDt/substeps;
   for(let index=0;index<substeps;index++){
     for(const saved of authoredForces){
       if(!saved.body.valid||!saved.body.enabled)continue;
       saved.body.force={...saved.force};
       saved.body.torque={...saved.torque};
     }
     this.timestep=microDt;
     this._stepOnce(eventQueue,hooks,index===0);
     aggregate.broadphasePairs+=this.debugStats.broadphasePairs||0;
     aggregate.narrowphasePairs+=this.debugStats.narrowphasePairs||0;
     aggregate.fixedContacts+=this.debugStats.fixedContacts||0;
     aggregate.restitutionImpacts+=this.debugStats.restitutionImpacts||0;
     aggregate.warmStartedContacts+=this.debugStats.warmStartedContacts||0;
     aggregate.maxContactDepth=Math.max(aggregate.maxContactDepth,this.debugStats.maxContactDepth||0);
     aggregate.maxNormalImpulse=Math.max(aggregate.maxNormalImpulse,this.debugStats.maxNormalImpulse||0);
   }
   this.timestep=outerDt;
   Object.assign(this.debugStats,aggregate,{
     adaptiveSubsteps:substeps,
     adaptiveHz:Math.round(substeps/outerDt)
   });
 }
}
function pairKey(a,b){const x=Math.min(a.handle,b.handle),y=Math.max(a.handle,b.handle);return x+':'+y}

const RigidBodyType={Dynamic:0,Fixed:1,KinematicPositionBased:2,KinematicPosition:2};
const ActiveHooks={NONE:0,FILTER_CONTACT_PAIRS:1,FILTER_INTERSECTION_PAIR:2};
const SolverFlags={COMPUTE_IMPULSE:1};
const QueryFilterFlags={EXCLUDE_SENSORS:1};
const CoefficientCombineRule={Average:0,Min:1,Multiply:2,Max:3};

const BLOXV8WORLD={
 init:async()=>true,World,EventQueue,Ray,RigidBodyDesc,ColliderDesc,JointData,
 RigidBodyType,ActiveHooks,SolverFlags,QueryFilterFlags,CoefficientCombineRule,
 __engine:'Blox v8world JS kernel',__architecture:'Primitive > Clump > Assembly > Mechanism',
 __reference:'legacy Roblox v8world/v8kernel behavior reconstructed from supplied client artifacts'
};
export default BLOXV8WORLD;
export {World,EventQueue,Ray,RigidBodyDesc,ColliderDesc,JointData,RigidBodyType,ActiveHooks,SolverFlags,QueryFilterFlags,CoefficientCombineRule};
