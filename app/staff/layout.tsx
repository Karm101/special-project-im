"use client";

import { Sidebar } from "../components/drms/Sidebar";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout drms-root" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar stays fixed on the left */}
      <Sidebar /> 
      
      {/* Main area takes up the REST of the horizontal space */}
      <div className="main-area" style={{ 
        flex: 1, 
        height: '100vh', 
        overflowY: 'auto', 
        position: 'relative',
        backgroundColor: '#F3F3F3' 
      }}>
        {children}
      </div>
    </div>
  );
}