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
            onClick={() => onToggle(chip)}
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
  onApply: () => void;
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
}

export function FilterPanel({
  open, onClose, onApply, onReset,
  selectedStatus, onToggleStatus, statusOptions,
  selectedFormType, onToggleFormType, showFormType = true,
  showMode = true, selectedMode, onToggleMode,
  showStaff = true,
  showDateRange = true,
}: FilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <div ref={ref} className={`filter-panel drms-root${open ? ' open' : ''}`}>
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
          <div className="fp-date-row">
            <input type="date" className="drms-input" style={{ fontSize: 12, padding: '6px 8px' }} />
            <span className="fp-sep-txt">to</span>
            <input type="date" className="drms-input" style={{ fontSize: 12, padding: '6px 8px' }} />
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
          onClick={() => { onApply(); onClose(); }}
        >
          Apply Filter
        </button>
        <button
          className="btn-outline btn-sm"
          onClick={() => { onReset(); }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
