const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=n=>fs.readFileSync(n,'utf8');
class FieldFixture{
 constructor(){this.ready=true;this.queries=0;}
 setAnchor(){} step(){}
 sample(marks){this.flow=new Float32Array(marks.length*4);this.colors=new Float32Array(marks.length*4);for(let i=0;i<marks.length;i++){this.flow.set([80,60,20,1],i*4);this.colors.set([.8,.3,.2,.5],i*4);}this.queries++;return true;}
}
function fixture(variety=false,stepped=true,prepared=true){
 const window={OmniCloud:FieldFixture,matrixRainRendering:{smooth:true},matrixRainTrails:{enabled:variety,stepped,lengthFor:i=>variety?60+i:40},addEventListener(){}};
 const context=vm.createContext({window,performance,console,Math,Map,Set,Float32Array,matrixCanvas:{width:960,height:600},rainFocalLength:500,rainMotion:{drops:[],planar:'down'},reverseFlowMultiplier:1,MatrixRainEngine:{rainConfig:{direction:'down',speed:35,fontSize:12,intensity:70}},rainCameraGPU:{invalidate:false,stats:{phase:.37},color:()=>[0,.8,.2],tileVisible:()=>true,hide(){},render(){}}});
 vm.runInContext(read('rain-camera-motion.js'),context);
 const camera=vm.runInContext(read('rain-camera.js').split("window.addEventListener('DOMContentLoaded'")[0]+';rainCamera;',context);
 vm.runInContext(read('rain-cloud.js'),context);const cloud=window.rainCloud;if(prepared)cloud.engine=new FieldFixture();
 function capture(){for(let i=0;i<8;i++){const h=context.rainMotion.drops[i];h.y+=2;camera.capture('ア',h.x,h.y,h.depth,12,.8,'#00cc33',i);}}
 for(let f=0;f<40;f++){for(let i=0;i<8;i++){const h=context.rainMotion.drops[i]={x:100+i*95,y:60+f*9,depth:180+i*43,lastStepDirection:'down'};camera.capture('ア',h.x,h.y,h.depth,12,.8,'#00cc33',i);}camera.advanceFrame();}
 camera.beginContinuousView();camera.yaw=18;camera.pitch=8;camera.roll=27;camera.prepareView();
 const pack=vm.runInNewContext(read('rain-camera-gpu.js')+';rainCameraGPU.pack;',{rainCamera:camera});
 const packer={stride:22,capacity:1024,write:0,glyph:()=>({uv:[0,0,1,1],shape:[0,-.8,.6,0],mode:0}),color:()=>[0,.8,.2]};
 const packed=p=>{const a=new Float32Array(22);pack.call(packer,p,0,a);return Array.from(a);};
 return{window,camera,cloud,context,capture,packed};
}
const xyz=p=>[p.x,p.y,p.z];
function close(a,b,message,tolerance=.001){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<tolerance,`${message}: ${a[i]} != ${b[i]}`);}
function step(f,dt=1/60){f.capture();f.camera.advanceFrame();f.cloud.advance(dt,f.camera);assert.equal(f.cloud.error,undefined);}
function gather(f){let n=0;while(f.cloud.gathering&&n++<300)step(f);assert.ok(n<300);}

module.exports={fixture,step,xyz,close};
