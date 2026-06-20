import { useState } from 'react';

// Scripted NPC: clickable topics drive a local conversation. No server round
// trips — the topics arrive with the venue data. (Free-text + AI later.)
export default function NpcPanel({ npc, accent = '#c9a84c' }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([]);

  if (!npc || !npc.enabled || !npc.name) return null;

  const openDialog = () => {
    setLog(npc.greeting ? [{ who: 'npc', text: npc.greeting }] : []);
    setOpen(true);
  };

  const ask = (topic) => {
    setLog(prev => [
      ...prev,
      { who: 'you', text: topic.label },
      { who: 'npc', text: topic.response || '…' },
    ]);
  };

  return (
    <div className="npc-panel" style={{ '--accent': accent }}>
      <div className="npc-avatar">{npc.avatar || '🧑'}</div>
      <div className="npc-info">
        <div className="npc-name">{npc.name}</div>
        {npc.role && <div className="npc-role">{npc.role}</div>}
        {npc.persona && <p className="npc-persona">{npc.persona}</p>}
      </div>
      <button className="npc-talk" onClick={openDialog}>💬 Speak with {npc.name}</button>

      {open && (
        <div className="npc-overlay" onClick={() => setOpen(false)}>
          <div className="npc-dialog" onClick={e => e.stopPropagation()} style={{ '--accent': accent }}>
            <div className="npc-dialog-head">
              <span className="npc-dialog-avatar">{npc.avatar || '🧑'}</span>
              <div className="npc-dialog-id">
                <div className="npc-name">{npc.name}</div>
                {npc.role && <div className="npc-role">{npc.role}</div>}
              </div>
              <button className="npc-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="npc-log">
              {log.map((m, i) => (
                <div key={i} className={`npc-line npc-line--${m.who}`}>
                  {m.who === 'npc' && <span className="npc-line-av">{npc.avatar || '🧑'}</span>}
                  <span className="npc-bubble">{m.text}</span>
                </div>
              ))}
            </div>

            <div className="npc-topics">
              {npc.topics?.length
                ? npc.topics.map((t, i) => (
                    <button key={i} className="npc-topic" onClick={() => ask(t)}>{t.label}</button>
                  ))
                : <span className="npc-no-topics">They have little to say.</span>}
              <button className="npc-leave" onClick={() => setOpen(false)}>Leave</button>
            </div>

            <div className="npc-future">✦ Free conversation coming soon…</div>
          </div>
        </div>
      )}
    </div>
  );
}
