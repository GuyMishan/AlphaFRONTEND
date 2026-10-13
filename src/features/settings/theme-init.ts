import { SESSION_META_STORAGE_KEY } from "@/lib/session/storage-keys";

/**
 * Theme storage and the pre-paint script. No "use client": the root layout (a server
 * component) inlines `themeInitScript` in <head> so the saved theme is applied before the
 * first paint, and ThemeProvider uses the same keys, so the two always agree.
 */
export const THEME_CACHE_PREFIX = "alpha-appearance:";
/** The appearance last applied for a signed-in user on this device; used before a session is known. */
export const THEME_LAST_KEY = `${THEME_CACHE_PREFIX}last`;
export const A11Y_STORAGE_KEY = "alpha-a11y";

export const themeInitScript = `(function(){try{
var root=document.documentElement,pref=null;
var meta=sessionStorage.getItem(${JSON.stringify(SESSION_META_STORAGE_KEY)});
if(meta){var s=JSON.parse(meta),user=s&&(s.userId||s.displayName);if(user)pref=localStorage.getItem(${JSON.stringify(THEME_CACHE_PREFIX)}+user);}
if(!pref)pref=localStorage.getItem(${JSON.stringify(THEME_LAST_KEY)});
if(pref!=="light"&&pref!=="dark"&&pref!=="system")pref="system";
var theme=pref==="system"?(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):pref;
root.dataset.theme=theme;root.dataset.appearance=pref;root.style.colorScheme=theme;
var a11y=JSON.parse(localStorage.getItem(${JSON.stringify(A11Y_STORAGE_KEY)})||"{}");
root.dataset.a11yLarge=String(!!a11y.large);root.dataset.a11yContrast=String(!!a11y.contrast);
root.dataset.a11yLinks=String(!!a11y.links);root.dataset.a11yMotion=String(!!a11y.motion);
}catch(e){}})();`;
