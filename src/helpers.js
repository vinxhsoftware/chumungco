import * as THREE from 'three';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export const CY=272;

/* =====================  NOISE / TEXTURE HELPERS  ===================== */
export function hash(x,y,s){const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)}
export function vnoise(x,y,px,s){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const m=v=>((v%px)+px)%px;
  const a=hash(m(ix),iy,s),b=hash(m(ix+1),iy,s),c=hash(m(ix),iy+1,s),d=hash(m(ix+1),iy+1,s);
  return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;
}
export function fbm(x,y,px,s,oct){let v=0,a=0.5,f=1,pp=px,sum=0;for(let i=0;i<oct;i++){v+=a*vnoise(x*f,y*f,pp,s+i*13);sum+=a;a*=0.5;f*=2;pp*=2}return v/sum}
export function ramp(pal,t){
  t=clamp(t,0,0.9999)*(pal.length-1); const i=Math.floor(t),f=t-i,a=pal[i],b=pal[i+1];
  return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];
}
export function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,'rgba(255,255,255,.55)');gr.addColorStop(0.6,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
export function planetTexture(spec,seed){
  const W=384,H=192,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),img=g.createImageData(W,H),d=img.data;
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const u=x/W*4,v=y/H*2;let col;
      if(spec.type==='gas'){
        const w=fbm(u*1.2,v*2,4,seed,3);
        const t=v*3.2+w*1.6; const s=0.5+0.5*Math.sin(t*6.283);
        col=ramp(spec.pal,s*0.8+fbm(u*3,v*6,12,seed+5,2)*0.2);
      }else if(spec.type==='land'){
        const n=fbm(u,v*1.0,4,seed,4);
        if(n<0.52)col=ramp(spec.ocean,n/0.52);else col=ramp(spec.land.slice(0,3),(n-0.52)/0.3);
        const pole=smooth(0.22,0.0,Math.min(v,2-v)); if(pole>0)col=[lerp(col[0],245,pole),lerp(col[1],248,pole),lerp(col[2],255,pole)];
      }else{
        const n=fbm(u*1.5,v*1.5,6,seed,4),n2=fbm(u*5,v*5,20,seed+9,2);
        col=ramp(spec.pal,clamp((n-0.25)*1.8+(n2-0.5)*0.3,0,1));
      }
      const i=(y*W+x)*4;d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=255;
    }
  }
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);return t;
}
export function ringTexture(col){
  const c=document.createElement('canvas');c.width=256;c.height=4;const g=c.getContext('2d');
  for(let x=0;x<256;x++){
    const f=x/255,band=0.45+0.55*Math.abs(Math.sin(f*38+Math.sin(f*9)*2)),edge=smooth(0,0.08,f)*smooth(1,0.85,f);
    const gap=(f>0.42&&f<0.48)?0.1:1;
    g.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+(band*edge*gap*0.85)+')';g.fillRect(x,0,1,4);
  }
  return new THREE.CanvasTexture(c);
}
export function nebulaTexture(hue){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.globalCompositeOperation='lighter';
  for(let k=0;k<7;k++){
    const x=70+Math.random()*116,y=70+Math.random()*116,r=40+Math.random()*70,hh=(hue+Math.random()*50-10+360)%360;
    const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'hsla('+hh+',85%,60%,.34)');gr.addColorStop(1,'hsla('+hh+',85%,50%,0)');
    g.fillStyle=gr;g.fillRect(0,0,256,256);
  }
  return new THREE.CanvasTexture(c);
}
export function heartPath(g,x,y,s){
  g.beginPath();g.moveTo(x,y+s*0.9);
  g.bezierCurveTo(x-s*1.3,y-s*0.1,x-s*0.6,y-s*0.9,x,y-s*0.35);
  g.bezierCurveTo(x+s*0.6,y-s*0.9,x+s*1.3,y-s*0.1,x,y+s*0.9);g.closePath();
}

