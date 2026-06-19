import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get } from '../lib/api';
import { toId } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

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

export default function VenueForum() {
  const { cityId, venueId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [city, setCity]         = useState(null);
  const [venues, setVenues]     = useState([]);
  const [posts, setPosts]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const LIMIT = 15;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      get(`/api/world/locations/${cityId}`).then(r => setCity(r.data)).catch(() => {}),
      get(`/api/world/locations/${cityId}/venues`, token)
        .then(r => { setVenues(r.data || []); if (r.restricted) setRestricted(true); })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [cityId, token]);

  useEffect(() => {
    setPostsLoading(true);
    const params = new URLSearchParams({ subLocation: venueId, page, limit: LIMIT });
    get(`/api/posts?${params}`, token)
      .then(r => {
        setPosts(r.data);
        setTotal(r.meta.total);
        if (r.restricted) setRestricted(true);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [venueId, page, token]);

  if (loading) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar /><main className="dash-main"><p style={{ color: 'var(--text-muted)' }}>Loading…</p></main></div>
    </>
  );

  const venue = venues.find(v => toId(v._id) === venueId);

  if (!venue && !restricted) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar /><main className="dash-main">
        <p style={{ color: 'var(--text-muted)' }}>This place could not be found.</p>
        <button onClick={() => navigate(`/world/areas/${cityId}`)} className="btn-secondary" style={{ width: 'auto', marginTop: '1rem', padding: '0.5rem 1.2rem' }}>← Back</button>
      </main></div>
    </>
  );

  const gradient = city?.theme?.gradient || 'linear-gradient(160deg, #0a0a14 0%, #141428 100%)';
  const accent   = city?.theme?.accentColor || '#c9a84c';
  const totalPages = Math.ceil(total / LIMIT);
  const children = venues.filter(v => toId(v.parent) === venueId);
  const isStaff = ['moderator', 'admin', 'head_admin'].includes(user?.role);
  const canWrite = isStaff || Boolean(venue?.allowPlayerThreads);

  const writeState = {
    cityId,
    locationId: cityId,
    locationName: city?.name,
    subLocationId: venueId,
    subLocationName: venue?.name,
  };

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main af-main">

          <div className="af-banner" style={{ background: gradient }}>
            <div className="af-banner-inner">
              <button className="af-back-btn" onClick={() => navigate(`/world/areas/${cityId}`)}>← {city?.name || 'City'}</button>
              <div className="af-banner-icon">{venue?.icon || '🏠'}</div>
              <h1 className="af-banner-title" style={{ color: accent }}>{venue?.name || 'Restricted'}</h1>
              <p className="af-banner-region">{city?.name}</p>
              {venue?.lore && <p className="af-banner-lore">{venue.lore}</p>}
              {!venue?.lore && venue?.description && <p className="af-banner-lore">{venue.description}</p>}
            </div>
          </div>

          <div className="af-body">

            {restricted ? (
              <div className="af-empty af-locked">
                <div className="af-locked-icon">🔒</div>
                <p className="af-locked-title">You are not here.</p>
                <p>
                  Word of what passes in <strong>{city?.name}</strong> only reaches those
                  who stand within it. Travel here to read its forum and join what unfolds.
                </p>
              </div>
            ) : (
              <>
                {children.length > 0 && (
                  <div className="af-venue-grid">
                    {children.map(c => (
                      <button
                        key={c._id}
                        className="af-venue-card"
                        onClick={() => navigate(`/world/areas/${cityId}/venue/${c._id}`)}
                      >
                        <span className="af-venue-icon">{c.icon}</span>
                        <span className="af-venue-name">{c.name}</span>
                        {c.description && <span className="af-venue-desc">{c.description}</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="af-posts-header">
                  <span className="af-posts-count">{total} {total === 1 ? 'thread' : 'threads'}</span>
                  {canWrite && (
                    <button
                      className="af-write-btn"
                      style={{ '--accent': accent }}
                      onClick={() => navigate('/forum/new', { state: writeState })}
                    >
                      ✍ Write Here
                    </button>
                  )}
                </div>

                {postsLoading
                  ? <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading threads…</p>
                  : posts.length === 0
                    ? (
                      <div className="af-empty">
                        <p>No tales have been told here yet.</p>
                        {canWrite
                          ? <button
                              className="btn-primary"
                              style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '1rem' }}
                              onClick={() => navigate('/forum/new', { state: writeState })}
                            >
                              Be the first to write
                            </button>
                          : <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Only the keepers of this place may open new threads here.</p>
                        }
                      </div>
                    )
                    : <div className="af-post-list">
                        {posts.map(p => {
                          const classColor = CLASS_COLORS[p.character?.class] || 'var(--gold)';
                          return (
                            <div
                              key={p._id}
                              className="af-post-row"
                              onClick={() => navigate(`/forum/${p._id}`)}
                              role="link"
                              tabIndex={0}
                              onKeyDown={e => e.key === 'Enter' && navigate(`/forum/${p._id}`)}
                            >
                              <div className="af-post-avatar" style={{ background: `${classColor}22`, borderColor: classColor }}>
                                {p.character?.avatar || '?'}
                              </div>
                              <div className="af-post-info">
                                <div className="af-post-title">{p.isPinned && <span className="af-pin">📌 </span>}{p.title}</div>
                                <div className="af-post-meta">
                                  {p.character?._id ? (
                                    <Link
                                      to={`/character/${p.character._id}`}
                                      className="af-char-link"
                                      style={{ color: classColor }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      {p.character.name}
                                    </Link>
                                  ) : (
                                    <span style={{ color: classColor }}>{p.character?.name || p.author?.username}</span>
                                  )}
                                  <span className="af-dot">·</span>
                                  <span>{timeAgo(p.createdAt)}</span>
                                  <span className="af-dot">·</span>
                                  <span>{p.commentCount ?? 0} replies</span>
                                  <span className="af-dot">·</span>
                                  <span>{p.views} views</span>
                                </div>
                              </div>
                              <div className="af-post-category">{p.category}</div>
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
              </>
            )}

          </div>

        </main>
      </div>
    </>
  );
}
