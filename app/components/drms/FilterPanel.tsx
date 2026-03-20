import { useEffect, useRef } from 'react';

interface ChipGroupProps {
  label: string;
  chips: string[];
  selected: Set<string>;
  onToggle: (chip: string) => void;
}

function ChipGroup({ label, chips, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="fp-group">
      <span className="fp-label">{label}</span>
      <div className="fp-row">
        {chips.map(chip => (
          <button
            key={chip}
            className={`fp-chip${selected.has(chip) ? ' selected' : ''}`}
            onClick={e => { e.stopPropagation(); onToggle(chip); }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: { statuses: Set<string>; formTypes: Set<string>; modes: Set<string>; dateFrom: string; dateTo: string }) => void;
  onReset: () => void;
  selectedStatus: Set<string>;
  onToggleStatus: (s: string) => void;
  statusOptions: string[];
  selectedFormType?: Set<string>;
  onToggleFormType?: (s: string) => void;
  showFormType?: boolean;
  showMode?: boolean;
  selectedMode?: Set<string>;
  onToggleMode?: (s: string) => void;
  showStaff?: boolean;
  showDateRange?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (d: string) => void;
  onDateToChange?: (d: string) => void;
}

export function FilterPanel({
  open, onClose, onApply, onReset,
  selectedStatus, onToggleStatus, statusOptions,
  selectedFormType, onToggleFormType, showFormType = true,
  showMode = true, selectedMode, onToggleMode,
  showStaff = true,
  showDateRange = true,
  dateFrom = '', dateTo = '',
  onDateFromChange, onDateToChange,
}: FilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — but NOT when clicking the filter button itself
  // The filter button has data-filter-btn="true" to identify it
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the panel
      if (ref.current && ref.current.contains(target)) return;
      // Don't close if clicking the filter toggle button
      if (target.closest('[data-filter-btn]')) return;
      onClose();
    }
    // Use a slight delay so the button's own onClick fires first
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="filter-panel drms-root open"
      onClick={e => e.stopPropagation()}
    >
      <div className="fp-title">Filter By</div>

      <ChipGroup
        label="Status"
        chips={statusOptions}
        selected={selectedStatus}
        onToggle={onToggleStatus}
      />

      {showFormType && selectedFormType && onToggleFormType && (
        <ChipGroup
          label="Form Type"
          chips={['RO-0004', 'RO-0005']}
          selected={selectedFormType}
          onToggle={onToggleFormType}
        />
      )}

      {showMode && selectedMode && onToggleMode && (
        <ChipGroup
          label="Submission Mode"
          chips={['Online', 'Onsite']}
          selected={selectedMode}
          onToggle={onToggleMode}
        />
      )}

      {showDateRange && (
        <div className="fp-group">
          <span className="fp-label">Date Range</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#B1B1B1', minWidth: 24 }}>From</span>
              <input
                type="date"
                className="drms-input"
                style={{ fontSize: 12, padding: '6px 8px', flex: 1, minWidth: 0 }}
                value={dateFrom}
                onChange={e => onDateFromChange?.(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#B1B1B1', minWidth: 24 }}>To</span>
              <input
                type="date"
                className="drms-input"
                style={{ fontSize: 12, padding: '6px 8px', flex: 1, minWidth: 0 }}
                value={dateTo}
                onChange={e => onDateToChange?.(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {showStaff && (
        <div className="fp-group">
          <span className="fp-label">Assigned Staff</span>
          <select className="drms-select" style={{ fontSize: 12, padding: '7px 10px' }}>
            <option>All Staff</option>
            <option>Grace H. Sinday</option>
            <option>Maria Santos</option>
          </select>
        </div>
      )}

      <div className="fp-actions">
        <button
          className="btn-primary btn-sm"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={e => {
            e.stopPropagation();
            onApply({
              statuses: selectedStatus,
              formTypes: selectedFormType ?? new Set(),
              modes: selectedMode ?? new Set(),
              dateFrom,
              dateTo,
            });
            onClose();
          }}
        >
          Apply Filter
        </button>
        <button
          className="btn-outline btn-sm"
          onClick={e => { e.stopPropagation(); onReset(); }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
