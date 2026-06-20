import { useEffect, useMemo, useRef, useState } from 'react';

const W = 820;
const H = 460;
const CENTER = { x: W / 2, y: H / 2 };
const WALK_MS = 10000;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Deterministic organic layout: spread nodes on a jittered ring so the same
// place always looks the same, with no authored coordinates.
function layout(nodes) {
  const n = nodes.length;
  const radius = Math.min(W, H) / 2 - 110;
  return nodes.map((node, i) => {
    const h = hashStr(String(node._id));
    const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2 + ((h % 1000) / 1000 - 0.5) * 0.45;
    const rFactor = n === 1 ? 0 : 0.7 + ((h >> 10) % 1000) / 1000 * 0.3;
    return {
      ...node,
      x: CENTER.x + Math.cos(angle) * radius * rFactor,
      y: CENTER.y + Math.sin(angle) * radius * rFactor * 0.82,
    };
  });
}

export default function PlaceMap({ nodes, accent = '#c9a84c', activeChildId, onOpenContainer, onStartWalk, onArriveLeaf }) {
  const placed = useMemo(() => layout(nodes), [nodes]);

  const [walking, setWalking] = useState(null); // a placed node
  const [secs, setSecs] = useState(0);
  const [walkPos, setWalkPos] = useState(null);
  const arriveRef = useRef(onArriveLeaf);
  const startRef = useRef(onStartWalk);
  arriveRef.current = onArriveLeaf;
  startRef.current = onStartWalk;

  useEffect(() => {
    if (!walking) { setWalkPos(null); return undefined; }
    startRef.current?.(walking);
    setSecs(10);
    setWalkPos({ x: CENTER.x, y: CENTER.y });
    const raf = requestAnimationFrame(() => setWalkPos({ x: walking.x, y: walking.y }));
    const started = Date.now();
    const tick = setInterval(() => {
      setSecs(Math.max(0, 10 - Math.round((Date.now() - started) / 1000)));
    }, 250);
    const done = setTimeout(() => arriveRef.current?.(walking), WALK_MS);
    return () => { cancelAnimationFrame(raf); clearInterval(tick); clearTimeout(done); };
  }, [walking]);

  const handleClick = (node) => {
    if (walking) return;
    if (node.hasChildren) onOpenContainer(node);
    else setWalking(node);
  };

  return (
    <div className="pm-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="pm-svg" role="img" aria-label="Map of this place">
        <defs>
          <radialGradient id="pm-bg" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#1a2230" />
            <stop offset="100%" stopColor="#0a0e16" />
          </radialGradient>
          <filter id="pm-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="18" fill="url(#pm-bg)" />

        {/* faint grid */}
        <g opacity="0.06" stroke="#cbb98a" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={(i + 1) * (W / 10)} y1="0" x2={(i + 1) * (W / 10)} y2={H} />)}
          {Array.from({ length: 5 }).map((_, i) => <line key={`h${i}`} x1="0" y1={(i + 1) * (H / 6)} x2={W} y2={(i + 1) * (H / 6)} />)}
        </g>

        {/* district region blobs */}
        {placed.map(node => (
          <circle key={`blob-${node._id}`} cx={node.x} cy={node.y} r="74" fill={accent} opacity="0.05" filter="url(#pm-soft)" />
        ))}

        {/* roads from the central plaza to each marker */}
        <g stroke={accent} strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9">
          {placed.map(node => <line key={`road-${node._id}`} x1={CENTER.x} y1={CENTER.y} x2={node.x} y2={node.y} />)}
        </g>
        <circle cx={CENTER.x} cy={CENTER.y} r="6" fill={accent} opacity="0.5" />

        {/* markers */}
        {placed.map(node => {
          const isHere = activeChildId && String(activeChildId) === String(node._id);
          return (
            <g
              key={node._id}
              className="pm-node"
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => handleClick(node)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleClick(node)}
            >
              <title>{node.description || node.name}</title>
              {isHere && <circle className="pm-here-ring" r="34" fill="none" stroke={accent} strokeWidth="2.5" />}
              <circle className="pm-disc" r="26" fill="#10151f" stroke={accent} strokeWidth="2" />
              <text className="pm-icon" y="8" textAnchor="middle">{node.icon || '📍'}</text>
              <g transform="translate(0, 46)">
                <rect className="pm-plate" x="-66" y="-15" width="132" height="26" rx="8" />
                <text className="pm-label" y="3" textAnchor="middle" fill={accent}>{node.name}</text>
              </g>
              {node.hasChildren && <text className="pm-enter" y="-34" textAnchor="middle" fill={accent}>↧</text>}
            </g>
          );
        })}

        {/* walking marker */}
        {walkPos && (
          <g className="pm-walker" style={{ transform: `translate(${walkPos.x}px, ${walkPos.y}px)`, transition: walkPos.x === CENTER.x && walkPos.y === CENTER.y ? 'none' : `transform ${WALK_MS}ms linear` }}>
            <circle r="9" fill="#fff" opacity="0.9" />
            <circle r="14" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
          </g>
        )}
      </svg>

      {walking && (
        <div className="pm-walk-overlay">
          <div className="pm-walk-card">
            <div className="pm-walk-icon">{walking.icon || '🚶'}</div>
            <div className="pm-walk-text">Walking to <strong>{walking.name}</strong></div>
            <div className="pm-walk-secs">{secs}s</div>
            <button className="pm-walk-cancel" onClick={() => setWalking(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
