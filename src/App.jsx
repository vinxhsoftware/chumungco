import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Engine} from './Engine.js';
import {Music} from './music.js';
import './styles.css';

const h=React.createElement;

/* =====================  REACT  ===================== */
function fmtDate(s){if(!s)return'';const p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s}

function BubbleField(){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current,g=cv.getContext('2d');let W,H,dpr,raf,items=[],last=performance.now(),t=0;
    const mk=(kind,fresh)=>({kind,x:Math.random()*W,y:fresh?H+80+Math.random()*H*0.4:Math.random()*H,z:0.45+Math.random()*0.85,ph:Math.random()*6.28,
      sp:18+Math.random()*30,rot:Math.random()*6.28,vr:(Math.random()-0.5)*1.2,hue:[335,345,320,50,20,280][Math.floor(Math.random()*6)],base:kind==='b'?12+Math.random()*34:16+Math.random()*30});
    const rs=()=>{dpr=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0);
      const n=Math.max(14,Math.min(34,Math.round(W*H/32000)));items=[];for(let i=0;i<n;i++)items.push(mk('b',false));for(let i=0;i<n;i++)items.push(mk('f',false));items.sort((a,b)=>a.z-b.z)};
    rs();window.addEventListener('resize',rs);
    const flower=(x,y,s,rot,hue,a)=>{
      g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=a;
      for(let i=0;i<5;i++){g.rotate(Math.PI*2/5);const gr=g.createRadialGradient(0,-s*0.5,s*0.05,0,-s*0.5,s*0.6);
        gr.addColorStop(0,'hsla('+hue+',90%,96%,.95)');gr.addColorStop(1,'hsla('+hue+',85%,72%,.9)');g.fillStyle=gr;
        g.beginPath();g.ellipse(0,-s*0.52,s*0.3,s*0.52,0,0,6.283);g.fill()}
      g.fillStyle='#ffd54f';g.beginPath();g.arc(0,0,s*0.17,0,6.283);g.fill();g.fillStyle='#ff9800';g.beginPath();g.arc(0,0,s*0.07,0,6.283);g.fill();g.restore();
    };
    const bubble=(x,y,r,a)=>{
      g.save();g.globalAlpha=a;const gr=g.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r);
      gr.addColorStop(0,'rgba(255,255,255,.05)');gr.addColorStop(0.75,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,.5)');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.283);g.fill();
      const lg=g.createLinearGradient(x-r,y-r,x+r,y+r);lg.addColorStop(0,'rgba(255,120,200,.7)');lg.addColorStop(0.5,'rgba(130,200,255,.7)');lg.addColorStop(1,'rgba(255,230,140,.7)');
      g.strokeStyle=lg;g.lineWidth=1.6;g.stroke();
      g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(x-r*0.38,y-r*0.4,r*0.22,r*0.12,-0.7,0,6.283);g.fill();g.restore();
    };
    const frame=now=>{
      raf=requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;t+=dt;g.clearRect(0,0,W,H);
      for(const it of items){
        it.y-=it.sp*it.z*dt*(it.kind==='b'?1:0.55);it.x+=Math.sin(t*0.8+it.ph)*22*it.z*dt;it.rot+=it.vr*dt;
        if(it.y<-90){it.y=H+80;it.x=Math.random()*W}
        const s=it.base*it.z;if(it.kind==='b')bubble(it.x,it.y,s,0.5+it.z*0.4);else flower(it.x,it.y,s,it.rot,it.hue,0.55+it.z*0.4);
      }
    };
    raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',rs)};
  },[]);
  return h('canvas',{ref});
}

