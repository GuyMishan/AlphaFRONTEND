"use client";

import { Accessibility, Eye, Link2, RotateCcw, Text, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

type State={large:boolean;contrast:boolean;links:boolean;motion:boolean};
const initial:State={large:false,contrast:false,links:false,motion:false};

export function AccessibilityMenu(){
  const [open,setOpen]=useState(false);
  const [state,setState]=useState<State>(initial);

  useEffect(()=>{
    const raw=localStorage.getItem("alpha-a11y");
    if(raw){
      try{ const parsed={...initial,...JSON.parse(raw)}; requestAnimationFrame(()=>setState(parsed)); }catch{}
    }
  },[]);

  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.a11yLarge=String(state.large);
    root.dataset.a11yContrast=String(state.contrast);
    root.dataset.a11yLinks=String(state.links);
    root.dataset.a11yMotion=String(state.motion);
    localStorage.setItem("alpha-a11y",JSON.stringify(state));
  },[state]);

  const flip=(k:keyof State)=>setState(s=>({...s,[k]:!s[k]}));
  return <div className="accessibility-widget">
    {open?<div className="accessibility-popover" role="dialog" aria-label="תפריט נגישות">
      <b>התאמות נגישות</b>
      <button className="btn" onClick={()=>flip("large")}><Text size={16}/>טקסט גדול</button>
      <button className="btn" onClick={()=>flip("contrast")}><Eye size={16}/>ניגודיות גבוהה</button>
      <button className="btn" onClick={()=>flip("links")}><Link2 size={16}/>הדגשת קישורים</button>
      <button className="btn" onClick={()=>flip("motion")}><Wand2 size={16}/>הפחתת תנועה</button>
      <button className="btn" onClick={()=>setState(initial)}><RotateCcw size={16}/>איפוס</button>
    </div>:null}
    <button className="accessibility-trigger" aria-label="פתיחת תפריט נגישות" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Accessibility size={20}/></button>
  </div>;
}
