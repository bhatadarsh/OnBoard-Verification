import React from 'react';
import './OnboardGuard.css';

const OBCandidateSearch = ({ candidates, onSelect, selectedId, placeholder = "Search candidates..." }) => {
  const [query, setQuery] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  const filtered = candidates.filter(c => 
    c.full_name?.toLowerCase().includes(query.toLowerCase()) || 
    c.email?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="ob-search-box" style={{ position: 'relative' }}>
      <span style={{ fontSize: '18px' }}>🔍</span>
      <input 
        type="text" 
        className="ob-search-input" 
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(query || isFocused) && (
        <div className="ob-search-results" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1.5px solid #e2e8f0',
          borderRadius: '8px',
          marginTop: '4px',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {filtered.length > 0 ? filtered.map(c => (
            <div 
              key={c.id} 
              className="ob-search-item"
              onClick={() => { onSelect(c); setQuery(''); }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                background: selectedId === c.id ? '#fff8f8' : 'transparent'
              }}
            >
              <span style={{ fontWeight: 600 }}>{c.full_name}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{c.email}</span>
            </div>
          )) : (
            <div style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px' }}>No candidates found</div>
          )}
        </div>
      )}
      <div style={{ position: 'relative' }}></div>
    </div>
  );
};

export default OBCandidateSearch;