function Welcome({info,setInfo,photos,addPhotos,onEnter}){
  const [err,setErr]=useState('');const [tilt,setTilt]=useState({x:0,y:0});
  const started=useRef(false);
  const kick=()=>{if(!started.current){started.current=true;Music.start()}};
  const submit=e=>{
    e.preventDefault();
    if(!info.date){setErr('Bạn hãy chọn ngày tháng năm nhé!');return}
    Music.start();onEnter();
  };
  const move=e=>{const x=(e.clientX/innerWidth-0.5)*2,y=(e.clientY/innerHeight-0.5)*2;setTilt({x:y*-4,y:x*5})};
  return h('div',{className:'welcome',onPointerMove:move,onPointerDown:kick},
    h(BubbleField),
    h('form',{className:'card',onSubmit:submit,style:{transform:'rotateX('+tilt.x+'deg) rotateY('+tilt.y+'deg)'}},
      h('h1',null,'Mừng Ngày Nhà Giáo Việt Nam'),
      h('p',{className:'sub'},'20/11 — Gửi cô một chuyến phiêu lưu giữa các vì sao ✨'),
      h('label',null,'Tên cô giáo (không bắt buộc)'),
      h('input',{type:'text',placeholder:'VD: Lan',value:info.teacher,maxLength:30,onChange:e=>setInfo({...info,teacher:e.target.value})}),
      h('label',null,'Tên của em (không bắt buộc)'),
      h('input',{type:'text',placeholder:'VD: Minh',value:info.student,maxLength:30,onChange:e=>setInfo({...info,student:e.target.value})}),
      h('label',null,'Ngày tháng năm'),
      h('input',{type:'date',value:info.date,onChange:e=>{setErr('');setInfo({...info,date:e.target.value})}}),
      err&&h('div',{className:'err'},err),
      h('label',{className:'upl'},photos.length?('📷 Đã chọn '+photos.length+' ảnh — chọn thêm'):'📷 Thêm ảnh của cô (tuỳ chọn)',
        h('input',{type:'file',accept:'image/*',multiple:true,onChange:e=>{addPhotos(e.target.files);e.target.value=''}})),
      h('button',{type:'submit',className:'go'},'Vào 🌸')
    )
  );
}

function Universe({teacher,photos,engineRef,onPhase,onCount}){
  const el=useRef(null),cbs=useRef({});cbs.current={onPhase,onCount};
  const [fail,setFail]=useState(false);
  useEffect(()=>{
    let eng=null;
    try{eng=new Engine(el.current,{onPhase:p=>cbs.current.onPhase(p),onCount:n=>cbs.current.onCount(n)},{teacher,photos:photos.map(p=>p.url)});engineRef.current=eng}
    catch(e){console.error(e);setFail(true)}
    return()=>{if(eng)eng.dispose();engineRef.current=null};
  },[]);
  useEffect(()=>{if(engineRef.current)engineRef.current.setPhotos(photos.map(p=>p.url))},[photos]);
  return h('div',{className:'uni',ref:el},fail&&h('div',{className:'fail'},'Thiết bị của bạn chưa hỗ trợ WebGL nên không hiển thị được cảnh 3D 😢'));
}

const WISHES=[
  w=>'Kính chúc '+w+' ngày Nhà giáo Việt Nam 20/11 thật ý nghĩa và ngập tràn niềm vui! 🌸',
  w=>'Cảm ơn '+w+' đã dạy chúng em từng con chữ và cả bài học làm người.',
  w=>'Chúc '+w+' luôn mạnh khỏe, hạnh phúc và thật nhiều yêu thương bên gia đình.',
  w=>w[0].toUpperCase()+w.slice(1)+' như người lái đò thầm lặng, đưa chúng em cập bến tri thức. 🚣‍♀️',
  w=>'Mỗi nụ cười của '+w+' là ánh nắng ấm áp nhất trong lớp học. ☀️',
  w=>'Công ơn của '+w+', chúng em xin ghi nhớ suốt đời. 💖',
  w=>'Chúc '+w+' luôn xinh đẹp, thành công và tỏa sáng như những vì sao! ⭐'
];

