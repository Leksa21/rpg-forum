import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import { hexDistance, getReachable, getAttackable } from '../lib/hexUtils';
import HexGrid    from '../components/combat/HexGrid';
import HealthBars from '../components/combat/HealthBars';
import APBar      from '../components/combat/APBar';
import CombatLog  from '../components/combat/CombatLog';
import BgScene    from '../components/layout/BgScene';
import Topbar     from '../components/layout/Topbar';
import '../components/combat/combat.css';

const POLL_MS = 5000;

export default function Combat() {
  const { id }           = useParams();
  const { token, user }  = useAuth();
  const navigate         = useNavigate();

  const [battle,        setBattle]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [actionMode,    setActionMode]    = useState('move');
  const [actionLoading, setActionLoading] = useState(false);

  const pollingRef = useRef(null);

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

  // Stop polling when battle is over
  useEffect(() => {
    if (battle?.status === 'completed' || battle?.status === 'declined') {
      clearInterval(pollingRef.current);
    }
  }, [battle?.status]);

  async function doAction(path, body = {}) {
    setActionLoading(true);
    try {
      const res = await post(`/api/battles/${id}/${path}`, body, token);
      setBattle(res.data);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <div className="cmb-topbar-spacer" />
          <div className="cmb-waiting"><div className="cmb-waiting-pulse" /><span>Loading battle…</span></div>
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

  const myUserId   = user?._id || user?.id;
  const myUnit     = battle.units.find(u => String(u.user) === String(myUserId));
  const enemyUnit  = battle.units.find(u => String(u.user) !== String(myUserId));
  const myCharId   = myUnit?.character?._id || myUnit?.character;
  const currentId  = battle.currentTurn?._id || battle.currentTurn;
  const isMyTurn   = battle.status === 'active' && String(myCharId) === String(currentId);
  const iAmDef     = myUnit?.side === 'defender';

  // ── Pending: show accept/decline ──────────────────────────────────────────
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
                  <button
                    className="cmb-action-btn primary"
                    disabled={actionLoading}
                    onClick={() => doAction('respond', { accept: true })}
                  >
                    Accept
                  </button>
                  <button
                    className="cmb-action-btn danger"
                    style={{ border: '1px solid rgba(224,80,80,0.4)', color: 'var(--red)' }}
                    disabled={actionLoading}
                    onClick={() => doAction('respond', { accept: false }).then(() => navigate('/dashboard'))}
                  >
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
            <span>Waiting for <strong style={{ color: 'var(--gold)' }}>{enemyUnit?.name}</strong> to accept your challenge…</span>
            <Link to="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>← Back to dashboard</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Declined ─────────────────────────────────────────────────────────────
  if (battle.status === 'declined') {
    return (
      <>
        <BgScene />
        <div className="cmb-page">
          <Topbar />
          <div className="cmb-completed">
            <div className="cmb-completed-title">Challenge Declined</div>
            <div className="cmb-completed-subtitle">{enemyUnit?.name} did not accept the challenge.</div>
            <Link to="/dashboard" className="cmb-action-btn primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  if (battle.status === 'completed') {
    const winnerId  = battle.winner?._id || battle.winner;
    const iWon      = String(winnerId) === String(myCharId);
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
              {iWon
                ? `You defeated ${enemyUnit?.name}!`
                : `${battle.winner?.name || enemyUnit?.name} won the battle.`}
            </div>
            <CombatLog entries={battle.log} />
            <Link to="/dashboard" className="cmb-action-btn primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Active battle ─────────────────────────────────────────────────────────
  const occupied = battle.units.map(u => u.position);
  const reachable = isMyTurn && myUnit
    ? getReachable(myUnit.position, myUnit.ap, occupied)
    : new Set();

  const enemyPositions = enemyUnit ? [enemyUnit.position] : [];
  const attackable = isMyTurn && myUnit
    ? getAttackable(myUnit.position, enemyPositions)
    : new Set();

  const canAttack  = isMyTurn && myUnit && myUnit.ap >= 2 && attackable.size > 0;
  const canMove    = isMyTurn && myUnit && reachable.size > 0;

  async function handleHexClick(q, r) {
    if (!isMyTurn || actionLoading) return;

    if (actionMode === 'move') {
      const key = `${q},${r}`;
      if (!reachable.has(key)) return;
      await doAction('move', { to: { q, r } });
    } else if (actionMode === 'attack') {
      const key = `${q},${r}`;
      if (!attackable.has(key)) return;
      await doAction('attack', {});
      setActionMode('move');
    }
  }

  return (
    <>
      <BgScene />
      <div className="cmb-page">
        <Topbar />

        {isMyTurn && (
          <div className="cmb-turn-banner">Your Turn — {myUnit?.ap} AP remaining</div>
        )}

        <div className="cmb-header">
          <span className="cmb-header-title">⚔ Battle Arena</span>
          <span className={`cmb-header-status${isMyTurn ? ' is-my-turn' : ''}`}>
            {isMyTurn ? 'Your Turn' : `Waiting for ${enemyUnit?.name || 'opponent'}…`}
          </span>
          {battle.turnDeadline && (
            <span className="cmb-header-turn-deadline">
              Turn {battle.turnNumber}
            </span>
          )}
        </div>

        <div className="cmb-layout">
          {/* Left sidebar */}
          <div className="cmb-sidebar">
            <HealthBars myUnit={myUnit} enemyUnit={enemyUnit} />

            {isMyTurn && myUnit && <APBar ap={myUnit.ap} />}

            {error && (
              <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '0.4rem', background: 'rgba(224,80,80,0.1)', borderRadius: '6px' }}>
                {error}
              </div>
            )}

            {isMyTurn && (
              <div className="cmb-actions">
                <button
                  className={`cmb-action-btn move${actionMode === 'move' ? ' active-mode' : ''}`}
                  disabled={!canMove || actionLoading}
                  onClick={() => setActionMode('move')}
                >
                  🚶 Move
                </button>
                <button
                  className={`cmb-action-btn attack${actionMode === 'attack' ? ' active-mode' : ''}`}
                  disabled={!canAttack || actionLoading}
                  onClick={() => setActionMode('attack')}
                >
                  ⚔ Attack (2 AP)
                </button>
                <div className="cmb-action-separator" />
                <button
                  className="cmb-action-btn primary"
                  disabled={actionLoading}
                  onClick={() => { doAction('end-turn'); setActionMode('move'); }}
                >
                  End Turn →
                </button>
                <button
                  className="cmb-action-btn danger"
                  disabled={actionLoading}
                  onClick={() => {
                    if (window.confirm('Surrender the battle?')) doAction('surrender');
                  }}
                >
                  Surrender
                </button>
              </div>
            )}

            {!isMyTurn && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                Waiting for opponent's move…
              </div>
            )}
          </div>

          {/* Hex Grid */}
          <div className="cmb-grid-wrap">
            <HexGrid
              units={battle.units}
              myCharId={myCharId}
              actionMode={actionMode}
              reachable={reachable}
              attackable={attackable}
              onHexClick={handleHexClick}
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
