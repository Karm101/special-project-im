"use client";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to   = Math.min(currentPage * itemsPerPage, totalItems);

  // Build page numbers to show — always show first, last, current ±1
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btn = (content: React.ReactNode, onClick: () => void, active = false, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 34, height: 34, padding: '0 10px',
        border: `1px solid ${active ? '#001C43' : '#E0E0E0'}`,
        borderRadius: 6,
        background: active ? '#001C43' : disabled ? '#F9F9F9' : 'white',
        color: active ? 'white' : disabled ? '#C0C0C0' : '#001C43',
        fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--drms-font)',
        transition: 'all .15s',
      }}
    >
      {content}
    </button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px 4px', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#B1B1B1' }}>
        Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong> results
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {btn('←', () => onPageChange(currentPage - 1), false, currentPage === 1)}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#B1B1B1', fontSize: 13 }}>…</span>
            : btn(p, () => onPageChange(p as number), p === currentPage)
        )}
        {btn('→', () => onPageChange(currentPage + 1), false, currentPage === totalPages)}
      </div>
    </div>
  );
}
