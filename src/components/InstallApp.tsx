'use client';

import { useEffect } from 'react';

export default function InstallApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e: any) => {
      e.preventDefault();
      (window as any).__anlurichInstall = e;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  return null;
}

export async function installAnlurichApp() {
  const prompt = (window as any).__anlurichInstall;
  if (prompt) {
    prompt.prompt();
    await prompt.userChoice;
    (window as any).__anlurichInstall = null;
    return;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  box.innerHTML = `<div style="background:#fff;border-radius:16px;padding:20px;max-width:360px;width:100%"><div style="font-weight:800;font-size:18px;margin-bottom:8px">Install Anlurich APP</div><div style="margin-bottom:12px">${ios ? 'Tap the Share button, then Add to Home Screen. Your favicon becomes the icon.' : 'In Chrome, tap the menu (three dots), then Install app or Add to Home screen. Your favicon becomes the icon.'}</div><button id="close-install" style="width:100%;background:#1e3a8a;color:#fff;border:0;border-radius:10px;padding:10px;font-weight:700">OK</button></div>`;
  document.body.appendChild(box);
  box.querySelector('#close-install')?.addEventListener('click', () => box.remove());
}
