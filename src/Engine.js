import * as THREE from 'three';
import {clamp,lerp,smooth,CY,glowTexture,planetTexture,ringTexture,nebulaTexture,heartPath} from './helpers.js';
import {Music} from './music.js';

/* =====================  ENGINE 3D (scene 2 → 3 → 4)  ===================== */
export class Engine{
  constructor(el,cb,data){
    this.el=el;this.cb=cb;this.data=data||{};
    this.phase='idle';this.t=0;this.v=0;this.theta=0;this.cd=0;this.lastCount=0;this.thrust=0;
    this.pointer={x:0,y:0};this.yaw=0;this.pitch=0;this.sp=0;this.impulse=0;this.moveDir=0;this.keys={};this.focus=null;
    this.photos=[];this.userPhotos=(data.photos||[]).slice();this.photoAlpha=0;this.center=new THREE.Vector3();
    this.fw=[];this.fwTimer=0.5;this.texCache={};this.redraws=[];this.drag=null;this.disposed=false;
    const w=el.clientWidth||innerWidth,hh=el.clientHeight||innerHeight;
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    this.renderer.setSize(w,hh);el.appendChild(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x02030a);
    this.camera=new THREE.PerspectiveCamera(62,w/hh,0.5,14000);this.camera.rotation.order='YXZ';
    this.glow=glowTexture();this.ray=new THREE.Raycaster();
    this.computeLayout(w/hh);
    this.buildLights();this.buildSky();this.buildGround();this.buildShip();this.buildTitle();
    this.buildStars();this.buildDust();this.buildExhaust();this.buildWorld();
    this.camera.position.set(0,5,this.camZ);this.camera.lookAt(0,11,0);
    this.bind();this.last=performance.now();this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
  }
  computeLayout(a){this.aspect=a;this.camZ=clamp(22/Math.min(1,a*1.1),22,42);this.fwSpread=clamp(a/1.6,0.35,1)}
  fontsReady(fn){
    fn();
    if(document.fonts&&document.fonts.load){
      Promise.all([document.fonts.load('60px Pacifico','Cô ơi 20/11'),document.fonts.load('700 30px Quicksand','Chúc mừng ơi')]).then(()=>{if(!this.disposed)fn()}).catch(()=>{});
    }
  }
  buildLights(){
    this.scene.add(new THREE.AmbientLight(0x8a90c8,0.55));
    const d=new THREE.DirectionalLight(0xfff0e0,1.25);d.position.set(60,80,200);this.scene.add(d);
    this.shipLight=new THREE.PointLight(0xffa060,0,60);this.scene.add(this.shipLight);
  }
  buildSky(){
    const geo=new THREE.SphereGeometry(1700,32,20),pos=geo.attributes.position,col=new Float32Array(pos.count*3);
    const top=new THREE.Color(0x070a2a),mid=new THREE.Color(0x2c2160),hor=new THREE.Color(0xb0487f),tmp=new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const y=pos.getY(i)/1700;
      if(y<=0)tmp.copy(hor).multiplyScalar(0.35);
      else if(y<0.25)tmp.copy(hor).lerp(mid,y/0.25);
      else tmp.copy(mid).lerp(top,Math.min(1,(y-0.25)/0.5));
      col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b;
    }
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    this.skyMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,transparent:true,fog:false});
    this.sky=new THREE.Mesh(geo,this.skyMat);this.sky.renderOrder=-10;this.scene.add(this.sky);
  }
  buildGround(){
    this.ground=new THREE.Group();
    const gm=new THREE.Mesh(new THREE.CircleGeometry(1500,64),new THREE.MeshStandardMaterial({color:0x0b1022,roughness:1}));
    gm.rotation.x=-Math.PI/2;this.ground.add(gm);
    const hm=new THREE.MeshStandardMaterial({color:0x080c1c,roughness:1,flatShading:true});
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2+Math.random()*0.3,r=200+Math.random()*140,c=new THREE.Mesh(new THREE.ConeGeometry(50+Math.random()*60,16+Math.random()*30,7),hm);
      c.position.set(Math.cos(a)*r,6,Math.sin(a)*r);c.scale.z=1.6;this.ground.add(c);
    }
    const n=500,p=new Float32Array(n*3),cl=new Float32Array(n*3);
    for(let i=0;i<n;i++){const a=Math.random()*6.283,r=60+Math.random()*130;p[i*3]=Math.cos(a)*r;p[i*3+1]=0.6;p[i*3+2]=Math.sin(a)*r;
      const w=Math.random();cl[i*3]=1;cl[i*3+1]=0.7+w*0.3;cl[i*3+2]=0.4+w*0.4}
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(p,3));lg.setAttribute('color',new THREE.BufferAttribute(cl,3));
    this.ground.add(new THREE.Points(lg,new THREE.PointsMaterial({size:1.6,vertexColors:true,map:this.glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.8,0.5,32),new THREE.MeshStandardMaterial({color:0x3a3f58,metalness:0.6,roughness:0.5}));
    pad.position.y=0.25;this.ground.add(pad);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,l=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1,8),new THREE.MeshBasicMaterial({color:0xff7ab8}));
      l.position.set(Math.cos(a)*4.4,0.8,Math.sin(a)*4.4);this.ground.add(l)}
    const moon=new THREE.Mesh(new THREE.SphereGeometry(5,24,16),new THREE.MeshBasicMaterial({color:0xfff6dc}));moon.position.set(-60,48,-120);this.ground.add(moon);
    const ms=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:0xfff0c0,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.8}));
    ms.scale.set(60,60,1);ms.position.copy(moon.position);this.ground.add(ms);
    this.scene.add(this.ground);
  }
  buildShip(){
    this.rig=new THREE.Group();this.rig.position.set(0,0.5,0);this.ship=new THREE.Group();this.rig.add(this.ship);this.scene.add(this.rig);
    const white=new THREE.MeshStandardMaterial({color:0xf4f6ff,metalness:0.45,roughness:0.28}),pink=new THREE.MeshStandardMaterial({color:0xff5d9a,metalness:0.3,roughness:0.35});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.05,3.3,28),white);body.position.y=2.15;this.ship.add(body);
    const nose=new THREE.Mesh(new THREE.ConeGeometry(0.9,1.9,28),pink);nose.position.y=4.75;this.ship.add(nose);
    const band=new THREE.Mesh(new THREE.TorusGeometry(0.97,0.07,8,32),pink);band.rotation.x=Math.PI/2;band.position.y=3.5;this.ship.add(band);
    const band2=band.clone();band2.position.y=1.1;this.ship.add(band2);
    const win=new THREE.Mesh(new THREE.SphereGeometry(0.34,20,16),new THREE.MeshStandardMaterial({color:0x7fe4ff,emissive:0x2a9ac0,emissiveIntensity:0.9,roughness:0.1}));
    win.position.set(0,2.7,0.86);win.scale.z=0.5;this.ship.add(win);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.06,8,24),pink);rim.position.set(0,2.7,0.9);this.ship.add(rim);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3,f=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.5,1.1),pink);
      f.position.set(Math.sin(a)*1.1,1.0,Math.cos(a)*1.1);f.rotation.y=a;f.rotation.x=0;this.ship.add(f);
    }
    const noz=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.75,0.6,20),new THREE.MeshStandardMaterial({color:0x40445a,metalness:0.7,roughness:0.4}));noz.position.y=0.25;this.ship.add(noz);
    this.flame=new THREE.Group();this.flame.position.y=0;
    const f1=new THREE.Mesh(new THREE.ConeGeometry(0.55,3.2,16,1,true),new THREE.MeshBasicMaterial({color:0xff9a3c,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    f1.rotation.x=Math.PI;f1.position.y=-1.6;this.flame.add(f1);
    const f2=new THREE.Mesh(new THREE.ConeGeometry(0.3,2.0,12,1,true),new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    f2.rotation.x=Math.PI;f2.position.y=-1.0;this.flame.add(f2);
    const fs=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:0xffa050,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));fs.scale.set(5,5,1);fs.position.y=-0.5;this.flame.add(fs);
    this.flame.visible=false;this.ship.add(this.flame);
    this.hit=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,6.5,8),new THREE.MeshBasicMaterial({visible:false}));this.hit.position.y=2.6;this.ship.add(this.hit);
  }
  buildTitle(){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const tex=new THREE.CanvasTexture(c);
    this.fontsReady(()=>{
      const g=c.getContext('2d');g.clearRect(0,0,1024,512);g.textAlign='center';g.textBaseline='middle';
      g.shadowColor='rgba(255,110,190,.95)';g.shadowBlur=40;
      const gr=g.createLinearGradient(0,70,0,290);gr.addColorStop(0,'#fff6c9');gr.addColorStop(0.5,'#ffb3d9');gr.addColorStop(1,'#ff7fb5');
      g.fillStyle=gr;g.font='250px Pacifico, cursive';g.fillText('20/11',512,185);
      g.shadowBlur=18;g.fillStyle='#fff';g.font='700 56px Quicksand, sans-serif';g.fillText('Chúc mừng ngày Nhà giáo Việt Nam',512,385);
      tex.needsUpdate=true;
    });
    this.titleMat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
    this.title=new THREE.Sprite(this.titleMat);const sw=56*Math.min(1,this.aspect*1.3);this.title.scale.set(sw,sw/2,1);this.title.position.set(0,31,-35);this.scene.add(this.title);
  }
  buildStars(){
    const n=5500,p=new Float32Array(n*3),c=new Float32Array(n*3),col=new THREE.Color();
    for(let i=0;i<n;i++){
      const u=Math.random()*2-1,a=Math.random()*6.283,r=Math.sqrt(1-u*u);
      p[i*3]=Math.cos(a)*r*1800;p[i*3+1]=u*1800;p[i*3+2]=Math.sin(a)*r*1800;
      const k=Math.random();col.setHSL(k<0.6?0.6:k<0.85?0.08:0.9,0.5,0.7+Math.random()*0.3);
      const b=0.4+Math.random()*0.6;c[i*3]=col.r*b;c[i*3+1]=col.g*b;c[i*3+2]=col.b*b;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
    this.stars=new THREE.Points(g,new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,map:this.glow,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    this.stars.frustumCulled=false;this.scene.add(this.stars);
  }
  buildDust(){
    const n=700,p=new Float32Array(n*3);this.dustBox=new THREE.Vector3(140,140,240);
    for(let i=0;i<n;i++){p[i*3]=(Math.random()-0.5)*140;p[i*3+1]=(Math.random()-0.5)*140;p[i*3+2]=(Math.random()-0.5)*240}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
    this.dust=new THREE.Points(g,new THREE.PointsMaterial({size:0.9,color:0xcfd8ff,map:this.glow,transparent:true,opacity:0.7,depthWrite:false,blending:THREE.AdditiveBlending}));
    this.dust.frustumCulled=false;this.dust.visible=false;this.scene.add(this.dust);this.dustInit=false;
  }
  buildExhaust(){
    const N=240;this.ex={N,pos:new Float32Array(N*3),col:new Float32Array(N*3),vel:new Float32Array(N*3),life:new Float32Array(N),bounced:new Uint8Array(N),idx:0,acc:0};
    for(let i=0;i<N;i++){this.ex.pos[i*3+1]=-9999}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.ex.pos,3));g.setAttribute('color',new THREE.BufferAttribute(this.ex.col,3));
    this.exPts=new THREE.Points(g,new THREE.PointsMaterial({size:1.5,map:this.glow,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.exPts.frustumCulled=false;this.scene.add(this.exPts);
  }
  buildWorld(){
    this.world=new THREE.Group();this.scene.add(this.world);
    const specs=[
      {x:-70,y:12,z:-260,r:22,type:'gas',pal:[[245,210,160],[205,140,90],[250,232,205],[160,95,65]],glow:0xffc890},
      {x:88,y:-18,z:-520,r:30,type:'gas',pal:[[255,170,215],[200,120,235],[255,220,240],[150,90,200]],ring:[255,200,235],glow:0xff9de0},
      {x:-110,y:40,z:-820,r:38,type:'land',ocean:[[10,40,120],[30,90,200],[70,150,235]],land:[[40,120,60],[110,170,80],[190,170,110]],glow:0x7ec8ff,moon:true},
      {x:62,y:30,z:-1100,r:18,type:'rock',pal:[[200,235,255],[140,190,240],[235,250,255],[100,150,220]],glow:0xaee6ff},
      {x:-62,y:-30,z:-1400,r:46,type:'gas',pal:[[90,140,255],[50,80,200],[170,205,255],[30,50,140]],ring:[200,220,255],glow:0x7a9bff},
      {x:120,y:10,z:-1760,r:26,type:'rock',pal:[[30,8,8],[160,30,10],[255,120,20],[255,220,100]],glow:0xff6a2a},
      {x:-92,y:50,z:-2120,r:34,type:'rock',pal:[[10,60,50],[30,160,120],[120,230,170],[220,255,200]],glow:0x5cffc0,moon:true},
      {x:70,y:-40,z:-2480,r:20,type:'gas',pal:[[255,120,160],[255,190,120],[255,230,170],[200,80,130]],glow:0xffa0b8},
      {x:-125,y:0,z:-2850,r:54,type:'gas',pal:[[200,170,255],[130,100,220],[240,220,255],[90,70,180]],ring:[230,210,255],glow:0xc0a0ff}
    ];
    this.planets=[];
    specs.forEach((s,i)=>{
      const grp=new THREE.Group();grp.position.set(s.x,CY+s.y,s.z);
      const m=new THREE.Mesh(new THREE.SphereGeometry(s.r,48,32),new THREE.MeshStandardMaterial({map:planetTexture(s,i*7+3),roughness:1,metalness:0}));
      grp.add(m);
      const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:s.glow,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.55}));
      gl.scale.set(s.r*3.4,s.r*3.4,1);grp.add(gl);
      if(s.ring){
        const rg=new THREE.RingGeometry(s.r*1.45,s.r*2.5,96),p=rg.attributes.position,uv=rg.attributes.uv,v=new THREE.Vector3();
        for(let k=0;k<p.count;k++){v.fromBufferAttribute(p,k);uv.setXY(k,(v.length()-s.r*1.45)/(s.r*1.05),0.5)}
        const rm=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({map:ringTexture(s.ring),transparent:true,side:THREE.DoubleSide,depthWrite:false}));
        rm.rotation.x=Math.PI/2+0.35;rm.rotation.y=0.25;grp.add(rm);
      }
      let moon=null;
      if(s.moon){
        const piv=new THREE.Group();moon=new THREE.Mesh(new THREE.SphereGeometry(s.r*0.2,24,16),new THREE.MeshStandardMaterial({color:0xcfcfd8,roughness:1}));
        moon.position.set(s.r*2.0,0,0);piv.add(moon);piv.rotation.z=0.3;grp.add(piv);moon=piv;
      }
      this.world.add(grp);this.planets.push({grp,mesh:m,moon,spin:0.04+Math.random()*0.08});
    });
    const sun=new THREE.Mesh(new THREE.SphereGeometry(70,32,24),new THREE.MeshBasicMaterial({color:0xfff2c0}));sun.position.set(0,CY+80,-3700);this.world.add(sun);
    [[900,0xffd58a,0.8],[2400,0xff9f60,0.35]].forEach(a=>{
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:a[1],blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:a[2]}));
      s.scale.set(a[0],a[0],1);s.position.copy(sun.position);this.world.add(s);
    });
    const gal=[
      {x:-720,y:260,z:-900,R:520,arms:3,twist:7,c1:0xffe2b0,c2:0x6aa8ff,tilt:[0.9,0,0.3]},
      {x:950,y:-60,z:-1900,R:640,arms:2,twist:9,c1:0xffc0e8,c2:0x8a6bff,tilt:[1.1,0.4,-0.4]},
      {x:-520,y:780,z:-2800,R:760,arms:4,twist:6,c1:0xfff0c0,c2:0xff6fb0,tilt:[0.7,0.2,0.5]},
      {x:760,y:540,z:-3500,R:480,arms:3,twist:8,c1:0xc0fff0,c2:0x4a7aff,tilt:[1.2,0,0.1]},
      {x:-900,y:-150,z:-4300,R:600,arms:2,twist:7,c1:0xffd0a0,c2:0xc06bff,tilt:[0.8,0.6,0.2]}
    ];
    gal.forEach(o=>this.world.add(this.makeGalaxy(o)));
    for(let i=0;i<18;i++){
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaTexture([320,200,270,170,20,290][i%6]),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.55}));
      const sc=500+Math.random()*900;s.scale.set(sc,sc,1);
      s.position.set((Math.random()-0.5)*2000,100+Math.random()*750,-150-Math.random()*4300);
      if(Math.abs(s.position.x)<200)s.position.x+=Math.sign(s.position.x||1)*350;
      this.world.add(s);
    }
  }
  makeGalaxy(o){
    const n=11000,p=new Float32Array(n*3),c=new Float32Array(n*3),ca=new THREE.Color(o.c1),cb=new THREE.Color(o.c2),tmp=new THREE.Color(),R=o.R;
    const g2=()=>Math.random()+Math.random()+Math.random()-1.5;
    for(let i=0;i<n;i++){
      let x,y,z,t;
      if(i<n*0.16){const r=Math.abs(g2())*R*0.22;const a=Math.random()*6.283,b=Math.acos(Math.random()*2-1);x=Math.cos(a)*Math.sin(b)*r;z=Math.sin(a)*Math.sin(b)*r;y=Math.cos(b)*r*0.6;t=0}
      else{
        const r=Math.pow(Math.random(),1.4)*R,ang=r/R*o.twist+(i%o.arms)*(Math.PI*2/o.arms),sp=0.1*(0.4+r/R)*R;
        x=Math.cos(ang)*r+g2()*sp;z=Math.sin(ang)*r+g2()*sp;y=g2()*R*0.06*(1-r/R*0.7);t=r/R;
      }
      p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;tmp.copy(ca).lerp(cb,Math.min(1,t*1.1)).multiplyScalar(0.55+Math.random()*0.45);
      c[i*3]=tmp.r;c[i*3+1]=tmp.g;c[i*3+2]=tmp.b;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:R*0.011,vertexColors:true,map:this.glow,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false}));
    const grp=new THREE.Group();grp.add(pts);
    const core=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:o.c1,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.7}));core.scale.set(R*0.9,R*0.9,1);grp.add(core);
    grp.position.set(o.x,o.y,o.z);grp.rotation.set(o.tilt[0],o.tilt[1],o.tilt[2]);grp.userData.spin=0.01+Math.random()*0.015;return grp;
  }

  /* ---------- pháo hoa ---------- */
  spawnRocket(){
    if(this.fw.length>7)return;
    const sx=14+36*this.fwSpread,x=(Math.random()-0.5)*sx,y=16+Math.random()*18,z=-12-Math.random()*25;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:0xffe0a0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
    sp.scale.set(1.4,1.4,1);sp.position.set(x,0.6,z);this.scene.add(sp);
    this.fw.push({rocket:sp,x,y,z,t:0,dur:0.8+Math.random()*0.3});
  }
  burst(x,y,z){
    const types=['sphere','sphere','ring','heart','sphere','heart'],type=types[Math.floor(Math.random()*types.length)];
    const n=type==='heart'?170:210,pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=new Float32Array(n*3);
    const hues=[0.95,0.08,0.14,0.55,0.75,0.35,0.9],h0=hues[Math.floor(Math.random()*hues.length)],tmp=new THREE.Color();
    const ax=Math.random()*3,ay=Math.random()*3;
    for(let i=0;i<n;i++){
      pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
      let vx,vy,vz;
      if(type==='heart'){const t=i/n*6.283,hx=16*Math.pow(Math.sin(t),3),hy=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);vx=hx*0.5;vy=hy*0.5+1;vz=(Math.random()-0.5)*0.8}
      else if(type==='ring'){const a=Math.random()*6.283,s=11+Math.random();let px=Math.cos(a)*s,py=Math.sin(a)*s;vx=px;vy=py*Math.cos(ax);vz=py*Math.sin(ax)}
      else{const u=Math.random()*2-1,a=Math.random()*6.283,r=Math.sqrt(1-u*u),s=6+Math.pow(Math.random(),0.5)*10;vx=Math.cos(a)*r*s;vy=u*s;vz=Math.sin(a)*r*s}
      vel[i*3]=vx;vel[i*3+1]=vy;vel[i*3+2]=vz;
      tmp.setHSL((h0+(Math.random()-0.5)*0.08+1)%1,0.9,0.62+Math.random()*0.2);col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const m=new THREE.PointsMaterial({size:1.5,map:this.glow,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    const pts=new THREE.Points(g,m);pts.frustumCulled=false;this.scene.add(pts);
    this.fw.push({pts,vel,life:0,max:2.4+Math.random()*0.6,n});
    Music.boom(0.5+Math.random()*0.5);
  }
  updateFireworks(dt){
    for(let i=this.fw.length-1;i>=0;i--){
      const f=this.fw[i];
      if(f.rocket){
        f.t+=dt;const k=f.t/f.dur;f.rocket.position.y=lerp(0.6,f.y,1-Math.pow(1-clamp(k,0,1),2));
        if(k>=1){this.scene.remove(f.rocket);f.rocket.material.dispose();this.fw.splice(i,1);this.burst(f.x,f.y,f.z)}
      }else{
        f.life+=dt;const p=f.pts.geometry.attributes.position.array,v=f.vel,dr=Math.max(0,1-1.7*dt);
        for(let k=0;k<f.n;k++){v[k*3]*=dr;v[k*3+1]=v[k*3+1]*dr-4.5*dt;v[k*3+2]*=dr;p[k*3]+=v[k*3]*dt;p[k*3+1]+=v[k*3+1]*dt;p[k*3+2]+=v[k*3+2]*dt}
        f.pts.geometry.attributes.position.needsUpdate=true;
        const q=f.life/f.max;f.pts.material.opacity=clamp(1-q*q,0,1);f.pts.material.size=1.5*(1-q*0.4);
        if(f.life>=f.max){this.scene.remove(f.pts);f.pts.geometry.dispose();f.pts.material.dispose();this.fw.splice(i,1)}
      }
    }
  }
  updateExhaust(dt){
    const e=this.ex,rate=this.thrust*170;
    if(rate>0&&this.rig.visible){
      e.acc+=rate*dt;
      const q=new THREE.Quaternion();this.ship.getWorldQuaternion(q);
      const dir=new THREE.Vector3(0,-1,0).applyQuaternion(q),base=new THREE.Vector3(0,-0.4,0);this.ship.localToWorld(base);
      while(e.acc>=1){
        e.acc-=1;const i=e.idx;e.idx=(e.idx+1)%e.N;
        e.pos[i*3]=base.x+(Math.random()-0.5)*0.5;e.pos[i*3+1]=base.y;e.pos[i*3+2]=base.z+(Math.random()-0.5)*0.5;
        const s=12+Math.random()*12;e.vel[i*3]=dir.x*s+(Math.random()-0.5)*3;e.vel[i*3+1]=dir.y*s+(Math.random()-0.5)*3;e.vel[i*3+2]=dir.z*s+(Math.random()-0.5)*3;
        e.life[i]=1;e.bounced[i]=0;
      }
    }
    for(let i=0;i<e.N;i++){
      if(e.life[i]<=0){e.col[i*3]=e.col[i*3+1]=e.col[i*3+2]=0;continue}
      e.life[i]-=dt*(this.phase==='countdown'||this.rig.position.y<20?0.7:1.2);const l=Math.max(0,e.life[i]);
      e.pos[i*3]+=e.vel[i*3]*dt;e.pos[i*3+1]+=e.vel[i*3+1]*dt;e.pos[i*3+2]+=e.vel[i*3+2]*dt;
      if(e.pos[i*3+1]<0.4&&this.ground.visible){e.pos[i*3+1]=0.4;if(!e.bounced[i]){e.bounced[i]=1;e.vel[i*3]=(Math.random()-0.5)*26;e.vel[i*3+2]=(Math.random()-0.5)*26;e.vel[i*3+1]=Math.random()*2}}
      e.vel[i*3]*=1-0.8*dt;e.vel[i*3+2]*=1-0.8*dt;
      e.col[i*3]=l;e.col[i*3+1]=l*l*0.8;e.col[i*3+2]=l*l*l*0.45;
    }
    this.exPts.geometry.attributes.position.needsUpdate=true;this.exPts.geometry.attributes.color.needsUpdate=true;
  }

  /* ---------- ảnh của cô ---------- */
  setPhotos(urls){this.userPhotos=urls.slice();if(this.photos.length)this.makePhotos(this.center)}
  placeholder(i){
    const c=document.createElement('canvas');c.width=512;c.height=640;const tex=new THREE.CanvasTexture(c);
    const who=this.data.teacher?'Cô '+this.data.teacher:'Cô';
    const lines=[['Cô ơi,','cảm ơn cô!'],['Chúc mừng','20/11'],['Mãi biết ơn',who],['Cô là ánh sao','sáng nhất'],['Nhà giáo','Việt Nam'],['Chúc '+who.toLowerCase(),'luôn hạnh phúc']][i%6];
    const hue=[330,280,200,20,160,300][i%6];
    this.fontsReady(()=>{
      const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,512,640);gr.addColorStop(0,'hsl('+hue+',85%,80%)');gr.addColorStop(1,'hsl('+(hue+50)+',80%,62%)');
      g.fillStyle=gr;g.fillRect(0,0,512,640);
      g.fillStyle='rgba(255,255,255,.25)';for(let k=0;k<26;k++){g.beginPath();g.arc((k*97)%512,(k*151)%640,6+(k%5)*4,0,6.283);g.fill()}
      g.shadowColor='rgba(120,20,80,.45)';g.shadowBlur=24;g.fillStyle='#fff';heartPath(g,256,230,120);g.fill();
      g.shadowBlur=8;g.textAlign='center';g.fillStyle='#fff';g.font='700 46px Quicksand, sans-serif';g.fillText(lines[0],256,420);
      g.font='64px Pacifico, cursive';g.fillText(lines[1],256,500);
      g.shadowBlur=0;g.font='500 22px Quicksand, sans-serif';g.fillStyle='rgba(255,255,255,.85)';g.fillText('Bấm "Thêm ảnh" để đặt ảnh của cô vào đây',256,590);
      tex.needsUpdate=true;
    });
    return tex;
  }
  clearPhotos(){
    this.photos.forEach(p=>{this.scene.remove(p.group);p.mat.dispose();p.frameMat.dispose();p.glowMat.dispose();if(p.own)p.mat.map.dispose()});this.photos=[];this.focus=null;
  }
  layoutPhoto(p,aspect){
    const hh=p.size,w=hh*aspect;p.mesh.scale.set(w,hh,1);p.frame.scale.set(w+0.9,hh+1.5,1);p.frame.position.y=-0.3;p.glow.scale.set((w+3)*1.7,(hh+3)*1.7,1);
  }
  makePhotos(center){
    this.clearPhotos();this.center.copy(center);
    const user=this.userPhotos,N=Math.min(30,Math.max(14,user.length)),loader=new THREE.TextureLoader(),plane=new THREE.PlaneGeometry(1,1);
    for(let i=0;i<N;i++){
      const group=new THREE.Group(),size=7+Math.random()*4;let tex,own=false;
      if(user.length){
        const url=user[i%user.length];
        if(!this.texCache[url]){
          this.texCache[url]=loader.load(url,t=>{
            const a=t.image.width/t.image.height;
            this.photos.forEach(p=>{if(p.url===url)this.layoutPhoto(p,a)});this.texCache[url].userData={aspect:a};
          });
        }
        tex=this.texCache[url];
      }else{tex=this.placeholder(i);own=true}
      const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,side:THREE.DoubleSide});
      const frameMat=new THREE.MeshBasicMaterial({color:0xfff7fb,transparent:true,opacity:0,side:THREE.DoubleSide});
      const glowMat=new THREE.SpriteMaterial({map:this.glow,color:0xff8fc8,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0});
      const frame=new THREE.Mesh(plane,frameMat),mesh=new THREE.Mesh(plane,mat),glow=new THREE.Sprite(glowMat);
      frame.position.z=-0.03;mesh.position.z=0;glow.position.z=-0.3;
      group.add(glow);group.add(frame);group.add(mesh);
      const yv=(1-(i+0.5)/N*2)*0.92,r=Math.sqrt(1-yv*yv),th=i*2.399963,R=22+Math.random()*30;
      const p={group,mesh,frame,glow,mat,frameMat,glowMat,own,url:user.length?user[i%user.length]:null,size,base:new THREE.Vector3(Math.cos(th)*r*R,yv*R*0.8,Math.sin(th)*r*R),phase:Math.random()*6.28};
      frame.userData.photo=p;mesh.userData.photo=p;
      const asp=(user.length&&this.texCache[p.url].userData&&this.texCache[p.url].userData.aspect)||0.8;this.layoutPhoto(p,asp);
      group.position.copy(center).add(p.base);this.scene.add(group);this.photos.push(p);
    }
  }
  updatePhotos(dt){
    const t=this.t,a=t*0.03,ca=Math.cos(a),sa=Math.sin(a);
    this.photos.forEach(p=>{
      const bx=p.base.x*ca-p.base.z*sa,bz=p.base.x*sa+p.base.z*ca;
      p.group.position.set(this.center.x+bx,this.center.y+p.base.y+Math.sin(t*0.6+p.phase)*1.4,this.center.z+bz);
      p.group.lookAt(this.camera.position);
      p.group.rotateZ(Math.sin(t*0.5+p.phase)*0.07);
      if(this.photoAlpha<1.001){p.mat.opacity=this.photoAlpha;p.frameMat.opacity=this.photoAlpha;p.glowMat.opacity=this.photoAlpha*0.5}
    });
  }

  /* ---------- điều khiển ---------- */
  bind(){
    const cv=this.renderer.domElement;
    this.onDown=e=>{this.drag={x:e.clientX,y:e.clientY,moved:0};try{cv.setPointerCapture(e.pointerId)}catch(_){}};
    this.onMove=e=>{
      const r=cv.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-(((e.clientY-r.top)/r.height)*2-1);
      if(this.drag){
        const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.drag.x=e.clientX;this.drag.y=e.clientY;this.drag.moved+=Math.abs(dx)+Math.abs(dy);
        if(this.phase==='free'){this.yaw-=dx*0.0045;this.pitch=clamp(this.pitch-dy*0.0045,-1.45,1.45);if(this.drag.moved>6)this.focus=null}
      }else if(this.phase==='idle'){cv.style.cursor=this.hitShip()?'pointer':'default'}
    };
    this.onUp=e=>{
      const d=this.drag;this.drag=null;if(!d||d.moved>8)return;
      if(this.phase==='idle'&&this.hitShip())this.launch();
      else if(this.phase==='free'){const p=this.hitPhoto();this.focus=p&&p!==this.focus?p:null}
    };
    this.onWheel=e=>{if(this.phase!=='free')return;e.preventDefault();this.focus=null;this.impulse=clamp(this.impulse-e.deltaY*0.05,-70,70)};
    this.onKey=e=>{const k=e.key.toLowerCase();this.keys[k]=e.type==='keydown';if(this.phase==='free'&&e.type==='keydown')this.focus=null};
    this.onResize=()=>{const w=this.el.clientWidth,hh=this.el.clientHeight;if(!w||!hh)return;this.renderer.setSize(w,hh);this.camera.aspect=w/hh;this.camera.updateProjectionMatrix();this.computeLayout(w/hh)};
    cv.addEventListener('pointerdown',this.onDown);cv.addEventListener('pointermove',this.onMove);cv.addEventListener('pointerup',this.onUp);cv.addEventListener('pointercancel',()=>{this.drag=null});
    cv.addEventListener('wheel',this.onWheel,{passive:false});addEventListener('keydown',this.onKey);addEventListener('keyup',this.onKey);addEventListener('resize',this.onResize);
  }
  hitShip(){this.ray.setFromCamera(new THREE.Vector2(this.pointer.x,this.pointer.y),this.camera);return this.ray.intersectObject(this.hit,false).length>0}
  hitPhoto(){this.ray.setFromCamera(new THREE.Vector2(this.pointer.x,this.pointer.y),this.camera);const hs=this.ray.intersectObjects(this.photos.map(p=>p.frame),false);return hs.length?hs[0].object.userData.photo:null}
  setMove(d){this.moveDir=d;if(d)this.focus=null}
  launch(){if(this.phase!=='idle')return;this.phase='countdown';this.cd=0;this.cb.onPhase('countdown')}
  exit(){
    if(this.phase!=='cruise')return;
    this.phase='exit';this.et=0;this.exitStart=this.camera.position.clone();this.photoAlpha=0;
    this.makePhotos(this.exitStart.clone().add(new THREE.Vector3(0,2,12)));this.cb.onPhase('exit');
  }

  /* ---------- vòng lặp ---------- */
  loop(now){
    if(this.disposed)return;this.raf=requestAnimationFrame(this.loop);
    const dt=Math.min(0.05,(now-this.last)/1000);this.last=now;this.update(dt);this.renderer.render(this.scene,this.camera);
  }
  chase(dt){
    const rig=this.rig,cam=this.camera,y=rig.position.y,s1=smooth(0,30,y-0.5),tn=this.theta/(Math.PI/2);
    const offY=lerp(lerp(4.5,-3,s1),5,tn),offZ=lerp(lerp(this.camZ,16,s1),17,tn);
    const shake=this.phase==='ascend'&&y<120?0.14:0.02;
    const tx=rig.position.x*0.85,k=1-Math.exp(-6*dt);
    cam.position.x=tn>=1?cam.position.x+(tx-cam.position.x)*k:rig.position.x;
    cam.position.y=rig.position.y+offY+(Math.random()-0.5)*shake;cam.position.z=rig.position.z+offZ;
    const sx=lerp(0,rig.position.x*0.9,tn),sy=lerp(rig.position.y+6,rig.position.y,tn),sz=lerp(rig.position.z,rig.position.z-30,tn);
    cam.lookAt(lerp(0,sx,s1),lerp(11,sy,s1),lerp(0,sz,s1));
  }
  update(dt){
    this.t+=dt;const t=this.t,cam=this.camera,rig=this.rig,ph=this.phase;
    this.sky.position.copy(cam.position);this.stars.position.copy(cam.position);
    const y=rig.position.y;
    this.skyMat.opacity=1-smooth(30,230,y);this.title.visible=y<60;this.titleMat.opacity=1-smooth(4,40,y);
    this.ground.visible=y<260;
    if(this.ground.visible&&(ph==='idle'||ph==='countdown'||(ph==='ascend'&&y<90))){
      this.fwTimer-=dt;if(this.fwTimer<=0){this.fwTimer=0.45+Math.random()*0.7;this.spawnRocket()}
    }
    this.updateFireworks(dt);
    let targetFov=62;
    if(ph==='idle'||ph==='countdown'){
      this.thrust=0;let jx=0,jy=0;
      if(ph==='countdown'){
        this.cd+=dt;const k=Math.min(1,this.cd/3);jx=(Math.random()-0.5)*0.3*k;jy=(Math.random()-0.5)*0.3*k;
        this.thrust=this.cd>1.4?(this.cd-1.4)/1.6*0.7:0;rig.position.x=(Math.random()-0.5)*0.07*k;
        const n=Math.ceil(3-this.cd);if(n!==this.lastCount&&n>=1){this.lastCount=n;this.cb.onCount(n)}
        if(this.cd>=3){this.phase='ascend';this.v=0;this.cb.onCount(0);this.cb.onPhase('ascend');Music.boom(1.4)}
      }
      cam.position.set(Math.sin(t*0.25)*2.2+jx,5+jy,this.camZ);cam.lookAt(0,11,0);
      rig.position.y=0.5+(ph==='idle'?Math.sin(t*1.2)*0.04:0);
    }else if(ph==='ascend'){
      this.thrust=1;this.v=Math.min(this.v+16*dt,110);
      if(rig.position.y>140&&this.theta<Math.PI/2)this.theta=Math.min(Math.PI/2,this.theta+dt*0.75);
      const th=this.theta;rig.position.x*=Math.exp(-3*dt);
      rig.position.y+=Math.cos(th)*this.v*dt;rig.position.z-=Math.sin(th)*this.v*dt;this.ship.rotation.x=-th;
      this.chase(dt);targetFov=62+Math.min(16,this.v*0.14);
      if(th>=Math.PI/2-1e-4){this.phase='cruise';this.cb.onPhase('cruise')}
    }else if(ph==='cruise'){
      this.thrust=1;this.v+=(55-this.v)*(1-Math.exp(-0.6*dt));
      const tx=this.pointer.x*42,ty=CY+this.pointer.y*18;
      const dx=(tx-rig.position.x)*(1-Math.exp(-2*dt));rig.position.x+=dx;rig.position.y+=(ty-rig.position.y)*(1-Math.exp(-2*dt));rig.position.z-=this.v*dt;
      rig.rotation.z+=(clamp(-(tx-rig.position.x)*0.035,-0.5,0.5)-rig.rotation.z)*(1-Math.exp(-3*dt));
      this.ship.rotation.x=-Math.PI/2;this.chase(dt);targetFov=62+Math.min(16,this.v*0.14);
    }else if(ph==='exit'){
      this.et+=dt;this.thrust=1;this.v=Math.min(this.v+30*dt,150);rig.position.z-=this.v*dt;
      rig.rotation.z*=Math.exp(-2*dt);
      const e=smooth(0,1.6,this.et);cam.position.set(this.exitStart.x,this.exitStart.y+2*e,this.exitStart.z+12*e);
      cam.lookAt(rig.position);this.photoAlpha=clamp((this.et-1)/2,0,1);this.updatePhotos(dt);
      if(this.et>=3.4){
        const eu=new THREE.Euler().setFromQuaternion(cam.quaternion,'YXZ');this.yaw=eu.y;this.pitch=eu.x;this.sp=0;this.phase='free';this.photoAlpha=1;this.cb.onPhase('free');
      }
    }else if(ph==='free'){
      this.thrust=1;rig.position.z-=this.v*dt;
      if(rig.visible&&rig.position.distanceTo(cam.position)>2200)rig.visible=false;
      this.photoAlpha=1;
      const K=this.keys,fwd=(K['w']||K['arrowup']?1:0)-(K['s']||K['arrowdown']?1:0),str=(K['d']||K['arrowright']?1:0)-(K['a']||K['arrowleft']?1:0);
      if(this.focus){
        const f=this.focus,fp=f.group.position,dir=cam.position.clone().sub(fp).normalize(),dist=f.size*1.3+2;
        const target=fp.clone().addScaledVector(dir,dist);cam.position.lerp(target,1-Math.exp(-2.6*dt));
        const m=new THREE.Matrix4().lookAt(cam.position,fp,new THREE.Vector3(0,1,0)),q=new THREE.Quaternion().setFromRotationMatrix(m),eu=new THREE.Euler().setFromQuaternion(q,'YXZ');
        let dy=eu.y-this.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));const kk=1-Math.exp(-4*dt);this.yaw+=dy*kk;this.pitch+=(clamp(eu.x,-1.45,1.45)-this.pitch)*kk;this.sp=0;
      }else{
        const tgt=(this.moveDir+fwd)*24+1.4+this.impulse;this.impulse*=Math.exp(-2.5*dt);this.sp+=(tgt-this.sp)*(1-Math.exp(-4*dt));
        cam.rotation.set(this.pitch,this.yaw,0);
        const f=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion),r=new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion);
        cam.position.addScaledVector(f,this.sp*dt).addScaledVector(r,str*20*dt);
      }
      cam.rotation.set(this.pitch,this.yaw,0);this.updatePhotos(dt);
    }
    // quay các hành tinh, thiên hà
    this.world.children.forEach(o=>{if(o.userData.spin)o.rotation.y+=o.userData.spin*dt});
    this.planets.forEach(p=>{p.mesh.rotation.y+=p.spin*dt;if(p.moon)p.moon.rotation.y+=0.25*dt});
    // ngọn lửa + ánh sáng
    this.flame.visible=this.thrust>0.02;
    if(this.flame.visible){const s=this.thrust*(0.85+0.25*Math.sin(t*45)+0.1*Math.random());this.flame.scale.set(0.8+0.2*s,s*1.5,0.8+0.2*s)}
    this.shipLight.intensity=this.thrust*2.2;{const p=new THREE.Vector3(0,-1,0);this.ship.localToWorld(p);this.shipLight.position.copy(p)}
    this.updateExhaust(dt);
    // bụi vũ trụ để cảm nhận tốc độ
    this.dust.visible=y>20||ph==='cruise'||ph==='exit'||ph==='free';
    if(this.dust.visible){
      const a=this.dust.geometry.attributes.position.array,B=this.dustBox,c=cam.position;
      if(!this.dustInit){for(let i=0;i<a.length;i+=3){a[i]+=c.x;a[i+1]+=c.y;a[i+2]+=c.z}this.dustInit=true}
      for(let i=0;i<a.length;i+=3){
        let dx=a[i]-c.x,dy=a[i+1]-c.y,dz=a[i+2]-c.z;
        dx=((dx+B.x/2)%B.x+B.x)%B.x-B.x/2;dy=((dy+B.y/2)%B.y+B.y)%B.y-B.y/2;dz=((dz+B.z/2)%B.z+B.z)%B.z-B.z/2;
        a[i]=c.x+dx;a[i+1]=c.y+dy;a[i+2]=c.z+dz;
      }
      this.dust.geometry.attributes.position.needsUpdate=true;
    }
    this.fov=(this.fov||62)+(targetFov-(this.fov||62))*(1-Math.exp(-3*dt));
    if(Math.abs(cam.fov-this.fov)>0.02){cam.fov=this.fov;cam.updateProjectionMatrix()}
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.raf);
    removeEventListener('keydown',this.onKey);removeEventListener('keyup',this.onKey);removeEventListener('resize',this.onResize);
    try{this.renderer.dispose();if(this.renderer.domElement.parentNode)this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)}catch(e){}
  }
}

