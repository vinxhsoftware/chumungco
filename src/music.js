/* =====================  NHẠC (WebAudio, tự sáng tác)  ===================== */
export const Music=(function(){
  let ctx=null,master=null,delay=null,timer=null,nextT=0,step=0,muted=false,lastMel=76;
  const prog=[[48,52,55],[45,48,52],[53,57,60],[55,59,62]];
  const pent=[67,69,72,74,76,79,81,84];
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const BEAT=0.43;
  function init(){
    if(ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    ctx=new AC(); master=ctx.createGain(); master.gain.value=muted?0:0.55; master.connect(ctx.destination);
    delay=ctx.createDelay(1.0); delay.delayTime.value=BEAT*1.5;
    const fb=ctx.createGain(); fb.gain.value=0.38; const wet=ctx.createGain(); wet.gain.value=0.45;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  }
  function tone(f,t,d,v,type){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
    o.type=type||'sine'; o2.type='sine'; o.frequency.value=f; o2.frequency.value=f*2.0; g2.gain.value=0.22;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master); g.connect(delay);
    o.start(t);o2.start(t);o.stop(t+d+0.05);o2.stop(t+d+0.05);
  }
  function pad(notes,t,d){
    notes.forEach(m=>{
      const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.value=mtof(m);
      g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.035,t+1.2); g.gain.linearRampToValueAtTime(0.0001,t+d);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+d+0.1);
    });
  }
  function sched(s,t){
    const chord=prog[Math.floor(s/8)%4], i=s%8;
    if(i===0)pad(chord,t,BEAT*8.5);
    const pat=[0,2,1,2,0,2,1,2], p=pat[i];
    tone(mtof(chord[p]+12+(p===2?12:0)),t,1.6,0.085);
    if(i===0||i===4||Math.random()<0.3){
      let idx=pent.indexOf(lastMel); if(idx<0)idx=3;
      idx=clamp(idx+Math.round((Math.random()-0.5)*4),0,pent.length-1);
      lastMel=pent[idx]; tone(mtof(lastMel),t+0.02,1.8,0.07,'triangle');
    }
  }
  function tick(){ if(!ctx)return; while(nextT<ctx.currentTime+0.5){sched(step,nextT);nextT+=BEAT;step++;} }
  return{
    start(){ try{ init(); if(!ctx)return; if(ctx.state==='suspended')ctx.resume(); if(!timer){nextT=ctx.currentTime+0.1;timer=setInterval(tick,120);} }catch(e){} },
    setMuted(m){ muted=m; if(master)master.gain.setTargetAtTime(m?0:0.55,ctx.currentTime,0.1); },
    boom(v){
      if(!ctx||muted||ctx.state!=='running')return;
      try{
        const t=ctx.currentTime, len=Math.floor(ctx.sampleRate*0.6), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
        for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
        const s=ctx.createBufferSource(); s.buffer=buf; const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=500+Math.random()*500;
        const g=ctx.createGain(); g.gain.value=0.16*(v||1); s.connect(f); f.connect(g); g.connect(master); s.start(t);
        const o=ctx.createOscillator(),og=ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(40,t+0.3);
        og.gain.setValueAtTime(0.18*(v||1),t); og.gain.exponentialRampToValueAtTime(0.001,t+0.35); o.connect(og); og.connect(master); o.start(t); o.stop(t+0.4);
      }catch(e){}
    }
  };
})();

