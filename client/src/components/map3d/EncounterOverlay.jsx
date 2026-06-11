import { useState, useEffect } from 'react';

const CLASS_ICONS = {
  warrior: '🗡', paladin: '🛡', mage: '🔮', necromancer: '💀',
  rogue: '🗡', ranger: '🏹', druid: '🌿', bard: '🎵',
};

const OUTCOME_ICONS = {
  friendly:  '🤝',
  clash:     '⚔',
  fled:      '💨',
  they_fled: '💨',
  attacked:  '🗡',
  ambushed:  '🛡',
};

const BATTLE_REDIRECT_S = 3;

function secondsLeft(deadline) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export default function EncounterOverlay({ encounter, onRespond, onGoToBattle }) {
  const { opponent, waiting, result, battleId, deadline } = encounter;
  const classIcon = CLASS_ICONS[opponent?.class?.toLowerCase()] ?? '⚔';
  const isClash   = result?.outcome?.type === 'clash';

  // Decision countdown (server auto-resolves with "greet" when it hits 0)
  const [timeLeft, setTimeLeft] = useState(() => secondsLeft(deadline));
  useEffect(() => {
    if (!deadline) { setTimeLeft(null); return; }
    setTimeLeft(secondsLeft(deadline));
    const id = setInterval(() => setTimeLeft(secondsLeft(deadline)), 500);
    return () => clearInterval(id);
  }, [deadline]);

  // Auto-redirect countdown once a battle exists
  const [redirectIn, setRedirectIn] = useState(BATTLE_REDIRECT_S);
  useEffect(() => {
    setRedirectIn(BATTLE_REDIRECT_S);
    if (!battleId) return;
    const id = setInterval(() => setRedirectIn(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [battleId]);

  useEffect(() => {
    if (battleId && redirectIn === 0) onGoToBattle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, redirectIn]);

  const timerPct      = timeLeft != null ? Math.min(100, (timeLeft / 30) * 100) : 0;
  const timerUrgent   = timeLeft != null && timeLeft <= 10;
  const showTimer     = !result && timeLeft != null;

  return (
    <div className="enc-overlay">
      <div className="enc-panel">
        {result ? (
          <div className="enc-result">
            <div className="enc-result-icon">{OUTCOME_ICONS[result.outcome.type] ?? '⚔'}</div>
            <p className="enc-result-msg">{result.outcome.message}</p>

            {isClash && battleId && (
              <>
                <p className="enc-result-sub">Entering battle in {redirectIn}…</p>
                <button className="enc-btn enc-btn-battle" onClick={onGoToBattle}>
                  <span className="enc-btn-icon">⚔</span>
                  <span>Enter battle now</span>
                </button>
              </>
            )}

            {isClash && !battleId && (
              <p className="enc-result-sub">The battle could not be opened. Try again from the dashboard.</p>
            )}
          </div>
        ) : (
          <>
            <p className="enc-subtitle">A traveler crosses your path</p>

            <div className="enc-opponent">
              <div className="enc-opponent-icon">{classIcon}</div>
              <div className="enc-opponent-name">{opponent?.name}</div>
              {opponent?.class && (
                <div className="enc-opponent-class">{opponent.class}</div>
              )}
            </div>

            {showTimer && (
              <div className="enc-timer" aria-label={`${timeLeft} seconds to decide`}>
                <div className={`enc-timer-bar${timerUrgent ? ' urgent' : ''}`}>
                  <div className="enc-timer-fill" style={{ width: `${timerPct}%` }} />
                </div>
                <span className={`enc-timer-text${timerUrgent ? ' urgent' : ''}`}>
                  {waiting ? `Opponent deciding… ${timeLeft}s` : `${timeLeft}s to decide`}
                </span>
              </div>
            )}

            {waiting ? (
              <div className="enc-waiting">
                <div className="enc-dots"><span /><span /><span /></div>
                <p>Your choice is locked in. Waiting for {opponent?.name ?? 'your opponent'}…</p>
              </div>
            ) : (
              <>
                <div className="enc-actions">
                  <button className="enc-btn enc-btn-greet"  onClick={() => onRespond('greet')}>
                    <span className="enc-btn-icon">🤝</span>
                    <span>Greet</span>
                  </button>
                  <button className="enc-btn enc-btn-flee"   onClick={() => onRespond('flee')}>
                    <span className="enc-btn-icon">💨</span>
                    <span>Flee</span>
                  </button>
                  <button className="enc-btn enc-btn-attack" onClick={() => onRespond('attack')}>
                    <span className="enc-btn-icon">⚔</span>
                    <span>Attack</span>
                  </button>
                </div>
                <p className="enc-hint-text">
                  If you both attack, a real battle begins. Fleeing ends the encounter instantly.
                  No choice counts as a greeting.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
