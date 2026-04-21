import React, { useState, useEffect, useRef } from 'react';

const SearchInput = ({ candidates, onSelect, placeholder = "Search...", className = "w-64" }) => {
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
    <div ref={ref} className={`relative ${className} z-50`}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {filtered.map(c => (
            <div 
              key={c.id} 
              onClick={() => { onSelect(c); setQuery(''); setShow(false); }} 
              className="px-4 py-3 cursor-pointer hover:bg-slate-700/80 border-b border-slate-700 transition-colors last:border-0"
            >
              <div className="font-semibold text-slate-200 text-sm">{c.full_name}</div>
              <div className="text-xs text-slate-400">{c.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
