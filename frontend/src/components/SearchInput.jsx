import React, { useState, useEffect, useRef } from 'react';

const SearchInput = ({ candidates, onSelect, placeholder = "Search..." }) => {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  const filtered = query ? candidates.filter(c =>
    c.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: 280, zIndex: 50 }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 16px 10px 38px',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
          fontSize: 13, color: '#e8f0fe', fontFamily: "'Outfit',sans-serif",
          outline: 'none', transition: 'all 0.2s',
        }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,229,255,0.08)'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 14 }}>🔍</span>
      {show && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c); setQuery(''); setShow(false); }}
              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, color: '#e8f0fe', fontSize: 13 }}>{c.full_name}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{c.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
