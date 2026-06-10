import { useEffect, useRef } from 'react';

export default function CombatLog({ entries }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="cmb-log-wrap">
      <div className="cmb-log-title">⚔ Combat Log</div>
      <div className="cmb-log-entries">
        {entries.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
            No actions yet.
          </div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className={`cmb-log-entry action-${entry.action}`}>
            <span className="cmb-log-turn">T{entry.turn}</span>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
