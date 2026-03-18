"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// Using your REAL files now!
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';

// ── Static data with filter tags ─────────────────────────────────
type Row = {
  id: string; requester: string; doc: string; form: string; mode: string;
  sub: string; claim: string; staff: string; badgeCls: string; label: string;
  doctype: string; status: string; subDate: string;
};

const COLLEGE_ROWS: Row[] = [
  { id: '#REQ-001', requester: 'Gillo, Ian P.',          doc: 'Certificate of Enrollment', form: 'RO-0005', mode: 'Online',  sub: 'Feb 19, 2026', claim: 'Mar 03, 2026', staff: 'G. Sinday', badgeCls: 'b-done', label: 'Completed',       doctype: 'cert',  status: 'completed', subDate: 'Feb 19' },
  { id: '#REQ-002', requester: 'Balicaco, Michaelniño',  doc: 'Transfer of Credentials',   form: 'RO-0004', mode: 'Onsite', sub: 'Feb 19, 2026', claim: 'Mar 24, 2026', staff: 'G. Sinday', badgeCls: 'b-done', label: 'Completed',       doctype: 'hd',    status: 'completed', subDate: 'Feb 19' },
  { id: '#REQ-004', requester: 'Santos, Jose Rizal',     doc: 'Transcript of Records',     form: 'RO-0005', mode: 'Online',  sub: 'Mar 01, 2026', claim: 'Mar 10, 2026', staff: 'G. Sinday', badgeCls: 'b-rev',  label: 'For Review',      doctype: 'tor',   status: 'review',    subDate: 'Mar 01' },
  { id: '#REQ-005', requester: 'Macaraeg, Ana Reyes',    doc: 'Honorable Dismissal',       form: 'RO-0004', mode: 'Online',  sub: 'Mar 03, 2026', claim: 'Mar 12, 2026', staff: 'G. Sinday', badgeCls: 'b-end',  label: 'For Endorsement', doctype: 'hd',    status: 'pending',   subDate: 'Mar 03' },
  { id: '#REQ-006', requester: 'Vega, Carlo Mendoza',    doc: 'Certificate of Grades',     form: 'RO-0005', mode: 'Online',  sub: 'Mar 05, 2026', claim: 'Mar 14, 2026', staff: 'G. Sinday', badgeCls: 'b-sub',  label: 'Submitted',       doctype: 'cert',  status: 'pending',   subDate: 'Mar 05' },
  { id: '#REQ-007', requester: 'Buenaventura, Liza Tan', doc: 'Diploma',                   form: 'RO-0005', mode: 'Onsite', sub: 'Mar 07, 2026', claim: 'Mar 16, 2026', staff: 'G. Sinday', badgeCls: 'b-rel',  label: 'For Release',     doctype: 'other', status: 'release',   subDate: 'Mar 07' },
];

const SHS_ROWS: Row[] = [
  { id: '#REQ-003', requester: 'Dela Cruz, Maria',   doc: 'SF9 + SF10', form: 'RO-0005', mode: 'Online', sub: 'Feb 20, 2026', claim: 'Feb 27, 2026', staff: 'M. Santos', badgeCls: 'b-apr', label: 'For Approval',    doctype: 'sf9sf10', status: 'pending', subDate: 'Feb 20' },
  { id: '#REQ-008', requester: 'Reyes, Carlo Miguel', doc: 'SF9',       form: 'RO-0005', mode: 'Online', sub: 'Mar 06, 2026', claim: 'Mar 15, 2026', staff: 'M. Santos', badgeCls: 'b-sub', label: 'Submitted',       doctype: 'sf9',     status: 'pending', subDate: 'Mar 06' },
  { id: '#REQ-010', requester: 'Fernandez, Althea',  doc: 'SF10',       form: 'RO-0005', mode: 'Online', sub: 'Mar 09, 2026', claim: 'Mar 18, 2026', staff: 'M. Santos', badgeCls: 'b-end', label: 'For Endorsement', doctype: 'sf10',    status: 'pending', subDate: 'Mar 09' },
];

type CollegeTab = 'all' | 'tor' | 'hd' | 'pending' | 'processing' | 'released';
type ShsTab     = 'all' | 'sf9' | 'sf10' | 'sf9sf10' | 'pending' | 'released';

