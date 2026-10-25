// Local experiment: the same finite character history continues through Cloud.
(function(root){
 'use strict';
 const trails=root.rainCloudTrails={enabled:true,maxMarks:32000,records:[],paths:new WeakMap(),frame:-1};
 const point=p=>[p.x,p.y,p.z];
 trails.sweep=function(camera){
  if(this.frame===camera.frame)return;
  this.frame=camera.frame;
  const variety=root.matrixRainTrails?.enabled;
  let n=0;
  for(const p of this.records)if(camera.frame-p.frame<(variety?p.trailLength:40))this.records[n++]=p;
  this.records.length=n;
 };
 trails.snapshot=function(p){
  return {char:p.char,fontSize:p.fontSize,alpha:p.cloudAlpha??p.alpha,
   rgb:[...(p.cloudRGB||p.rgb||rainCameraGPU.color(p.color))],color:p.color,
   streamId:p.streamId,appearanceId:p.appearanceId,trailLength:p.trailLength};
 };
 trails.trace=function(p,camera,previous,dt){
  this.sweep(camera);
  if(!this.enabled){this.paths.delete(p);return;}
  const end=point(p),vector=end.map((v,k)=>v-previous[k]),length=Math.hypot(...vector);
  if(length<1e-7)return; // A still head must not pile characters on itself.
  let path=this.paths.get(p);
  if(!path){path={anchor:previous.slice(),carry:0,snapshot:this.snapshot(p)};this.paths.set(p,path);}
  const source=root.rainCloud.latest.get(p.streamId)||p;
  const tick=Math.max(4,Number(MatrixRainEngine.rainConfig.speed)||35)/1000;
  const velocity=source.motionVelocity;
  const nativeGap=Math.hypot(...(velocity?velocity.map(v=>v*tick):source.delta||[]))||p.fontSize;
  const life=root.matrixRainTrails?.enabled?p.trailLength:40;
  // Uniform spatial sampling, independent of display FPS. Under very dense
  // settings, widen emission spacing instead of cutting off visible history.
  const fairShare=this.maxMarks/Math.max(1,root.rainCloud.heads.length);
  const budgetGap=length/Math.max(dt,.001)*tick*life/Math.max(1,fairShare*.8);
  // Match the original rain step spacing; depth separation handles crossings.
  const gap=Math.max(.5,nativeGap,budgetGap);
  path.carry=Math.min(path.carry,gap);
  let consumed=0;
  while(path.carry+length-consumed>=gap-1e-8){
   consumed+=Math.max(0,gap-path.carry);
   if(this.records.length<this.maxMarks){
    const mark={...path.snapshot,x:path.anchor[0],y:path.anchor[1],z:path.anchor[2],
     frame:camera.frame-1,delta:[0,0,0],cloudInstance:true,cloudTrail:true,ownerRow:0};
    // No cloudAge: the normal rain shader ages and fades this glyph.
    this.records.push(mark);camera.marks.push(mark);rainCameraGPU.invalidate=true;
   }
   const t=Math.min(1,consumed/length);
   path.anchor=previous.map((v,k)=>v+vector[k]*t);
   path.snapshot=this.snapshot(p);path.carry=0;
  }
  path.carry+=Math.max(0,length-consumed);
 };
 trails.reset=function(camera){
  this.records.length=0;this.paths=new WeakMap();this.frame=-1;
  camera.marks=camera.marks.filter(p=>!p.cloudTrail);
 };
 trails.setEnabled=function(enabled){
  this.enabled=!!enabled;this.paths=new WeakMap();
  // Turning emission off leaves existing trails to finish their normal fade.
 };
 const mount=root.rainCloud.mount;
 root.rainCloud.mount=function(parent){
  mount.call(this,parent);
  const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:center;margin-top:8px';
  const input=document.createElement('input');input.type='checkbox';input.checked=trails.enabled;
  input.id='cloud-trails-preview';input.onchange=()=>trails.setEnabled(input.checked);
  label.append(input,document.createTextNode('Cloud trails'));
  parent.querySelector('#rain-cloud-controls').append(label);
 };
})(window);
