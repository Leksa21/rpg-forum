import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const TABS = ['Quests', 'Locations', 'Seed World'];

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

          {tab === 0 && <QuestManager token={token} />}
          {tab === 1 && <LocationManager token={token} />}
          {tab === 2 && <SeedPanel token={token} />}

        </main>
      </div>
    </>
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
