"use client";

import { useState, useEffect } from 'react';
import { Topbar } from '../../components/drms/Topbar';

// ── Setting row component ─────────────────────────────────────────────────────
function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Montserrat', sans-serif" }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 24 }}>{children}</div>
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: on ? '#114B9F' : 'rgba(255,255,255,0.15)',
        position: 'relative', transition: 'background .2s', padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        display: 'block',
      }} />
    </button>
  );
}

// ── Select pill group ──────────────────────────────────────────────────────────
function PillGroup({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600,
            border: '1.5px solid',
            borderColor: value === o.value ? '#114B9F' : 'var(--border-col)',
            background: value === o.value ? '#114B9F' : 'var(--surface-2)',
            color: value === o.value ? 'white' : 'var(--text-primary)',
            cursor: 'pointer', transition: 'all .15s',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  // ── Settings state ────────────────────────────────────────────────────────
  const [theme, setTheme]         = useState<'light' | 'dark'>('light');
  const [notifInterval, setNotifInterval] = useState<'15' | '30' | '60'>('30');
  const [defaultView, setDefaultView]     = useState<'list' | 'card'>('list');
  const [itemsPerPage, setItemsPerPage]   = useState<'10' | '20' | '50'>('10');
  const [saved, setSaved]         = useState(false);

  // ── Load from localStorage on mount ───────────────────────────────────────
  useEffect(() => {
    setTheme((localStorage.getItem('drms_theme') as 'light' | 'dark') ?? 'light');
    setNotifInterval((localStorage.getItem('drms_notif_interval') as '15'|'30'|'60') ?? '30');
    setDefaultView((localStorage.getItem('drms_view') as 'list'|'card') ?? 'list');
    setItemsPerPage((localStorage.getItem('drms_items_per_page') as '10'|'20'|'50') ?? '10');
  }, []);

  // ── Apply theme change immediately ─────────────────────────────────────────
  function handleThemeToggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('drms_theme', next);
  }

  // ── Save all settings ─────────────────────────────────────────────────────
  function handleSave() {
    localStorage.setItem('drms_theme', theme);
    localStorage.setItem('drms_notif_interval', notifInterval);
    localStorage.setItem('drms_view', defaultView);
    localStorage.setItem('drms_items_per_page', itemsPerPage);
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Settings' }]} showNotifDot />
      <div className="page-body" style={{ maxWidth: 680 }}>

        {/* ── Appearance ── */}
        <div className="drms-card" style={{ padding: 24, marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Appearance</div>

          <SettingRow
            label="Dark Mode"
            description="Switch between light and dark interface theme"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#B1B1B1' }}>{theme === 'dark' ? 'On' : 'Off'}</span>
              <Toggle on={theme === 'dark'} onToggle={handleThemeToggle} />
            </div>
          </SettingRow>

          <SettingRow
            label="Default View"
            description="Preferred table layout when opening the Dashboard"
          >
            <PillGroup
              options={[{ label: '☰ List', value: 'list' }, { label: '⊞ Card', value: 'card' }]}
              value={defaultView}
              onChange={v => setDefaultView(v as 'list' | 'card')}
            />
          </SettingRow>

          <SettingRow
            label="Items per Page"
            description="Number of rows shown per page on tables"
          >
            <PillGroup
              options={[{ label: '10', value: '10' }, { label: '20', value: '20' }, { label: '50', value: '50' }]}
              value={itemsPerPage}
              onChange={v => setItemsPerPage(v as '10'|'20'|'50')}
            />
          </SettingRow>
        </div>

        {/* ── Notifications ── */}
        <div className="drms-card" style={{ padding: 24, marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Notifications</div>

          <SettingRow
            label="Refresh Interval"
            description="How often the notification count updates in the topbar and sidebar"
          >
            <PillGroup
              options={[
                { label: '15s', value: '15' },
                { label: '30s', value: '30' },
                { label: '60s', value: '60' },
              ]}
              value={notifInterval}
              onChange={v => setNotifInterval(v as '15'|'30'|'60')}
            />
          </SettingRow>

          <div className="info-box" style={{ marginTop: 12 }}>
            <span className="info-icon">ℹ️</span>
            <div className="info-text" style={{ fontSize: 12 }}>
              Shorter intervals keep counts more real-time but make slightly more API calls.
              The change takes effect after your next page load.
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-primary"
            style={{ justifyContent: 'center', padding: '10px 28px' }}
            onClick={handleSave}
          >
            ✓ Save Settings
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, animation: 'fadeIn .2s' }}>
              ✅ Settings saved!
            </span>
          )}
        </div>

      </div>
    </>
  );
}
