import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout drms-root">
      <Sidebar />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
