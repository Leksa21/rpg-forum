import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const TABS = ['Available', 'My Quests', 'Completed'];
const TYPE_FILTERS = ['All', 'admin', 'player', 'npc', 'automatic'];

const TYPE_STYLE = {
  admin:     { color: '#c9a84c', label: 'Admin Quest' },
  player:    { color: '#5dade2', label: 'Player Quest' },
  npc:       { color: '#bb8fce', label: 'NPC Quest' },
  automatic: { color: '#2ecc71', label: 'Auto Quest' },
};

const DANGER_COLORS = { safe: '#2ecc71', low: '#a8d8a8', medium: '#f0d060', high: '#e74c3c', deadly: '#900' };

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`quest-toast quest-toast-${type}`} onClick={onClose}>
      {msg}
    </div>
  );
}

export default function QuestBoard() {
  const { token, character } = useAuth();
  const [tab, setTab]         = useState(0);
  const [typeFilter, setType] = useState('All');
  const [quests, setQuests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState(null);
  const [acting, setActing]   = useState('');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchQuests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let res;
      if (tab === 1) {
        res = await get('/api/quests/mine', token);
        setQuests(res.data.filter(q => q.status !== 'completed'));
      } else if (tab === 2) {
        res = await get('/api/quests?status=completed');
        setQuests(res.data);
      } else {
        const params = new URLSearchParams({ status: 'open' });
        if (typeFilter !== 'All') params.set('type', typeFilter);
        res = await get(`/api/quests?${params}`);
        setQuests(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, typeFilter, token]);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  const isParticipant = (quest) =>
    character && quest.participants?.some(p => p.user === character.owner || p.character?._id === character._id);

  const handleApply = async (questId) => {
    setActing(questId);
    try {
      await post(`/api/quests/${questId}/apply`, {}, token);
      showToast('Quest accepted! Good luck, adventurer.');
      fetchQuests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  const handleAbandon = async (questId) => {
    if (!confirm('Abandon this quest?')) return;
    setActing(questId);
    try {
      await post(`/api/quests/${questId}/abandon`, {}, token);
      showToast('Quest abandoned.');
      fetchQuests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  const EMPTY_MSGS = [
    'No quests available right now. Check back soon.',
    "You haven't accepted any quests yet.",
    'No completed quests yet. Your legend awaits.',
  ];

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main">

          {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

          <div className="qb-header">
            <h1 className="forum-title">⚔ Quest Board</h1>
            <p className="forum-sub">Seek glory, gold, and adventure</p>
          </div>

          <div className="qb-tabs">
            {TABS.map((t, i) => (
              <button key={t} className={`qb-tab ${tab === i ? 'active' : ''}`} onClick={() => { setTab(i); setType('All'); }}>
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div className="qb-type-filters">
              {TYPE_FILTERS.map(f => (
                <button key={f} className={`qb-type-btn ${typeFilter === f ? 'active' : ''}`} onClick={() => setType(f)}>
                  {f === 'All' ? 'All Types' : TYPE_STYLE[f]?.label}
                </button>
              ))}
            </div>
          )}

          {error && <div className="alert error visible">{error}</div>}

          <div className="qb-list">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="qb-card">
                    <div className="sk-block" style={{ height: '1.2rem', width: '60%' }} />
                    <div className="sk-block" style={{ height: '0.8rem', width: '90%', marginTop: '0.5rem' }} />
                    <div className="sk-block" style={{ height: '0.8rem', width: '70%', marginTop: '0.3rem' }} />
                  </div>
                ))
              : quests.length === 0
                ? (
                  <div className="db-panel-empty" style={{ padding: '3rem' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚔️</p>
                    <p>{EMPTY_MSGS[tab]}</p>
                  </div>
                )
                : quests.map(q => {
                    const typeStyle = TYPE_STYLE[q.type] || TYPE_STYLE.automatic;
                    const alreadyIn = isParticipant(q);
                    const isFull = q.participants?.filter(p => p.status === 'active').length >= q.requirements?.maxPlayers;
                    const levelOk = !character || (character.level >= (q.requirements?.minLevel || 1));

                    return (
                      <div key={q._id} className={`qb-card ${q.isFeatured ? 'qb-featured' : ''}`}>
                        <div className="qb-card-top">
                          <span className="qb-type-badge" style={{ color: typeStyle.color, borderColor: typeStyle.color }}>
                            {typeStyle.label}
                          </span>
                          {q.isFeatured && <span className="qb-featured-badge">⭐ Featured</span>}
                          {q.location && <span className="qb-loc">📍 {q.location.icon} {q.location.name}</span>}
                        </div>

                        <h3 className="qb-title">{q.title}</h3>
                        <p className="qb-desc">{q.description}</p>

                        <div className="qb-details">
                          <div className="qb-rewards">
                            {q.reward?.xp   > 0 && <span className="qb-reward">✨ {q.reward.xp} XP</span>}
                            {q.reward?.gold > 0 && <span className="qb-reward">🪙 {q.reward.gold} Gold</span>}
                            {q.reward?.items?.map(item => (
                              <span key={item} className="qb-reward">🎁 {item}</span>
                            ))}
                          </div>
                          <div className="qb-reqs">
                            <span>Lv.{q.requirements?.minLevel || 1}+</span>
                            <span>
                              {q.participants?.filter(p => p.status === 'active').length || 0}/{q.requirements?.maxPlayers || 5} adventurers
                            </span>
                          </div>
                        </div>

                        {tab === 0 && token && (
                          <div className="qb-actions">
                            {alreadyIn ? (
                              <button
                                className="btn-secondary qb-btn"
                                onClick={() => handleAbandon(q._id)}
                                disabled={acting === q._id}
                              >
                                {acting === q._id ? '…' : 'Abandon'}
                              </button>
                            ) : (
                              <button
                                className="btn-primary qb-btn"
                                onClick={() => handleApply(q._id)}
                                disabled={acting === q._id || isFull || !levelOk}
                                title={!levelOk ? `Requires level ${q.requirements?.minLevel}` : isFull ? 'Quest is full' : ''}
                              >
                                {acting === q._id ? 'Joining…' : !levelOk ? `Need Lv.${q.requirements?.minLevel}` : isFull ? 'Full' : 'Accept Quest'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
            }
          </div>

        </main>
      </div>
    </>
  );
}
