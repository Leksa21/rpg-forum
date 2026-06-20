import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, post } from '../lib/api';
import { toId } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import Breadcrumb from '../components/layout/Breadcrumb';
import TravelPanel from '../components/travel/TravelPanel';
import PlaceMap from '../components/citymap/PlaceMap';

const CLASS_COLORS = {
  Warrior: '#e74c3c', Mage: '#3498db', Rogue: '#f39c12',
  Cleric: '#f1c40f', Ranger: '#27ae60', Paladin: '#9b59b6',
  Warlock: '#8e44ad', Bard: '#e67e22', Druid: '#16a085',
  Necromancer: '#2c3e50',
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AreaForum() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, character, refreshCharacter } = useAuth();
  const [venueView, setVenueView] = useState('map');

  const [location, setLocation] = useState(null);
  const [venues, setVenues]     = useState([]);
  const [posts, setPosts]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError]       = useState('');
  const LIMIT = 15;

  useEffect(() => {
    get(`/api/world/locations/${id}`)
      .then(r => setLocation(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setPostsLoading(true);
    const params = new URLSearchParams({ location: id, page, limit: LIMIT });
    get(`/api/posts?${params}`, token)
      .then(r => {
        setPosts(r.data);
        setTotal(r.meta.total);
        setRestricted(Boolean(r.restricted));
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [id, page, token]);

  useEffect(() => {
    get(`/api/world/locations/${id}/venues`, token)
      .then(r => setVenues(r.data || []))
      .catch(() => {});
  }, [id, token]);

  if (loading) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar /><main className="dash-main"><p style={{ color: 'var(--text-muted)' }}>Loading…</p></main></div>
    </>
  );

  if (error || !location) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar /><main className="dash-main">
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Location not found.'}</p>
        <button onClick={() => navigate('/world/areas')} className="btn-secondary" style={{ width: 'auto', marginTop: '1rem', padding: '0.5rem 1.2rem' }}>← Back to Areas</button>
      </main></div>
    </>
  );

  const gradient = location.theme?.gradient || 'linear-gradient(160deg, #0a0a14 0%, #141428 100%)';
  const accent   = location.theme?.accentColor || '#c9a84c';
  const totalPages = Math.ceil(total / LIMIT);
  const topVenues = venues.filter(v => !v.parent);
  const isStaff = ['moderator', 'admin', 'head_admin'].includes(user?.role);
  const canWrite = isStaff || Boolean(location.allowPlayerThreads);

  // City-map nodes (districts) + which one the character currently stands in.
  const mapNodes = topVenues.map(v => ({
    _id: v._id, name: v.name, icon: v.icon, description: v.description,
    hasChildren: venues.some(c => toId(c.parent) === toId(v._id)),
  }));
  const currentVenueId = toId(character?.currentVenue);
  const topAncestorId = (vid) => {
    if (!vid) return null;
    let cur = venues.find(v => toId(v._id) === vid);
    while (cur && cur.parent) {
      const p = venues.find(v => toId(v._id) === toId(cur.parent));
      if (!p) break;
      cur = p;
    }
    return cur ? toId(cur._id) : null;
  };
  const activeChildId = topAncestorId(currentVenueId);
  const openContainer = (node) => navigate(`/world/areas/${id}/venue/${node._id}`);
  const startVenueWalk = (node) => {
    post('/api/characters/move-venue', { venueId: node._id }, token).then(() => refreshCharacter?.()).catch(() => {});
  };
  const arriveLeaf = (node) => navigate(`/world/areas/${id}/venue/${node._id}`);

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main af-main">

          <Breadcrumb items={[
            { label: '🗺 Map', to: '/map' },
            location.region?.name && { label: location.region.name, to: '/world/areas' },
            { label: location.name },
          ]} />

          <div className="af-banner" style={{ background: gradient }}>
            <div className="af-banner-inner">
              <button className="af-back-btn" onClick={() => navigate('/world/areas')}>← Areas</button>
              <div className="af-banner-icon">{location.icon}</div>
              <h1 className="af-banner-title" style={{ color: accent }}>{location.name}</h1>
              <p className="af-banner-region">{location.region?.name}</p>
              {location.lore && <p className="af-banner-lore">{location.lore}</p>}
            </div>
          </div>

          <div className="af-body">
            <TravelPanel
              locationId={id}
              dangerLevel={location.dangerLevel}
              isStartingLocation={location.isStartingLocation}
            />

            {restricted ? (
              <div className="af-empty af-locked">
                <div className="af-locked-icon">🔒</div>
                <p className="af-locked-title">You are not here.</p>
                <p>
                  Word of what passes in <strong>{location.name}</strong> only reaches those
                  who stand within it. Travel here to read its forum and join what unfolds.
                </p>
              </div>
            ) : (
              <>
                {topVenues.length > 0 && (
                  <section className="af-section">
                    <div className="af-section-head">
                      <h2 className="af-section-label">⌖ Where to go</h2>
                      <div className="view-toggle">
                        <button className={venueView === 'map' ? 'active' : ''} onClick={() => setVenueView('map')}>🗺 Map</button>
                        <button className={venueView === 'list' ? 'active' : ''} onClick={() => setVenueView('list')}>☰ List</button>
                      </div>
                    </div>

                    {venueView === 'map' ? (
                      <PlaceMap
                        nodes={mapNodes}
                        accent={accent}
                        activeChildId={activeChildId}
                        onOpenContainer={openContainer}
                        onStartWalk={startVenueWalk}
                        onArriveLeaf={arriveLeaf}
                      />
                    ) : (
                      <div className="af-venue-grid">
                        {topVenues.map(v => (
                          <button
                            key={v._id}
                            className="af-venue-card"
                            style={{ '--accent': accent }}
                            onClick={() => navigate(`/world/areas/${id}/venue/${v._id}`)}
                          >
                            <span className="af-venue-icon">{v.icon}</span>
                            <span className="af-venue-name">{v.name}</span>
                            {v.description && <span className="af-venue-desc">{v.description}</span>}
                            <span className="af-venue-go">Enter →</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                <section className="af-section">
                  <div className="af-section-head">
                    <h2 className="af-section-label">✦ What’s happening</h2>
                    {topVenues.length === 0 && canWrite && (
                      <button
                        className="af-write-btn"
                        style={{ '--accent': accent }}
                        onClick={() => navigate('/forum/new', { state: { locationId: id, locationName: location.name } })}
                      >
                        ✍ Write Here
                      </button>
                    )}
                  </div>

                  {postsLoading
                    ? <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading…</p>
                    : posts.length === 0
                      ? (
                        <div className="af-empty">
                          {topVenues.length > 0
                            ? <p>Nothing stirring yet. Step into a district to begin a tale.</p>
                            : <>
                                <p>No tales have been told here yet.</p>
                                {canWrite
                                  ? <button
                                      className="btn-primary"
                                      style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '1rem' }}
                                      onClick={() => navigate('/forum/new', { state: { locationId: id, locationName: location.name } })}
                                    >
                                      Be the first to write
                                    </button>
                                  : <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Only the keepers of this place may open new threads here.</p>
                                }
                              </>
                          }
                        </div>
                      )
                      : <div className="af-feed">
                          {posts.map(p => {
                            const classColor = CLASS_COLORS[p.character?.class] || 'var(--gold)';
                            return (
                              <div
                                key={p._id}
                                className="af-feed-row"
                                onClick={() => navigate(`/forum/${p._id}`)}
                                role="link"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && navigate(`/forum/${p._id}`)}
                              >
                                <div className="af-feed-avatar" style={{ background: `${classColor}22`, borderColor: classColor }}>
                                  {p.character?.avatar || '?'}
                                </div>
                                <div className="af-feed-main">
                                  <div className="af-feed-title">{p.isPinned && <span className="af-pin">📌 </span>}{p.title}</div>
                                  <div className="af-feed-meta">
                                    {p.character?._id ? (
                                      <Link to={`/character/${p.character._id}`} className="af-char-link" style={{ color: classColor }} onClick={e => e.stopPropagation()}>
                                        {p.character.name}
                                      </Link>
                                    ) : (
                                      <span style={{ color: classColor }}>{p.character?.name || p.author?.username}</span>
                                    )}
                                    {p.subLocation?.name && <><span className="af-dot">·</span><span className="af-feed-venue">{p.subLocation.name}</span></>}
                                    <span className="af-dot">·</span>
                                    <span>{timeAgo(p.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="af-feed-side">
                                  <span className="af-feed-replies">💬 {p.commentCount ?? 0}</span>
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
                </section>
              </>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
