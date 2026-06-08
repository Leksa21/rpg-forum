const CLASS_ICONS = {
  warrior: '🗡', mage: '🔮', rogue: '🗡', ranger: '🏹', cleric: '✨',
};

const OUTCOME_ICONS = {
  friendly:  '🤝',
  clash:     '⚔',
  fled:      '💨',
  they_fled: '💨',
  attacked:  '🗡',
  ambushed:  '🛡',
};

export default function EncounterOverlay({ encounter, onRespond }) {
  const { opponent, waiting, result } = encounter;
  const classIcon = CLASS_ICONS[opponent?.class?.toLowerCase()] ?? '⚔';

  return (
    <div className="enc-overlay">
      <div className="enc-panel">
        {result ? (
          <div className="enc-result">
            <div className="enc-result-icon">{OUTCOME_ICONS[result.outcome.type] ?? '⚔'}</div>
            <p className="enc-result-msg">{result.outcome.message}</p>
          </div>
        ) : (
          <>
            <p className="enc-subtitle">Susret</p>

            <div className="enc-opponent">
              <div className="enc-opponent-icon">{classIcon}</div>
              <div className="enc-opponent-name">{opponent?.name}</div>
              {opponent?.class && (
                <div className="enc-opponent-class">{opponent.class}</div>
              )}
            </div>

            {waiting ? (
              <div className="enc-waiting">
                <div className="enc-dots"><span /><span /><span /></div>
                <p>Čeka se odgovor…</p>
              </div>
            ) : (
              <div className="enc-actions">
                <button className="enc-btn enc-btn-greet"  onClick={() => onRespond('greet')}>
                  <span className="enc-btn-icon">🤝</span>
                  <span>Pozdraviti</span>
                </button>
                <button className="enc-btn enc-btn-flee"   onClick={() => onRespond('flee')}>
                  <span className="enc-btn-icon">💨</span>
                  <span>Pobjeći</span>
                </button>
                <button className="enc-btn enc-btn-attack" onClick={() => onRespond('attack')}>
                  <span className="enc-btn-icon">⚔</span>
                  <span>Napasti</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
