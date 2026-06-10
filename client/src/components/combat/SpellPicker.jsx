export default function SpellPicker({
  knownSpells,
  catalog,
  previewAP,
  previewMana,
  selectedSpellId,
  onSelectSpell,
}) {
  if (!knownSpells?.length || !catalog?.length) return null;

  const spells = knownSpells
    .map(id => catalog.find(s => s.id === id))
    .filter(Boolean);

  if (!spells.length) return null;

  return (
    <div className="cmb-spell-picker">
      <div className="cmb-spell-picker-title">Spells</div>
      {spells.map(spell => {
        const canAfford = previewAP >= spell.apCost && previewMana >= spell.manaCost;
        const isSelected = selectedSpellId === spell.id;
        return (
          <button
            key={spell.id}
            className={`cmb-spell-btn${isSelected ? ' selected' : ''}${!canAfford ? ' unaffordable' : ''}`}
            disabled={!canAfford}
            onClick={() => onSelectSpell(isSelected ? null : spell.id)}
            title={spell.description}
          >
            <span className="cmb-spell-icon">{spell.icon}</span>
            <span className="cmb-spell-name">{spell.name}</span>
            <span className="cmb-spell-costs">
              {spell.apCost}AP
              {spell.manaCost > 0 && ` · ${spell.manaCost}M`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
