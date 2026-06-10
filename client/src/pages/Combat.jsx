import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import { hexDistance, getReachable, getAttackable } from '../lib/hexUtils';
import { getCastableHexes, getZonePreviewHexes } from '../lib/spellTargeting';
import HexGrid       from '../components/combat/HexGrid';
import HealthBars    from '../components/combat/HealthBars';
import APBar         from '../components/combat/APBar';
import ResourceBars  from '../components/combat/ResourceBars';
import SpellPicker   from '../components/combat/SpellPicker';
import CombatLog     from '../components/combat/CombatLog';
import BgScene       from '../components/layout/BgScene';
import Topbar        from '../components/layout/Topbar';
import '../components/combat/combat.css';

const POLL_MS = 4000;

export default function Combat() {
  const { id }          = useParams();
  const { token, user } = useAuth();
  const navigate        = useNavigate();

  const [battle,            setBattle]            = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);
  const [submitting,        setSubmitting]        = useState(false);
  const [queuedActions,     setQueuedActions]     = useState([]);
  const [selectedSpellId,   setSelectedSpellId]   = useState(null);
  const [hoveredHex,        setHoveredHex]        = useState(null);
  const [spellCatalog,      setSpellCatalog]      = useState([]);
  const [replayPos,         setReplayPos]         = useState(null);
  const [attackFlash,       setAttackFlash]       = useState(null);
  const [zoneFlash,         setZoneFlash]         = useState(null);
  const [replayViewedTurn,  setReplayViewedTurn]  = useState(null);

  const pollingRef = useRef(null);

  // Fetch spell catalog once
  useEffect(() => {
    get('/api/spells', token)
      .then(res => setSpellCatalog(res.data || []))
      .catch(() => {});
  }, [token]);

  const fetchBattle = useCallback(() => {
    if (!token || !id) return;
    get(`/api/battles/${id}`, token)
      .then(res => { setBattle(res.data); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    fetchBattle();
    pollingRef.current = setInterval(fetchBattle, POLL_MS);
    return () => clearInterval(pollingRef.current);
  }, [fetchBattle]);

  useEffect(() => {
    if (battle?.status === 'completed' || battle?.status === 'declined') {
      clearInterval(pollingRef.current);
    }
  }, [battle?.status]);

  // ── Derived identities ────────────────────────────────────────────────────
  const myUserId  = user?._id || user?.id;
  const myUnit    = battle?.units.find(u => String(u.user) === String(myUserId));
  const enemyUnit = battle?.units.find(u => String(u.user) !== String(myUserId));
  const myCharId  = myUnit?.character?._id || myUnit?.character;
  const currentId = battle?.currentTurn?._id || battle?.currentTurn;
  const isMyTurn  = battle?.status === 'active' && String(myCharId) === String(currentId);
  const iAmDef    = myUnit?.side === 'defender';

  // ── Simulate queue → preview position + all resources ────────────────────
  const preview = useMemo(() => {
    if (!myUnit) return { pos: null, ap: 0, mana: 0, energy: 0 };
    let pos    = { q: myUnit.position.q, r: myUnit.position.r };
    let ap     = myUnit.ap;
    let mana   = myUnit.mana ?? 0;
    let energy = myUnit.energy ?? 0;
    for (const a of queuedActions) {
      if (a.type === 'move') {
        const d = hexDistance(pos, a.to);
        ap     -= d;
        energy -= d;
        pos     = { q: a.to.q, r: a.to.r };
      } else if (a.type === 'attack') {
        ap     -= 2;
        energy -= 2;
      } else if (a.type === 'cast') {
        const spell = spellCatalog.find(s => s.id === a.spellId);
        if (spell) { ap -= spell.apCost; mana -= spell.manaCost; }
      }
    }
    return { pos, ap: Math.max(0, ap), mana: Math.max(0, mana), energy: Math.max(0, energy) };
  }, [queuedActions, myUnit, spellCatalog]);

  // ── Replay detection ──────────────────────────────────────────────────────
  const lastActorId  = battle?.lastTurnActor?._id || battle?.lastTurnActor;
  const replayActive =
    !isMyTurn &&
    !!lastActorId &&
    String(lastActorId) !== String(myCharId) &&
    (battle?.lastTurnActions?.length ?? 0) > 0 &&
    replayViewedTurn !== battle?.turnNumber;

  useEffect(() => {
    if (!replayActive || !battle) return;

    const actions    = battle.lastTurnActions;
    const turnNumber = battle.turnNumber;
    const timers     = [];

    const startPos = actions.find(a => a.type === 'move')?.from ?? enemyUnit?.position;
    setReplayPos(startPos ? { q: startPos.q, r: startPos.r } : null);

    actions.forEach((action, i) => {
      const timer = setTimeout(() => {
        if (action.type === 'move') {
          setReplayPos({ q: action.to.q, r: action.to.r });
        } else if (action.type === 'attack' || action.type === 'cast') {
          const tgt = action.target || action.to;
          if (tgt) {
            setAttackFlash(`${tgt.q},${tgt.r}`);
            setTimeout(() => setAttackFlash(null), 600);
          }
        } else if (action.type === 'zone_tick' && action.hexes) {
          const keys = new Set(action.hexes.map(h => `${h.q},${h.r}`));
          setZoneFlash(keys);
          setTimeout(() => setZoneFlash(null), 700);
        }
      }, i * 1100);
      timers.push(timer);
    });

    const doneTimer = setTimeout(() => {
      setReplayViewedTurn(turnNumber);
      setReplayPos(null);
    }, actions.length * 1100 + 400);
    timers.push(doneTimer);

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayActive, battle?.turnNumber]);

  // ── Display units (preview + replay positions) ────────────────────────────
  const displayUnits = useMemo(() => {
    if (!battle) return [];
    return battle.units.map(u => {
      const charId = String(u.character?._id || u.character);
      if (charId === String(myCharId) && queuedActions.length > 0 && preview.pos) {
        return { ...u, position: preview.pos };
      }
      if (charId !== String(myCharId) && replayPos) {
        return { ...u, position: replayPos };
      }
      return u;
    });
  }, [battle, myCharId, queuedActions.length, preview.pos, replayPos]);

  // ── Hex highlight sets ────────────────────────────────────────────────────
  const { reachable, attackable, castable, zonePreview, activeZoneHexes } = useMemo(() => {
    const empty = new Set();

    const activeZoneHexes = new Map(); // key → color
    for (const zone of (battle?.activeZones ?? [])) {
      for (const h of zone.hexes) {
        activeZoneHexes.set(`${h.q},${h.r}`, zone.color || '#4ac8f0');
      }
    }

    if (!isMyTurn || !preview.pos) {
      return { reachable: empty, attackable: empty, castable: empty, zonePreview: empty, activeZoneHexes };
    }

    const enemyPositions = enemyUnit ? [enemyUnit.position] : [];
    const occupied       = enemyUnit ? [enemyUnit.position] : [];
    const reachable      = getReachable(preview.pos, preview.ap, occupied);
    const attackable     = getAttackable(preview.pos, enemyPositions);

    const selectedSpell  = spellCatalog.find(s => s.id === selectedSpellId);
    const castable       = selectedSpell
      ? getCastableHexes(selectedSpell, preview.pos, enemyUnit?.position ?? null)
      : empty;

    const zonePreview    = selectedSpell && hoveredHex
      ? getZonePreviewHexes(selectedSpell, hoveredHex)
      : empty;

    return { reachable, attackable, castable, zonePreview, activeZoneHexes };
  }, [isMyTurn, preview.pos, preview.ap, enemyUnit, selectedSpellId, spellCatalog, hoveredHex, battle?.activeZones]);

  // ── Input handlers ────────────────────────────────────────────────────────
  function handleHexClick(q, r) {
    if (!isMyTurn || submitting) return;
    const key = `${q},${r}`;

    if (selectedSpellId) {
      if (!castable.has(key)) return;
      setQueuedActions(prev => [...prev, { type: 'cast', spellId: selectedSpellId, target: { q, r } }]);
      setSelectedSpellId(null);
      setHoveredHex(null);
      return;
    }

    if (attackable.has(key)) {
      setQueuedActions(prev => [...prev, { type: 'attack' }]);
    } else if (reachable.has(key)) {
      setQueuedActions(prev => [...prev, { type: 'move', to: { q, r } }]);
    }
  }

  function handleHexHover(q, r) {
    if (selectedSpellId) setHoveredHex({ q, r });
  }

  function handleSelectSpell(spellId) {
    setSelectedSpellId(spellId);
    setHoveredHex(null);
  }

  function handleUndo() {
    setQueuedActions(prev => prev.slice(0, -1));
    if (queuedActions.length <= 1) setSelectedSpellId(null);
  }

  function handleReset() {
    setQueuedActions([]);
    setSelectedSpellId(null);
    setHoveredHex(null);
  }

  function handleSkipReplay() {
    setReplayViewedTurn(battle?.turnNumber);
    setReplayPos(null);
    setAttackFlash(null);
    setZoneFlash(null);
  }

  async function handleSubmitTurn() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await post(`/api/battles/${id}/submit-turn`, { actions: queuedActions }, token);
      setBattle(res.data);
      setQueuedActions([]);
      setSelectedSpellId(null);
    } catch (err) {
      setError(err.message || 'Failed to submit turn');
    } finally {
      setSubmitting(false);
    }
  }

  async function doAction(path, body = {}) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await post(`/api/battles/${id}/${path}`, body, token);
      setBattle(res.data);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <div className="cmb-topbar-spacer" />
          <div className="cmb-waiting">
            <div className="cmb-waiting-pulse" />
            <span>Loading battle…</span>
          </div>
        </div>
      </>
    );
  }

  if (error && !battle) {
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <div className="cmb-topbar-spacer" />
          <div className="cmb-waiting" style={{ color: 'var(--red)' }}>{error}</div>
        </div>
      </>
    );
  }

  if (!battle) return null;

  // ── Pending ───────────────────────────────────────────────────────────────
  if (battle.status === 'pending') {
    if (iAmDef) {
      return (
        <>
          <BgScene />
          <div className="cmb-page">
            <Topbar />
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <div className="cmb-pending-card">
                <div className="cmb-pending-title">⚔ Challenge!</div>
                <div className="cmb-pending-vs">
                  <strong style={{ color: 'var(--gold)' }}>{enemyUnit?.name}</strong>
                  {' '}has challenged you to battle.
                </div>
                {error && <div style={{ color: 'var(--red)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
                <div className="cmb-pending-actions">
                  <button className="cmb-action-btn primary" disabled={submitting}
                    onClick={() => doAction('respond', { accept: true })}>Accept</button>
                  <button className="cmb-action-btn danger"
                    style={{ border: '1px solid rgba(224,80,80,0.4)', color: 'var(--red)' }}
                    disabled={submitting}
                    onClick={() => doAction('respond', { accept: false }).then(() => navigate('/dashboard'))}>
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <Topbar />
          <div className="cmb-waiting">
            <div className="cmb-waiting-pulse" />
            <span>Waiting for <strong style={{ color: 'var(--gold)' }}>{enemyUnit?.name}</strong> to accept…</span>
            <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Declined ──────────────────────────────────────────────────────────────
  if (battle.status === 'declined') {
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <Topbar />
          <div className="cmb-completed">
            <div className="cmb-completed-title">Challenge Declined</div>
            <div className="cmb-completed-subtitle">{enemyUnit?.name} did not accept.</div>
            <Link to="/dashboard" className="cmb-action-btn primary"
              style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  if (battle.status === 'completed') {
    const winnerId = battle.winner?._id || battle.winner;
    const iWon     = String(winnerId) === String(myCharId);
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <Topbar />
          <div className="cmb-completed">
            <div className="cmb-completed-title" style={{ color: iWon ? 'var(--gold)' : 'var(--red)' }}>
              {iWon ? '⚔ Victory!' : '☠ Defeated'}
            </div>
            <div className="cmb-completed-subtitle">
              {iWon ? `You defeated ${enemyUnit?.name}!` : `${battle.winner?.name || enemyUnit?.name} won.`}
            </div>
            <CombatLog entries={battle.log} />
            <Link to="/dashboard" className="cmb-action-btn primary"
              style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Active battle ─────────────────────────────────────────────────────────
  const hasActions    = queuedActions.length > 0;
  const canSubmit     = isMyTurn && !submitting;
  const inSpellMode   = !!selectedSpellId;
  const selectedSpell = spellCatalog.find(s => s.id === selectedSpellId);

  return (
    <>
      <BgScene />
      <div className="cmb-page">
        <Topbar />

        {isMyTurn && (
          <div className="cmb-turn-banner">
            {inSpellMode
              ? `${selectedSpell?.icon} Targeting ${selectedSpell?.name} — click a valid hex or press Escape`
              : `Your Turn — ${preview.ap} AP remaining${hasActions ? ` · ${queuedActions.length} queued` : ''}`}
          </div>
        )}

        {replayActive && (
          <div className="cmb-replay-banner">
            Watching {enemyUnit?.name || 'opponent'}'s turn…
            <button className="cmb-replay-skip" onClick={handleSkipReplay}>Skip</button>
          </div>
        )}

        <div className="cmb-header">
          <span className="cmb-header-title">⚔ Battle Arena</span>
          <span className={`cmb-header-status${isMyTurn ? ' is-my-turn' : ''}`}>
            {isMyTurn ? 'Your Turn' : replayActive ? `Watching ${enemyUnit?.name}…` : `Waiting for ${enemyUnit?.name || 'opponent'}…`}
          </span>
          <span className="cmb-header-turn-deadline">Turn {battle.turnNumber}</span>
        </div>

        <div className="cmb-layout">
          {/* Left sidebar */}
          <div className="cmb-sidebar">
            <HealthBars myUnit={myUnit} enemyUnit={enemyUnit} />

            {myUnit && (
              <ResourceBars
                mana={isMyTurn ? preview.mana : (myUnit.mana ?? 0)}
                maxMana={myUnit.maxMana ?? 0}
                energy={isMyTurn ? preview.energy : (myUnit.energy ?? 0)}
                maxEnergy={myUnit.maxEnergy ?? 0}
              />
            )}

            {isMyTurn && myUnit && <APBar ap={preview.ap} />}

            {error && (
              <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '0.4rem', background: 'rgba(224,80,80,0.1)', borderRadius: '6px' }}>
                {error}
              </div>
            )}

            {isMyTurn && (
              <div className="cmb-actions">
                <SpellPicker
                  knownSpells={myUnit?.knownSpells}
                  catalog={spellCatalog}
                  previewAP={preview.ap}
                  previewMana={preview.mana}
                  selectedSpellId={selectedSpellId}
                  onSelectSpell={handleSelectSpell}
                />

                {hasActions && (
                  <>
                    <div className="cmb-queue-list">
                      <div className="cmb-queue-count">{queuedActions.length} queued</div>
                      {queuedActions.map((a, i) => (
                        <div key={i} className={`cmb-queue-item ${a.type}`}>
                          {a.type === 'move'   && `Move → (${a.to.q}, ${a.to.r})`}
                          {a.type === 'attack' && '⚔ Attack'}
                          {a.type === 'cast'   && (() => {
                            const s = spellCatalog.find(x => x.id === a.spellId);
                            return `${s?.icon || '✨'} ${s?.name || a.spellId}${a.target ? ` → (${a.target.q},${a.target.r})` : ''}`;
                          })()}
                        </div>
                      ))}
                    </div>
                    <div className="cmb-action-separator" />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="cmb-action-btn move" disabled={submitting} onClick={handleUndo} style={{ flex: 1 }}>
                        ↩ Undo
                      </button>
                      <button className="cmb-action-btn danger" disabled={submitting} onClick={handleReset} style={{ flex: 1, fontSize: '0.75rem' }}>
                        Reset
                      </button>
                    </div>
                  </>
                )}

                <div className="cmb-action-separator" />

                <button className="cmb-action-btn primary" disabled={!canSubmit} onClick={handleSubmitTurn}>
                  {submitting ? 'Submitting…' : hasActions ? `Submit Turn (${queuedActions.length})` : 'Pass Turn'}
                </button>

                <button className="cmb-action-btn danger" disabled={submitting}
                  onClick={() => { if (window.confirm('Surrender?')) doAction('surrender'); }}>
                  Surrender
                </button>
              </div>
            )}

            {!isMyTurn && !replayActive && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                Waiting for opponent's move…
              </div>
            )}

            {replayActive && (
              <div style={{ fontSize: '0.8rem', color: 'var(--violet)', textAlign: 'center', padding: '0.5rem' }}>
                Watching replay…
              </div>
            )}
          </div>

          {/* Hex Grid */}
          <div className="cmb-grid-wrap">
            <HexGrid
              units={displayUnits}
              myCharId={myCharId}
              reachable={reachable}
              attackable={attackable}
              castable={castable}
              activeZoneHexes={activeZoneHexes}
              zonePreview={zonePreview}
              attackFlash={attackFlash}
              zoneFlash={zoneFlash}
              onHexClick={handleHexClick}
              onHexHover={handleHexHover}
            />
          </div>

          {/* Combat Log */}
          <div className="cmb-sidebar cmb-sidebar-right cmb-log-wrap" style={{ padding: 0 }}>
            <CombatLog entries={battle.log} />
          </div>
        </div>
      </div>
    </>
  );
}