function App(){
  const [started,setStarted]=useState(false);
  const [info,setInfo]=useState({teacher:'',student:'',date:'2026-11-20'});
  const [photos,setPhotos]=useState([]);
  const [phase,setPhase]=useState('idle');
  const [count,setCount]=useState(0);
  const [flash,setFlash]=useState(0);
  const [muted,setMuted]=useState(false);
  const [canExit,setCanExit]=useState(false);
  const [hintOn,setHintOn]=useState(true);
  const [wi,setWi]=useState(0);
  const eng=useRef(null);
  const who=info.teacher.trim()?'cô '+info.teacher.trim():'cô';

  const addPhotos=files=>{const arr=Array.from(files||[]).filter(f=>/^image\//.test(f.type)).slice(0,24).map(f=>({url:URL.createObjectURL(f),name:f.name}));if(arr.length)setPhotos(p=>[...p,...arr])};
  const onPhase=p=>{setPhase(p);if(p==='cruise'||p==='free')setFlash(f=>f+1)};
  useEffect(()=>{
    if(phase!=='cruise')return;setCanExit(false);const id=setTimeout(()=>setCanExit(true),6000);return()=>clearTimeout(id);
  },[phase]);
  useEffect(()=>{
    if(phase!=='free')return;setHintOn(true);const id=setTimeout(()=>setHintOn(false),10000);return()=>clearTimeout(id);
  },[phase]);
  useEffect(()=>{
    if(!started||(phase!=='idle'&&phase!=='countdown'))return;const id=setInterval(()=>setWi(i=>(i+1)%WISHES.length),5000);return()=>clearInterval(id);
  },[started,phase]);
  const toggleMute=()=>{const m=!muted;setMuted(m);Music.setMuted(m);if(!m)Music.start()};
  const replay=()=>{setStarted(false);setPhase('idle');setCount(0)};
  const sceneNo=!started?1:phase==='free'?4:(phase==='cruise'||phase==='exit')?3:2;

  const hold=d=>({onPointerDown:e=>{e.preventDefault();eng.current&&eng.current.setMove(d)},onPointerUp:()=>eng.current&&eng.current.setMove(0),onPointerLeave:()=>eng.current&&eng.current.setMove(0),onPointerCancel:()=>eng.current&&eng.current.setMove(0),onContextMenu:e=>e.preventDefault()});

  return h('div',{className:'stage'},
    !started&&h(Welcome,{info,setInfo,photos,addPhotos,onEnter:()=>{setPhase('idle');setStarted(true)}}),
    started&&h(Universe,{teacher:info.teacher.trim(),photos,engineRef:eng,onPhase,onCount:setCount}),
    started&&h('div',{className:'ui'},
      (phase==='idle'||phase==='countdown')&&h('div',{className:'topcap'},h('small',null,'🎓 Ngày '+fmtDate(info.date)+(info.student.trim()?' · '+info.student.trim()+' kính tặng '+who:'')),h('h2',null,'Gửi '+who+' kính yêu')),
      (phase==='idle')&&h('div',{className:'bottom'},
        h('div',{className:'wish',key:wi},WISHES[wi](who)),
        h('button',{className:'pill pulse',onClick:()=>eng.current&&eng.current.launch()},'🚀 Chạm phi thuyền để bay'),
        h('div',{className:'hint'},'Ngắm pháo hoa rồi bấm vào phi thuyền nhé')),
      phase==='countdown'&&h('div',{className:'bottom'},h('div',{className:'wish',key:wi},WISHES[wi](who))),
      phase==='countdown'&&count>0&&h('div',{className:'count'},h('span',{key:count},count)),
      phase==='ascend'&&h('div',{className:'center-msg'},'Cất cánh! Hướng tới những vì sao… ✨'),
      phase==='cruise'&&h('div',{className:'topcap'},h('small',null,'Hành trình giữa các vì sao'),h('h2',null,'Ngân hà dành tặng '+who)),
      phase==='cruise'&&h('div',{className:'bottom'},
        canExit?h('button',{className:'pill pulse',onClick:()=>eng.current&&eng.current.exit()},'👩‍🚀 Ra khỏi phi thuyền'):h('div',{className:'hint'},'Di chuyển chuột / ngón tay để lái phi thuyền qua các hành tinh')),
      phase==='exit'&&h('div',{className:'center-msg'},'Mở cửa phi thuyền… bạn đang trôi giữa vũ trụ 🌌'),
      phase==='free'&&h('div',{className:'topcap'},h('h2',null,(who[0].toUpperCase()+who.slice(1))+' là vì sao sáng nhất ⭐'),h('small',null,'Chúc mừng ngày Nhà giáo Việt Nam 20/11'+(info.student.trim()?' — '+info.student.trim():''))),
      phase==='free'&&h('div',{className:'bottom'},
        hintOn&&h('div',{className:'hint'},'Kéo để nhìn quanh · cuộn hoặc giữ ▲ ▼ để bay · chạm ảnh để lại gần'),
        h('div',{className:'row'},
          h('label',{className:'pill ghost',style:{pointerEvents:'auto'}},'📷 Thêm ảnh',h('input',{type:'file',accept:'image/*',multiple:true,style:{display:'none'},onChange:e=>{addPhotos(e.target.files);e.target.value=''}})),
          h('button',Object.assign({className:'pill ghost'},hold(1)),'▲ Tiến'),
          h('button',Object.assign({className:'pill ghost'},hold(-1)),'▼ Lùi'),
          h('button',{className:'pill ghost',onClick:replay},'↺ Từ đầu')))
    ),
    started&&h('div',{className:'dots'},[1,2,3,4].map(i=>h('i',{key:i,className:sceneNo===i?'on':''}))),
    flash>0&&h('div',{className:'flash',key:'f'+flash}),
    h('button',{className:'mute',onClick:toggleMute,title:'Bật/tắt nhạc'},muted?'🔇':'🔊')
  );
}
createRoot(document.getElementById('root')).render(h(App));
