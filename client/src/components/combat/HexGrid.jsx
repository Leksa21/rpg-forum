import { hexToPixel, hexPoints, CANVAS_W, CANVAS_H, GRID_W, GRID_H } from '../../lib/hexUtils';

const FILL = {
  normal:      '#13102a',
  reachable:   '#1a2a44',
  attackable:  '#3a1212',
  flash:       '#cc2222',
  self:        '#d4a843',
  enemy:       '#cc3333',
};

const STROKE = {
  normal:      '#2e2550',
  reachable:   '#4a7acc',
  attackable:  '#cc4444',
  flash:       '#ff4444',
};

export default function HexGrid({
  units,
  myCharId,
  reachable,
  attackable,
  attackFlash,
  onHexClick,
}) {
  const unitMap = {};
  for (const u of units) {
    const charId = u.character?._id || u.character;
    unitMap[`${u.position.q},${u.position.r}`] = { ...u, charId: String(charId) };
  }

  const hexes = [];
  for (let r = 0; r < GRID_H; r++) {
    for (let q = 0; q < GRID_W; q++) {
      const key      = `${q},${r}`;
      const { x, y } = hexToPixel(q, r);
      const unit      = unitMap[key];
      const isReach   = reachable?.has(key);
      const isAtk     = attackable?.has(key);
      const isFlash   = attackFlash === key;

      let fill      = FILL.normal;
      let stroke    = STROKE.normal;
      let clickable = false;

      if (isFlash) {
        fill   = FILL.flash;
        stroke = STROKE.flash;
      } else if (isAtk) {
        fill      = FILL.attackable;
        stroke    = STROKE.attackable;
        clickable = true;
      } else if (isReach) {
        fill      = FILL.reachable;
        stroke    = STROKE.reachable;
        clickable = true;
      }

      hexes.push(
        <g key={key} onClick={clickable ? () => onHexClick(q, r) : undefined}>
          <polygon
            points={hexPoints(x, y)}
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            className={`cmb-hex${clickable ? ' clickable' : ''}${isFlash ? ' flash' : ''}`}
          />
          {unit && (
            <>
              <circle
                cx={x}
                cy={y}
                r={9}
                fill={String(unit.charId) === String(myCharId) ? FILL.self : FILL.enemy}
                stroke={String(unit.charId) === String(myCharId) ? '#f0c058' : '#ff6666'}
                strokeWidth="1.5"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="10"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {unit.avatar || '⚔'}
              </text>
            </>
          )}
        </g>
      );
    }
  }

  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      style={{ display: 'block' }}
    >
      {hexes}
    </svg>
  );
}
