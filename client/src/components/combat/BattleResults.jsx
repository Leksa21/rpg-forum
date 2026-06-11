// Battle outcome panel — XP, level-ups, wounds and the death save drama.
// Rendered on the completed screen of Combat.jsx; rewards comes from battle.rewards.
export default function BattleResults({ rewards, iWon, enemyName }) {
  if (!rewards?.settled) return null;

  if (iWon) {
    return (
      <div className="cmb-results">
        <div className="cmb-results-row xp">
          <span className="cmb-results-icon">✨</span>
          <span>+{rewards.winnerXp} XP</span>
        </div>
        {rewards.winnerLevelsGained > 0 && (
          <div className="cmb-results-levelup">
            ⬆ Level up! You are now level {rewards.winnerNewLevel}
            <span className="cmb-results-levelup-sub">+{rewards.winnerLevelsGained} to your primary stat</span>
          </div>
        )}
      </div>
    );
  }

  const dr = rewards.deathRoll;
  return (
    <div className="cmb-results">
      <div className="cmb-results-row xp">
        <span className="cmb-results-icon">✨</span>
        <span>+{rewards.loserXp} XP</span>
      </div>

      {dr && (
        <div className={`cmb-results-deathroll${dr.survived ? ' survived' : ' died'}`}>
          <div className="cmb-results-deathroll-title">
            {dr.survived ? '🎲 Death Save — Survived!' : '💀 Death Save — Failed'}
          </div>
          <div className="cmb-results-deathroll-math">
            d20: {dr.roll} {dr.modifier >= 0 ? '+' : '−'} {Math.abs(dr.modifier)} END = {dr.total} vs DC {dr.dc}
          </div>
        </div>
      )}

      {rewards.loserDied ? (
        <div className="cmb-results-died">
          Your wounds were too grave. Your character has perished.
        </div>
      ) : (
        <>
          <div className="cmb-results-row wound">
            <span className="cmb-results-icon">🩸</span>
            <span>
              Wounded by {enemyName || 'your opponent'} — {rewards.loserActiveWounds} active{' '}
              {rewards.loserActiveWounds === 1 ? 'wound' : 'wounds'}
            </span>
          </div>
          <div className="cmb-results-note">
            Wounds heal after 24h. You cannot fight again for 1 hour.
            {rewards.loserActiveWounds >= 3 && (
              <strong className="cmb-results-warning"> Losing another battle now risks death!</strong>
            )}
          </div>
        </>
      )}
    </div>
  );
}
