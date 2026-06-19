import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post, put, del } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const TABS = ['Players', 'Quests', 'Locations', 'Venues', 'Seed World'];

export default function AdminPanel() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'head_admin';

  useEffect(() => {
    if (!isAdmin) navigate('/dashboard');
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main">

          <div className="admin-header">
            <h1 className="forum-title">⚙ Admin Panel</h1>
            <p className="forum-sub">Manage the realm</p>
          </div>

          <div className="qb-tabs" style={{ marginBottom: '1.5rem' }}>
            {TABS.map((t, i) => (
              <button key={t} className={`qb-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>

          {tab === 0 && <PlayersManager token={token} user={user} />}
          {tab === 1 && <QuestManager token={token} />}
          {tab === 2 && <LocationManager token={token} />}
          {tab === 3 && <VenueManager token={token} />}
          {tab === 4 && <SeedPanel token={token} />}

        </main>
      </div>
    </>
  );
}

const ROLE_RANK   = { member: 0, moderator: 1, admin: 2, head_admin: 3 };
const ROLE_LABELS = { member: '👤 Member', moderator: '🛡 Mod', admin: '⚙ Admin', head_admin: '👑 Head Admin' };

function PlayersManager({ token, user }) {
  const [players, setPlayers]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT, search });
    get(`/api/admin/users?${params}`, token)
      .then(r => { setPlayers(r.data); setTotal(r.meta.total); })
      .catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [page, search, token]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleChange = async (playerId, role) => {
    try {
      const res = await put(`/api/admin/users/${playerId}/role`, { role }, token);
      setPlayers(prev => prev.map(p => p._id === playerId ? { ...p, role: res.data.role } : p));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleBanToggle = async (playerId) => {
    try {
      const res = await put(`/api/admin/users/${playerId}/ban`, {}, token);
      setPlayers(prev => prev.map(p => p._id === playerId ? { ...p, isActive: res.data.isActive } : p));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const callerRank = ROLE_RANK[user?.role] ?? 0;
  const assignableRoles = Object.keys(ROLE_RANK).filter(r => {
    if (user?.role === 'head_admin') return true;
    return ROLE_RANK[r] < callerRank;
  });

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="pm-toolbar">
        <form className="pm-search" onSubmit={handleSearch}>
          <input
            className="pm-search-input"
            placeholder="Search by username or email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.4rem 1rem' }}>Search</button>
        </form>
        <span className="pm-count">{total} players</span>
      </div>

      {msg && <div className="alert error visible" style={{ marginBottom: '1rem' }}>{msg}</div>}

      {loading
        ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        : <div className="pm-table">
            <div className="pm-thead">
              <span>Player</span>
              <span>Character</span>
              <span>Role</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {players.map(p => {
              const isSelf = p._id === user?._id;
              const targetRank = ROLE_RANK[p.role] ?? 0;
              const canEdit = !isSelf && (user?.role === 'head_admin' || targetRank < callerRank);

              return (
                <div key={p._id} className={`pm-row ${!p.isActive ? 'pm-row-banned' : ''}`}>
                  <div className="pm-cell-player">
                    <span className="pm-username">{p.username}</span>
                    <span className="pm-email">{p.email}</span>
                  </div>

                  <div className="pm-cell-char">
                    {p.activeCharacter
                      ? <><span>{p.activeCharacter.avatar}</span> <span>{p.activeCharacter.name}</span> <span className="pm-char-meta">Lv{p.activeCharacter.level} {p.activeCharacter.class}</span></>
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No character</span>
                    }
                    {p.deadCharacterCount > 0 && <span className="pm-dead-count">💀 {p.deadCharacterCount}</span>}
                  </div>

                  <div className="pm-cell-role">
                    {canEdit && assignableRoles.length > 0
                      ? <select
                          className="pm-role-select"
                          value={p.role}
                          onChange={e => handleRoleChange(p._id, e.target.value)}
                        >
                          {['member', 'moderator', 'admin', 'head_admin'].map(r => (
                            <option key={r} value={r} disabled={!assignableRoles.includes(r) && r !== p.role}>
                              {r.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      : <span className="pm-role-badge" style={{ color: p.role === 'head_admin' ? 'var(--gold)' : 'var(--text-muted)' }}>
                          {ROLE_LABELS[p.role]}
                        </span>
                    }
                  </div>

                  <div className="pm-cell-status">
                    <span className={`pm-status-dot ${p.isActive ? 'pm-status-active' : 'pm-status-banned'}`} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.isActive ? 'Active' : 'Banned'}</span>
                  </div>

                  <div className="pm-cell-actions">
                    {canEdit && (
                      <button
                        className={`pm-ban-btn ${p.isActive ? 'pm-ban-btn-ban' : 'pm-ban-btn-unban'}`}
                        onClick={() => handleBanToggle(p._id)}
                      >
                        {p.isActive ? 'Ban' : 'Unban'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {totalPages > 1 && (
        <div className="pm-pagination">
          <button className="pm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Page {page} / {totalPages}</span>
          <button className="pm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
}

function QuestManager({ token }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'admin', rewardXp: 100, rewardGold: 50, minLevel: 1, maxPlayers: 5 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get('/api/quests?status=open').then(r => setQuests(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const res = await post('/api/quests', {
        title: form.title, description: form.description, type: form.type,
        reward: { xp: Number(form.rewardXp), gold: Number(form.rewardGold) },
        requirements: { minLevel: Number(form.minLevel), maxPlayers: Number(form.maxPlayers) },
      }, token);
      setQuests(prev => [res.data, ...prev]);
      setMsg('Quest created!');
      setShowForm(false);
      setForm({ title: '', description: '', type: 'admin', rewardXp: 100, rewardGold: 50, minLevel: 1, maxPlayers: 5 });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="db-section-title" style={{ margin: 0 }}>Open Quests</span>
        <button className="btn-primary" style={{ width: 'auto', padding: '0.4rem 1rem' }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Quest'}
        </button>
      </div>

      {msg && <div className="alert error visible" style={{ marginBottom: '1rem' }}>{msg}</div>}

      {showForm && (
        <form className="admin-form" onSubmit={handleCreate}>
          <div className="admin-form-grid">
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-select">
                {['admin', 'player', 'npc', 'automatic'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} required />
            </div>
            <div className="form-group">
              <label>Reward XP</label>
              <input type="number" min={0} value={form.rewardXp} onChange={e => setForm(f => ({ ...f, rewardXp: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Reward Gold</label>
              <input type="number" min={0} value={form.rewardGold} onChange={e => setForm(f => ({ ...f, rewardGold: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Min Level</label>
              <input type="number" min={1} max={100} value={form.minLevel} onChange={e => setForm(f => ({ ...f, minLevel: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Max Players</label>
              <input type="number" min={1} max={20} value={form.maxPlayers} onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Quest'}</button>
        </form>
      )}

      {loading
        ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        : quests.length === 0
          ? <p style={{ color: 'var(--text-muted)' }}>No open quests.</p>
          : quests.map(q => (
            <div key={q._id} className="admin-quest-row">
              <span className="admin-quest-type">[{q.type}]</span>
              <span>{q.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {q.participants?.length || 0}/{q.requirements?.maxPlayers} · {q.reward?.xp}xp · {q.reward?.gold}g
              </span>
            </div>
          ))
      }
    </div>
  );
}

function LocationManager({ token }) {
  const [locations, setLocations] = useState([]);
  const [regions, setRegions]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ name: '', type: 'town', region: '', description: '', dangerLevel: 'safe', icon: '🏘️', x: 50, y: 50 });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      get('/api/world/locations'),
      get('/api/world/regions'),
    ]).then(([locs, regs]) => {
      setLocations(locs.data);
      setRegions(regs.data);
      if (regs.data.length > 0) setForm(f => ({ ...f, region: regs.data[0]._id }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await post('/api/world/locations', {
        name: form.name, type: form.type, region: form.region,
        description: form.description, dangerLevel: form.dangerLevel,
        icon: form.icon, mapCoords: { x: Number(form.x), y: Number(form.y) },
      }, token);
      setLocations(prev => [...prev, res.data]);
      setMsg('Location created!');
      setShowForm(false);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="db-section-title" style={{ margin: 0 }}>Locations</span>
        <button className="btn-primary" style={{ width: 'auto', padding: '0.4rem 1rem' }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Location'}
        </button>
      </div>

      {msg && <div className="alert error visible" style={{ marginBottom: '1rem' }}>{msg}</div>}

      {showForm && (
        <form className="admin-form" onSubmit={handleCreate}>
          <div className="admin-form-grid">
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-select">
                {['village','town','city','fortress','dungeon','ruins','outpost'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Region</label>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className="form-select">
                {regions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Danger</label>
              <select value={form.dangerLevel} onChange={e => setForm(f => ({ ...f, dangerLevel: e.target.value }))} className="form-select">
                {['safe','low','medium','high','deadly'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Icon (emoji)</label>
              <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Location</button>
        </form>
      )}

      {loading
        ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        : <div className="admin-location-list">
            {locations.map(l => (
              <div key={l._id} className="admin-quest-row">
                <span>{l.icon}</span>
                <span>{l.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{l.type} · {l.region?.name} · {l.dangerLevel}</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

const VENUE_TYPES = [
  'district', 'quarter', 'square', 'park', 'bridge', 'gate', 'wilds', 'venue',
  'tavern', 'blacksmith', 'temple', 'guard', 'prison', 'market',
  'library', 'arena', 'docks', 'palace', 'guild', 'dungeon', 'residence',
];

const EMPTY_VENUE = { name: '', type: 'district', parent: '', icon: '🏠', description: '', lore: '', image: '', order: 0 };

function VenueManager({ token }) {
  const [locations, setLocations] = useState([]);
  const [cityId, setCityId]       = useState('');
  const [venues, setVenues]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState(EMPTY_VENUE);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    get('/api/world/locations')
      .then(r => {
        setLocations(r.data);
        if (r.data.length > 0) setCityId(r.data[0]._id.toString());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    get(`/api/world/locations/${cityId}/venues`, token)
      .then(r => setVenues(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cityId, token]);

  const refresh = () => {
    get(`/api/world/locations/${cityId}/venues`, token)
      .then(r => setVenues(r.data || []))
      .catch(() => {});
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await post('/api/world/sublocations', {
        city: cityId,
        name: form.name.trim(),
        type: form.type,
        parent: form.parent || null,
        icon: form.icon || '🏠',
        description: form.description,
        lore: form.lore,
        image: form.image || null,
        order: Number(form.order) || 0,
      }, token);
      setMsg('Venue created!');
      setForm(f => ({ ...EMPTY_VENUE, type: f.type, parent: f.parent }));
      refresh();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this venue?')) return;
    setMsg('');
    try {
      await del(`/api/world/sublocations/${id}`, token);
      refresh();
    } catch (err) {
      setMsg(err.message);
    }
  };

  // Group by parent so the list renders as an indented tree.
  const byParent = {};
  venues.forEach(v => {
    const key = v.parent ? v.parent.toString() : 'root';
    (byParent[key] = byParent[key] || []).push(v);
  });

  const renderTree = (parentKey, depth) =>
    (byParent[parentKey] || []).map(v => (
      <div key={v._id}>
        <div className="admin-quest-row" style={{ paddingLeft: `${0.5 + depth * 1.5}rem` }}>
          <span>{v.icon}</span>
          <span>{v.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v.type}</span>
          <button
            className="pm-ban-btn pm-ban-btn-ban"
            style={{ marginLeft: 'auto' }}
            onClick={() => handleDelete(v._id)}
          >
            Delete
          </button>
        </div>
        {renderTree(v._id.toString(), depth + 1)}
      </div>
    ));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <span className="db-section-title" style={{ margin: 0 }}>Venues</span>
        <select className="form-select" style={{ maxWidth: 260 }} value={cityId} onChange={e => setCityId(e.target.value)}>
          {locations.map(l => <option key={l._id} value={l._id}>{l.icon} {l.name}</option>)}
        </select>
      </div>

      {msg && <div className="alert error visible" style={{ marginBottom: '1rem' }}>{msg}</div>}

      <form className="admin-form" onSubmit={handleCreate}>
        <div className="admin-form-grid">
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Southern District" required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-select">
              {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nested under</label>
            <select value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))} className="form-select">
              <option value="">— Top level (city) —</option>
              {venues.map(v => <option key={v._id} value={v._id}>{v.icon} {v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Icon (emoji)</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4} />
          </div>
          <div className="form-group">
            <label>Order</label>
            <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Image URL <span className="form-label-opt">(optional)</span></label>
            <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://…" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Short summary shown on the venue card" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Lore <span className="form-label-opt">(optional, shown in the venue banner)</span></label>
            <textarea value={form.lore} onChange={e => setForm(f => ({ ...f, lore: e.target.value }))} rows={3} />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={saving || !cityId}>
          {saving ? 'Creating…' : 'Create Venue'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem' }}>
        {loading
          ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          : venues.length === 0
            ? <p style={{ color: 'var(--text-muted)' }}>No venues here yet. Create the first district above.</p>
            : <div className="admin-location-list">{renderTree('root', 0)}</div>
        }
      </div>
    </div>
  );
}

function SeedPanel({ token }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const runSeed = async () => {
    if (!confirm('This will reset all world data (regions, locations, sub-locations). Continue?')) return;
    setLoading(true); setStatus('');
    try {
      const res = await post('/api/world/seed', {}, token);
      setStatus(res.data || 'World seeded successfully!');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="db-panel" style={{ maxWidth: 480 }}>
        <div className="db-panel-head"><span>🌍</span> World Seed</div>
        <div className="db-panel-content" style={{ padding: '1rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Resets all Regions, Locations, and SubLocations to the default world state. Use if starting fresh or after schema changes.
          </p>
          {status && <div className="alert error visible" style={{ marginBottom: '1rem' }}>{status}</div>}
          <button className="btn-primary" onClick={runSeed} disabled={loading}>
            {loading ? 'Seeding…' : 'Run World Seed'}
          </button>
        </div>
      </div>
    </div>
  );
}
