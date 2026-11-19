'use strict';
const fs = require('fs'); const vm = require('vm'); const path = require('path');
const ROOT = path.join(__dirname, '..');
function bhFactory(){const fn=function(){return bh;};const bh=new Proxy(fn,{get(t,p){if(p===Symbol.toPrimitive)return()=>0;if(p==='length')return 0;return bh;},apply(){return bh;},construct(){return bh;},set(){return true;}});return bh;}
let now=1000; global.performance={now:()=>now};
function makeEl(id){const el={id,style:{},dataset:{},children:[],textContent:'',className:'',offsetWidth:0,_h:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(c){el.children.push(c);return c;},remove(){},addEventListener(t,f){if(typeof f==='function'){(el._h[t]=el._h[t]||[]).push(f);}},getContext(){return bhFactory();},width:id==='minimap'?150:300,height:150};return el;}
const els={};const handlers={};
global.document={getElementById(id){return els[id]||(els[id]=makeEl(id));},createElement(tag){return makeEl('_'+tag+Math.random());},querySelectorAll(){return[];},body:makeEl('body')};
global.window={innerWidth:1280,innerHeight:720,addEventListener(t,f){handlers[t]=f;},removeEventListener(){},touchJoy:null};
let rafCb=null; global.requestAnimationFrame=cb=>{rafCb=cb;return 0;};
const THREE=require(path.join(ROOT,'lib/three.min.js'));
THREE.WebGLRenderer=function(opts){this.domElement=opts&&opts.canvas;this.outputEncoding=THREE.LinearEncoding;this.toneMapping=THREE.NoToneMapping;this.toneMappingExposure=1;this.shadowMap={enabled:false,type:THREE.PCFShadowMap};this.setPixelRatio=()=>{};this.setSize=()=>{};this.render=(sc)=>{sc.updateMatrixWorld(true);};};
global.THREE=THREE;
vm.runInThisContext(fs.readFileSync(path.join(ROOT,'js/game.js'),'utf8'));
const G=global.window.__GTA__;
els.startBtn._h.click[0]();
let meshes=0, verts=0, mats=new Set();
G.scene.traverse(o=>{ if(o.isMesh&&o.geometry){meshes++; if(o.geometry.attributes&&o.geometry.attributes.position)verts+=o.geometry.attributes.position.count; if(o.material){ if(Array.isArray(o.material))o.material.forEach(m=>mats.add(m)); else mats.add(o.material);} }});
console.log('meshes:',meshes,'| vertices:',verts,'| materials:',mats.size);
console.log('buildings:',G.buildingBoxes.length,'| NPCs:',G.NPCs.length,'| cars:',G.cars.length,'| boats:',G.boats.length);
