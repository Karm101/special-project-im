import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronDown } from 'lucide-react';

interface BreadcrumbItem { label: string; href?: string; }

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  showNotifDot?: boolean;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  rightExtras?: React.ReactNode;
}

export function Topbar({
  breadcrumbs,
  showNotifDot = true,
  userName = 'Sinday, Grace Hyacinth',
  userRole = 'RO Staff',
  userInitials = 'GS',
  rightExtras,
}: TopbarProps) {
  const navigate = useNavigate();
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="topbar">
      {/* Left: divider + breadcrumb — NO hamburger menu */}
      <div className="topbar-left">
        <div className="topbar-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: '#B1B1B1', margin: '0 2px', fontSize: 16 }}>/</span>}
              <span
                className="topbar-page-title"
                style={crumb.href ? { cursor: 'pointer', color: '#B1B1B1', fontWeight: 400 } : {}}
                onClick={crumb.href ? () => navigate(crumb.href!) : undefined}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="topbar-right">
        {rightExtras}

        <div className="topbar-bell" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer', position: 'relative', padding: 4 }}>
          <Bell size={18} color="#001C43" />
          {showNotifDot && (
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, background: '#E50019', borderRadius: '50%', border: '1.5px solid #FCFCFC' }} />
          )}
        </div>

        {/* User block */}
        <div ref={ddRef} style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px 6px 6px', borderRadius: 50, transition: 'background .15s' }}
            onClick={() => setDdOpen(o => !o)}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="user-info-block">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <div className="user-avatar">{userInitials}</div>
            <ChevronDown size={10} color="#B1B1B1" />
          </div>

          {/* Dropdown */}
          <div className={`user-dropdown${ddOpen ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <button className="dd-item">👤 View Profile</button>
            <button className="dd-item">⚙️ Settings</button>
            <div className="dd-sep" />
            <button className="dd-item danger" onClick={() => navigate('/')}>🚪 Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
