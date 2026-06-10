import { hexToPixel, hexPoints, CANVAS_W, CANVAS_H, GRID_W, GRID_H } from '../../lib/hexUtils';

const FILL = {
  normal:      '#13102a',
  reachable:   '#1a2a44',
  attackable:  '#3a1212',
  castable:    '#1a1a3a',
  zone:        '#0d1a2a',
  flash:       '#cc2222',
  zoneFlash:   '#1a4060',
  self:        '#d4a843',
  enemy:       '#cc3333',
};

const STROKE = {
  normal:      '#2e2550',
  reachable:   '#4a7acc',
  attackable:  '#cc4444',
  castable:    '#8b5cf6',
  zone:        '#4ac8f0',
  flash:       '#ff4444',
  zoneFlash:   '#4ac8f0',
};

export default function HexGrid({
  units,
  myCharId,
  reachable,
  attackable,
  castable,
  activeZoneHexes,
  zonePreview,
  attackFlash,
  zoneFlash,
  onHexClick,
  onHexHover,
}) {
  const unitMap = {};
  for (const u of units) {
    const charId = u.character?._id || u.character;
    unitMap[`${u.position.q},${u.position.r}`] = { ...u, charId: String(charId) };
  }

  const hexes = [];
  for (let r = 0; r < GRID_H; r++) {
    for (let q = 0; q < GRID_W; q++) {
      const key       = `${q},${r}`;
      const { x, y }  = hexToPixel(q, r);
      const unit      = unitMap[key];
      const isReach   = reachable?.has(key);
      const isAtk     = attackable?.has(key);
      const isCast    = castable?.has(key);
      const isZonePrev= zonePreview?.has(key);
      const isActiveZ = activeZoneHexes?.has(key);
      const zoneColor = activeZoneHexes?.get(key);
      const isAtkFlsh = attackFlash === key;
      const isZnFlsh  = zoneFlash?.has(key);

      let fill      = FILL.normal;
      let stroke    = STROKE.normal;
      let clickable = false;

      if (isAtkFlsh) {
        fill   = FILL.flash;
        stroke = STROKE.flash;
      } else if (isZnFlsh) {
        fill   = FILL.zoneFlash;
        stroke = STROKE.zoneFlash;
      } else if (isAtk) {
        fill      = FILL.attackable;
        stroke    = STROKE.attackable;
        clickable = true;
      } else if (isCast) {
        fill      = FILL.castable;
        stroke    = STROKE.castable;
        clickable = true;
      } else if (isReach) {
        fill      = FILL.reachable;
        stroke    = STROKE.reachable;
        clickable = true;
      } else if (isActiveZ) {
        fill   = FILL.zone;
        stroke = STROKE.zone;
      }

      const pts = hexPoints(x, y);

      hexes.push(
        <g
          key={key}
          onClick={clickable ? () => onHexClick(q, r) : undefined}
          onMouseEnter={onHexHover ? () => onHexHover(q, r) : undefined}
        >
          <polygon
            points={pts}
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            className={`cmb-hex${clickable ? ' clickable' : ''}${isAtkFlsh ? ' flash' : ''}`}
          />

          {/* Zone overlay tint */}
          {isActiveZ && !isAtkFlsh && !isZnFlsh && (
            <polygon
              points={pts}
              fill={zoneColor || '#4ac8f0'}
              stroke="none"
              opacity="0.18"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Zone preview tint */}
          {isZonePrev && !isActiveZ && (
            <polygon
              points={pts}
              fill="#8b5cf6"
              stroke="none"
              opacity="0.22"
              style={{ pointerEvents: 'none' }}
            />
          )}

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