const COLLEGE_TABS: { label: string; filter: CollegeTab; count: number }[] = [
  { label: 'All',                 filter: 'all',        count: 6  },
  { label: 'TOR',                 filter: 'tor',        count: 1  },
  { label: 'Honorable Dismissal', filter: 'hd',         count: 2  },
  { label: 'Pending',             filter: 'pending',    count: 2  },
  { label: 'Processing',          filter: 'processing', count: 1  },
  { label: 'Released',            filter: 'released',   count: 2  },
];
const SHS_TABS: { label: string; filter: ShsTab; count: number }[] = [
  { label: 'All',        filter: 'all',     count: 3 },
  { label: 'SF9',        filter: 'sf9',     count: 1 },
  { label: 'SF10',       filter: 'sf10',    count: 1 },
  { label: 'SF9 + SF10', filter: 'sf9sf10', count: 1 },
  { label: 'Pending',    filter: 'pending', count: 3 },
  { label: 'Released',   filter: 'released',count: 0 },
];

const STATUS_OPTIONS = ['Submitted','For Endorsement','For Review','For Approval','For Release','Completed','Rejected'];

function filterRows(rows: Row[], tab: string): Row[] {
  if (tab === 'all')        return rows;
  if (tab === 'tor')        return rows.filter(r => r.doctype === 'tor');
  if (tab === 'hd')         return rows.filter(r => r.doctype === 'hd');
  if (tab === 'sf9')        return rows.filter(r => r.doctype === 'sf9');
  if (tab === 'sf10')       return rows.filter(r => r.doctype === 'sf10');
  if (tab === 'sf9sf10')    return rows.filter(r => r.doctype === 'sf9sf10');
  if (tab === 'pending')    return rows.filter(r => ['pending','submitted','endorsement'].includes(r.status));
  if (tab === 'processing') return rows.filter(r => ['review','approval'].includes(r.status));
  if (tab === 'released')   return rows.filter(r => ['completed','release'].includes(r.status));
  return rows;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dept, setDept]           = useState<'college' | 'shs'>('college');
  const [collegeTab, setCollegeTab] = useState<string>('all');
  const [shsTab, setShsTab]       = useState<string>('all');
  const [listView, setListView]   = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [search, setSearch]       = useState('');
  const [selStatus, setSelStatus]   = useState<Set<string>>(new Set());
  const [selForm, setSelForm]       = useState<Set<string>>(new Set());
  const [selMode, setSelMode]       = useState<Set<string>>(new Set());

  const isCollege = dept === 'college';
  const activeTab = isCollege ? collegeTab : shsTab;
  const setActiveTab = isCollege ? setCollegeTab : setShsTab;
  const allRows = isCollege ? COLLEGE_ROWS : SHS_ROWS;
  const tabs    = isCollege ? COLLEGE_TABS : SHS_TABS;

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  const visibleRows = useMemo(() => {
    let rows = filterRows(allRows, activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.doc.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, activeTab, search]);

  const StatCard = ({ borderColor, num, numColor, label, bg, icon }: {
    borderColor: string; num: string | number; numColor: string; label: string; bg: string; icon: React.ReactNode;
  }) => (
    <div style={{ background: 'white', borderRadius: 10, padding: 18, border: '1px solid rgba(0,0,0,.06)', borderBottom: `3px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: numColor }}>{num}</div>
          <div style={{ fontSize: 12, color: '#B1B1B1' }}>{label}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests' }]} showNotifDot />
      <div className="page-body">

        {/* Dept toggle */}
        <div className="dept-toggle">
          <button className={`dt-btn${isCollege ? ' active' : ''}`} onClick={() => { setDept('college'); }}>🎓 College</button>
          <button className={`dt-btn${!isCollege ? ' active' : ''}`} onClick={() => { setDept('shs'); }}>📚 Senior High School</button>
        </div>

        {/* Stat cards */}
        {isCollege ? (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#001C43" num={8} numColor="#001C43" label="TOR Requests"        bg="#EEF4FB" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#001C43" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>} />
            <StatCard borderColor="#E50019" num={3} numColor="#E50019" label="Honorable Dismissal" bg="#FEEAEA" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#E50019" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>} />
            <StatCard borderColor="#FFA323" num={4} numColor="#FFA323" label="Pending Verification" bg="#FFF8E1" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#FFA323" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
            <StatCard borderColor="#198754" num={5} numColor="#198754" label="Released This Month"  bg="#EAFAF1" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          </div>
        ) : (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#001C43" num={6} numColor="#001C43" label="SF9 Requests"        bg="#EEF4FB" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#001C43" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>} />
            <StatCard borderColor="#114B9F" num={6} numColor="#114B9F" label="SF10 Requests"        bg="#EBF5FB" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#114B9F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>} />
            <StatCard borderColor="#FFA323" num={2} numColor="#FFA323" label="Pending Verification" bg="#FFF8E1" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#FFA323" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
            <StatCard borderColor="#198754" num={3} numColor="#198754" label="Released This Month"  bg="#EAFAF1" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          </div>
        )}

        {/* Info box */}
        <div className="info-box" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
          <div className="info-text">
            {isCollege
              ? <>Showing <strong>College-level</strong> requests: Transcript of Records and Honorable Dismissal.</>
              : <>Showing <strong>SHS-level</strong> requests: SF9 (Report Card) and SF10 (Permanent Record).</>}
          </div>
        </div>

        {/* Tabs — functional */}
        <div className="tab-bar">
          {tabs.map(t => (
            <div
              key={t.filter}
              className={`tab${activeTab === t.filter ? ' active' : ''}`}
              onClick={() => setActiveTab(t.filter)}
            >
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Bulk select bar */}
        <div className={`bulk-bar${bulkVisible ? ' visible' : ''}`}>
          <button className="bulk-close" onClick={() => setBulkVisible(false)}>✕</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>2 Selected</span>
          <button className="btn-primary btn-sm" style={{ marginLeft: 8 }}>✓ Mark as Processing</button>
          <button className="btn-outline btn-sm">Export Selected</button>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          {/* View toggle with SVG icons */}
          <div className="view-toggle">
            <button
              className={`view-btn${listView ? ' active' : ''}`}
              onClick={() => setListView(true)}
              title="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button
              className={`view-btn${!listView ? ' active' : ''}`}
              onClick={() => setListView(false)}
              title="Card view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>

          <div className="toolbar-right">
            {/* Filter */}
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={() => {}} onReset={() => { setSelStatus(new Set()); setSelForm(new Set()); setSelMode(new Set()); }}
                selectedStatus={selStatus}  onToggleStatus={(s: string) => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={STATUS_OPTIONS}
                selectedFormType={selForm}  onToggleFormType={(s: string) => toggleChip(selForm, s, setSelForm)}
                selectedMode={selMode}      onToggleMode={(s: string) => toggleChip(selMode, s, setSelMode)}
              />
            </div>

            {/* Search */}
            <div className="search-box" style={{ minWidth: 320 }}>
              <input
                type="text"
                placeholder="Search by name, request ID, document type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {/* ── List view ── */}
        {listView && (
          <div className="table-wrap">
            <table className="drms-table">
              <thead>
                <tr>
                  <th><input type="checkbox" className="cb" onChange={e => setBulkVisible(e.target.checked)} /></th>
                  <th>Request ID</th><th>Requester Name</th><th>Document Type</th>
                  <th>Form Type</th><th>Mode</th><th>Date Submitted</th>
                  <th>Expected Claim</th><th>Assigned Staff</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => (
                  <tr key={r.id} onClick={() => router.push(`/request/${r.id.replace('#', '')}`)}>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="cb" />
                    </td>
                    <td><span className="req-id">{r.id}</span></td>
                    <td>{r.requester}</td>
                    <td>{r.doc}</td>
                    <td>{r.form}</td>
                    <td style={{ color: '#B1B1B1' }}>{r.mode}</td>
                    <td style={{ color: '#B1B1B1' }}>{r.sub}</td>
                    <td style={{ color: '#B1B1B1' }}>{r.claim}</td>
                    <td>{r.staff}</td>
                    <td><span className={`badge ${r.badgeCls}`}>{r.label}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn-outline btn-sm" onClick={() => router.push(`/request/${r.id.replace('#', '')}`)}>View</button>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No requests match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Card / Grid view ── */}
        {!listView && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {visibleRows.map(r => (
              <div
                key={r.id}
                onClick={() => router.push(`/request/${r.id.replace('#', '')}`)}
                style={{
                  background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,.08)',
                  padding: 16, cursor: 'pointer', transition: 'all .18s', display: 'flex', flexDirection: 'column', gap: 10,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,28,67,.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#114B9F' }}>{r.id}</span>
                  <span className={`badge ${r.badgeCls}`}>{r.label}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#001C43' }}>{r.requester}</div>
                  <div style={{ fontSize: 12, color: '#B1B1B1', marginTop: 2 }}>{r.doc}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: '#F5F5F5', color: '#001C43' }}>{r.form}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: '#F5F5F5', color: '#001C43' }}>{r.mode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,.05)', paddingTop: 10, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#B1B1B1' }}>Submitted {r.subDate}</span>
                  <button
                    className="btn-outline btn-sm"
                    onClick={e => { e.stopPropagation(); router.push(`/request/${r.id.replace('#', '')}`); }}
                  >View</button>
                </div>
              </div>
            ))}
            {visibleRows.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#B1B1B1', fontSize: 13 }}>No requests match this filter.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}