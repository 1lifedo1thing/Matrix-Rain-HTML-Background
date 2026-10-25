const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture,step,xyz,close}=require('./cloud-trails-fixture.cjs');
const install=f=>{vm.runInContext(fs.readFileSync('rain-cloud-trails.js','utf8'),f.context);return f.window.rainCloudTrails;};
for(const variety of [false,true])for(const stepped of [false,true]){
 const f=fixture(variety,stepped),control=fixture(variety,stepped),t=install(f),{cloud,camera}=f;
 const old=camera.marks.slice(),bytes=old.map(f.packed);cloud.choose(true);control.cloud.choose(true);
 const heads=cloud.heads.slice();
 for(let i=0;i<120;i++){
  step(f);step(control);
  heads.forEach((p,j)=>close(xyz(p),xyz(control.cloud.heads[j]),'Trails cannot alter head movement'));
  assert.equal(cloud.heads.length,control.cloud.heads.length,'No added heads');
 }
 assert.ok(t.records.length>heads.length,'Heads leave actual character trails');
 old.forEach((p,i)=>assert.deepEqual(f.packed(p),bytes[i],'Original tails unchanged'));
 for(const p of t.records){
  assert.equal(p.cloudAge,undefined);assert.equal(p.ownerRow,0);
  const a=f.packed(p);assert.ok(a[17]>0,'Normal finite shader lifetime');assert.equal(a[21],2,'Untiled glyph');
  close(a.slice(18,21),[0,0,0],'Trail positions do not move/stretch');assert.ok(p.alpha>.1);
 }
 cloud.release();control.cloud.release();let n=0;
 while(cloud.active&&n++<140){step(f);step(control);if(cloud.active)heads.forEach((p,j)=>close(xyz(p),xyz(control.cloud.heads[j]),'Approved return path unchanged'));}
 assert.ok(!cloud.active);assert.ok(t.records.length>0,'Return also leaves a trail');
 const survived=t.records.slice();
 for(const p of survived)assert.ok(camera.marks.includes(p),'No tail cut at native handoff');
 // A rapid repeat cannot adopt fading tails as new Cloud heads.
 cloud.choose(true);assert.ok(cloud.heads.length<=cloud.limit);assert.ok(cloud.heads.every(p=>!p.cloudTrail));
 step(f);cloud.release();let repeat=0;while(cloud.active&&repeat++<300)step(f);assert.ok(!cloud.active,"Repeat return must complete within 300 frames");
 for(let i=0;i<80;i++){f.capture();camera.advanceFrame();}
 assert.equal(t.records.length,0,'All trail history is reclaimed');assert.ok(camera.marks.every(p=>!p.cloudTrail));
}
// Equal arc-length spacing rather than one glyph per display repaint.
const paths=[];
for(const fps of [30,60,120]){
 const f=fixture(),t=install(f);f.cloud.choose(true);
 const p=f.cloud.heads[0];f.cloud.latest.get(p.streamId).delta=[0,10,0];
 p.x=0;p.y=0;p.z=500;
 for(let i=0;i<fps;i++){const before=xyz(p);p.x=100*(i+1)/fps;t.trace(p,f.camera,before,1/fps);}
 paths.push(t.records.map(p=>p.x));assert.equal(t.records.length,10);
 for(let i=1;i<t.records.length;i++)assert.ok(t.records[i].x-t.records[i-1].x>=10-1e-7,'Original rain step spacing');
}
close(paths[0],paths[1],'30/60 FPS spacing');close(paths[0],paths[2],'30/120 FPS spacing');
// Rendering pressure cannot create an unbounded particle history or erase tails.
{
 const f=fixture(),t=install(f);t.maxMarks=160;f.cloud.choose(true);
 let peak=0;for(let i=0;i<1800;i++){step(f);peak=Math.max(peak,t.records.length);assert.ok(t.records.length<=160);}
 assert.ok(peak>0);const old=t.records.slice();t.setEnabled(false);
 for(let i=0;i<80;i++)step(f);
 assert.equal(t.records.length,0);assert.ok(old.every(p=>!f.camera.marks.includes(p)));
 assert.ok(f.cloud.heads.length>0,'Emission toggle does not remove heads');
}
// The GPU buffer groups world-space trails, so tiled rain never redraws them.
{
 const f=fixture(),t=install(f);f.cloud.choose(true);for(let i=0;i<60;i++)step(f);
 const gpu=vm.runInNewContext(fs.readFileSync('rain-camera-gpu.js','utf8')+';rainCameraGPU;', {rainCamera:f.camera,window:f.window});
 gpu.groupCloud=true;gpu.capacity=65536;gpu.staging=new Float32Array(65536*22);gpu.batches=[];
 gpu.gl={bindBuffer(){},bufferSubData(){},bufferData(){}};
 gpu.glyph=()=>({uv:[0,0,1,1],shape:[0,-.8,.6,0],mode:0});gpu.color=()=>[0,.8,.2];
 gpu.rebuild(f.camera);
 assert.equal(gpu.groupNativeCount,f.camera.marks.filter(p=>!p.cloudInstance).length);
 for(let i=0;i<gpu.used;i++)assert.equal(gpu.staging[i*22+21]%4,i<gpu.groupNativeCount?0:2);
}
console.log('PASS: original head motion, finite immutable trails on both transitions, frame-rate independent spacing, bounded history and untiled GPU grouping.');
