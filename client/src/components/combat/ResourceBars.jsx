function Bar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="cmb-res-bar-row">
      <div className="cmb-res-bar-label">{label} <span>{value}/{max}</span></div>
      <div className="cmb-res-bar-track">
        <div className="cmb-res-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ResourceBars({ mana, maxMana, energy, maxEnergy }) {
  if (!maxMana && !maxEnergy) return null;
  return (
    <div className="cmb-res-bars">
      {maxMana > 0 && (
        <Bar value={mana} max={maxMana} color="#8b5cf6" label="Mana" />
      )}
      {maxEnergy > 0 && (
        <Bar value={energy} max={maxEnergy} color="#f59e0b" label="Energy" />
      )}
    </div>
  );
}
