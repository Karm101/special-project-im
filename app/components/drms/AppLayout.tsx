"use client";

import { useEffect } from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  // ── Initialize theme from localStorage on mount ────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('drms_theme') ?? 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <div className="app-layout drms-root">
      <Sidebar />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
