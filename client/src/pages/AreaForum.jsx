import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import TravelPanel from '../components/travel/TravelPanel';

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

  const [location, setLocation] = useState(null);
  const [posts, setPosts]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
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
    get(`/api/posts?${params}`)
      .then(r => { setPosts(r.data); setTotal(r.meta.total); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [id, page]);

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

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main af-main">

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

            <div className="af-posts-header">
              <span className="af-posts-count">{total} {total === 1 ? 'post' : 'posts'}</span>
              <button
                className="af-write-btn"
                style={{ '--accent': accent }}
                onClick={() => navigate('/forum/new', { state: { locationId: id, locationName: location.name } })}
              >
                ✍ Write Here
              </button>
            </div>

            {postsLoading
              ? <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading posts…</p>
              : posts.length === 0
                ? (
                  <div className="af-empty">
                    <p>No tales have been told here yet.</p>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '1rem' }}
                      onClick={() => navigate('/forum/new', { state: { locationId: id, locationName: location.name } })}
                    >
                      Be the first to write
                    </button>
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
          </div>

        </main>
      </div>
    </>
  );
}
