import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="app-layout drms-root">
      <Sidebar />
      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}
