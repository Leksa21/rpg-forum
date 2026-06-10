function hpColor(hp, maxHp) {
  const pct = maxHp > 0 ? hp / maxHp : 0;
  if (pct > 0.5) return '#42c87a';
  if (pct > 0.25) return '#ff9800';
  return '#e05050';
}

function HpCard({ unit, isMe }) {
  const pct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
  return (
    <div className={`cmb-hp-card${isMe ? ' is-me' : ' is-enemy'}`}>
      <div className="cmb-hp-name">
        <span className="cmb-hp-avatar">{unit.avatar || '⚔'}</span>
        <span>{unit.name}</span>
      </div>
      <div className="cmb-hp-bar-wrap">
        <div
          className="cmb-hp-bar-fill"
          style={{ width: `${pct}%`, background: hpColor(unit.hp, unit.maxHp) }}
        />
      </div>
      <div className="cmb-hp-text">{unit.hp} / {unit.maxHp} HP</div>
    </div>
  );
}

export default function HealthBars({ myUnit, enemyUnit }) {
  return (
    <div className="cmb-hp-section">
      {myUnit    && <HpCard unit={myUnit}    isMe />}
      {enemyUnit && <HpCard unit={enemyUnit} isMe={false} />}
    </div>
  );
}
