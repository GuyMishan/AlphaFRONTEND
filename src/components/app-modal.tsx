"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
export function AppModal({open=true,title,subtitle,children,actions,onClose,width="md",closeOnBackdrop=true,ariaLabel}:{open?:boolean;title?:string;subtitle?:string;children:ReactNode;actions?:ReactNode;onClose?:()=>void;width?:"sm"|"md"|"lg"|"xl";closeOnBackdrop?:boolean;ariaLabel?:string}) {
  useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow="hidden";const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose?.()};window.addEventListener("keydown",key);return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",key)}},[open,onClose]);
  if(!open)return null;
  return <div className="app-modal-backdrop" role="presentation" onMouseDown={e=>{if(closeOnBackdrop&&e.target===e.currentTarget)onClose?.()}}><section className={`app-modal app-modal-${width} ${className ?? ""}`} role="dialog" aria-modal="true" aria-label={ariaLabel??title}>
    {(title||subtitle||onClose)?<header className="app-modal-header"><div>{title?<h2>{title}</h2>:null}{subtitle?<p>{subtitle}</p>:null}</div>{onClose?<button type="button" className="app-modal-close" onClick={onClose} aria-label="סגירה"><X size={20}/></button>:null}</header>:null}
    <div className={`app-modal-body ${bodyClassName ?? ""}`}>{children}</div>{actions?<footer className="app-modal-actions">{actions}</footer>:null}
  </section></div>;
}
