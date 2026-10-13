"use client";

import { Accessibility, Eye, Link2, RotateCcw, Text, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type State={large:boolean;contrast:boolean;links:boolean;motion:boolean};
const initial:State={large:false,contrast:false,links:false,motion:false};
// Same key the pre-paint script reads (src/features/settings/theme-init.ts), so saved modes apply before first paint.
const STORAGE_KEY="alpha-a11y";

function readSaved():State{
  if(typeof window==="undefined")return initial;
  try{ return {...initial,...JSON.parse(localStorage.getItem(STORAGE_KEY)??"{}")}; }catch{ return initial; }
}

export function AccessibilityMenu(){
  const [open,setOpen]=useState(false);
  // Rendered only inside the authenticated shell (client-side), so the saved state can be read synchronously.
  const [state,setState]=useState<State>(readSaved);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const popoverRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.a11yLarge=String(state.large);
    root.dataset.a11yContrast=String(state.contrast);
    root.dataset.a11yLinks=String(state.links);
    root.dataset.a11yMotion=String(state.motion);
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch{}
  },[state]);

  useEffect(()=>{
    if(!open)return;
    popoverRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown",onKeyDown);
    return()=>document.removeEventListener("keydown",onKeyDown);
  },[open]);

  const flip=(k:keyof State)=>setState(s=>({...s,[k]:!s[k]}));
  const toggles:Array<{key:keyof State;label:string;icon:typeof Text}>=[
    {key:"large",label:"טקסט גדול",icon:Text},
    {key:"contrast",label:"ניגודיות גבוהה",icon:Eye},
    {key:"links",label:"הדגשת קישורים",icon:Link2},
    {key:"motion",label:"הפחתת תנועה",icon:Wand2},
  ];
  return <div className="accessibility-widget">
    {open?<div ref={popoverRef} className="accessibility-popover" role="dialog" aria-label="תפריט נגישות">
      <b>התאמות נגישות</b>
      {toggles.map(({key,label,icon:Icon})=><button key={key} className="btn" aria-pressed={state[key]} onClick={()=>flip(key)}><Icon size={16}/>{label}</button>)}
      <button className="btn" onClick={()=>setState(initial)}><RotateCcw size={16}/>איפוס</button>
    </div>:null}
    <button ref={triggerRef} className="accessibility-trigger" aria-label="פתיחת תפריט נגישות" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Accessibility size={20}/></button>
  </div>;
}
