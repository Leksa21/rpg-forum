import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get } from '../lib/api';

const POLL_MS = 20_000;

export default function PendingChallenges() {
  const { token, user } = useAuth();
  const [battles, setBattles] = useState([]);

  const fetchBattles = useCallback(() => {
    if (!token) return;
    get('/api/battles/active', token)
      .then(res => setBattles(res.data ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchBattles();
    const id = setInterval(fetchBattles, POLL_MS);
    return () => clearInterval(id);
  }, [fetchBattles]);

  const myId = user?._id;

  const incoming = battles.filter(b => {
    const myUnit = b.units.find(u => String(u.user) === String(myId));
    return b.status === 'pending' && myUnit?.side === 'defender';
  });

  const active = battles.filter(b => b.status === 'active');

  if (incoming.length === 0 && active.length === 0) return null;

  return (
    <div className="db-panel" style={{ borderColor: 'rgba(212,168,67,0.35)' }}>
      <div className="db-panel-head">
        <span>⚔</span>
        Battle Challenges
        {incoming.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.72rem',
            background: 'rgba(224,80,80,0.2)',
            color: '#e05050',
            border: '1px solid rgba(224,80,80,0.4)',
            borderRadius: '10px',
            padding: '0.1rem 0.5rem',
            fontWeight: 700,
          }}>
            {incoming.length} incoming
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>

        {incoming.map(b => {
          const challenger = b.units.find(u => u.side === 'attacker');
          return (
            <div key={b._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1rem',
              background: 'rgba(224,80,80,0.07)',
              border: '1px solid rgba(224,80,80,0.25)',
              borderRadius: '10px',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{challenger?.avatar || '⚔'}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                    {challenger?.name} challenges you!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {challenger?.character?.class} · Lv.{challenger?.character?.level ?? '?'}
                  </div>
                </div>
              </div>
              <Link
                to={`/combat/${b._id}`}
                style={{
                  fontSize: '0.8rem', fontWeight: 600, padding: '0.35rem 0.9rem',
                  background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                  color: 'var(--gold-light)', borderRadius: '8px', textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                View →
              </Link>
            </div>
          );
        })}

        {active.map(b => {
          const myUnit    = b.units.find(u => String(u.user) === String(myId));
          const enemyUnit = b.units.find(u => String(u.user) !== String(myId));
          const currentId = b.currentTurn?._id || b.currentTurn;
          const myCharId  = myUnit?.character?._id || myUnit?.character;
          const isMyTurn  = String(currentId) === String(myCharId);

          return (
            <div key={b._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1rem',
              background: isMyTurn ? 'rgba(66,200,122,0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMyTurn ? 'rgba(66,200,122,0.3)' : 'rgba(80,55,160,0.2)'}`,
              borderRadius: '10px',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{enemyUnit?.avatar || '⚔'}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                    vs {enemyUnit?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isMyTurn ? 'var(--green)' : 'var(--text-muted)' }}>
                    {isMyTurn ? '⚡ Your turn!' : 'Waiting for opponent…'}
                  </div>
                </div>
              </div>
              <Link
                to={`/combat/${b._id}`}
                style={{
                  fontSize: '0.8rem', fontWeight: 600, padding: '0.35rem 0.9rem',
                  background: isMyTurn ? 'rgba(66,200,122,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isMyTurn ? 'rgba(66,200,122,0.4)' : 'var(--border)'}`,
                  color: isMyTurn ? 'var(--green)' : 'var(--text-soft)',
                  borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                {isMyTurn ? 'Fight →' : 'Watch →'}
              </Link>
            </div>
          );
        })}

      </div>
    </div>
  );
}
