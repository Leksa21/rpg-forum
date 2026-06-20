import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { get } from '../../lib/api';

const TEASER_COUNT = 5;

function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function OffTopicTeaser() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    get('/api/posts?ooc=true&page=1', token)
      .then(res => { if (!cancelled) setPosts((res.data ?? []).slice(0, TEASER_COUNT)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <section className="home-card home-offtopic">
      <header className="home-card-head">
        <h2 className="home-card-title">☕ Off-Topic Tavern</h2>
        <Link to="/forum" className="home-card-link">Open board →</Link>
      </header>

      <div className="home-thread-list">
        {loading && <div className="home-empty">Pouring the ale…</div>}

        {!loading && posts.length === 0 && (
          <div className="home-empty">
            The tavern is quiet. <Link to="/forum/new" className="home-inline-link">Start a thread →</Link>
          </div>
        )}

        {!loading && posts.map(post => (
          <button
            key={post._id}
            type="button"
            className="home-thread-row"
            onClick={() => navigate(`/forum/${post._id}`)}
          >
            <span className="home-thread-avatar">{post.character?.avatar || '⚔️'}</span>
            <span className="home-thread-body">
              <span className="home-thread-title">{post.title}</span>
              <span className="home-thread-meta">
                {post.character?.name || 'Unknown'}
                <span className="home-thread-dot">·</span>
                {timeAgo(post.createdAt)}
              </span>
            </span>
            <span className="home-thread-replies" title="Replies">💬 {post.commentCount ?? 0}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
