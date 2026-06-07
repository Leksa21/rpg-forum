import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const CATEGORIES = [
  { value: '',              label: 'All',           icon: '📜' },
  { value: 'General',      label: 'General',        icon: '💬' },
  { value: 'Quests',       label: 'Quests',         icon: '⚔️' },
  { value: 'Lore',         label: 'Lore',           icon: '📖' },
  { value: 'Characters',   label: 'Characters',     icon: '🧙' },
  { value: 'Trading',      label: 'Trading',        icon: '🪙' },
  { value: 'Announcements',label: 'Announcements',  icon: '📢' },
];

const CATEGORY_COLORS = {
  General:       { bg: 'rgba(110,101,128,0.18)', color: '#a89d88',  border: 'rgba(110,101,128,0.35)' },
  Quests:        { bg: 'rgba(192,57,43,0.15)',   color: '#e74c3c',  border: 'rgba(192,57,43,0.35)'  },
  Lore:          { bg: 'rgba(52,152,219,0.15)',  color: '#5dade2',  border: 'rgba(52,152,219,0.3)'  },
  Characters:    { bg: 'rgba(39,174,96,0.13)',   color: '#2ecc71',  border: 'rgba(39,174,96,0.3)'   },
  Trading:       { bg: 'rgba(201,168,76,0.13)',  color: '#c9a84c',  border: 'rgba(201,168,76,0.3)'  },
  Announcements: { bg: 'rgba(155,89,182,0.15)',  color: '#bb8fce',  border: 'rgba(155,89,182,0.3)'  },
};

const POSTS_PER_PAGE = 20;

function PostSkeleton() {
  return (
    <div className="forum-post-skeleton">
      <div className="skeleton-avatar" />
      <div className="skeleton-body">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-meta" />
      </div>
      <div className="skeleton-right">
        <div className="skeleton-line skeleton-badge" />
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CategoryBadge({ category }) {
  const style = CATEGORY_COLORS[category] || CATEGORY_COLORS.General;
  return (
    <span
      className="forum-cat-badge"
      style={{ background: style.bg, color: style.color, borderColor: style.border }}
    >
      {category}
    </span>
  );
}

export default function ForumList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ page });
    if (category) params.set('category', category);

    get(`/api/posts?${params}`, token)
      .then(data => {
        if (cancelled) return;
        setPosts(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Failed to load posts');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [category, page, token]);

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main forum-main">

          {/* Page header */}
          <div className="forum-header">
            <div className="forum-header-left">
              <h1 className="forum-title">⚔ The Forum</h1>
              <p className="forum-subtitle">Chronicles, quests, and tales from across the realm</p>
            </div>
            <button
              className="btn-primary forum-new-btn"
              onClick={() => navigate('/forum/new')}
            >
              + New Post
            </button>
          </div>

          {/* Category filters */}
          <div className="forum-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`forum-filter-btn${category === cat.value ? ' active' : ''}`}
                onClick={() => handleCategoryChange(cat.value)}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div className="alert error visible" style={{ marginBottom: '1.5rem' }}>
              ⚠ {error}
            </div>
          )}

          {/* Post list */}
          <div className="forum-list">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
            ) : posts.length === 0 ? (
              <div className="forum-empty">
                <div className="forum-empty-icon">📜</div>
                <h3 className="forum-empty-title">No scrolls found</h3>
                <p className="forum-empty-desc">
                  {category
                    ? `No posts in the "${category}" category yet. Be the first to write one.`
                    : 'The forum is quiet. Start a conversation, adventurer.'}
                </p>
                <button
                  className="btn-cta"
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigate('/forum/new')}
                >
                  Write a Post
                </button>
              </div>
            ) : (
              posts.map(post => (
                <Link key={post._id} to={`/forum/${post._id}`} className="forum-post-row">
                  <div className="forum-post-avatar">
                    {post.character?.avatar || '⚔️'}
                  </div>
                  <div className="forum-post-body">
                    <div className="forum-post-top">
                      <span className={`forum-locked-icon${post.isLocked ? '' : ' hidden'}`}>🔒</span>
                      <span className="forum-post-title">{post.title}</span>
                    </div>
                    <div className="forum-post-meta">
                      <span className="forum-post-author">
                        {post.character?.name || 'Unknown'}
                        {post.character?.class && (
                          <span className="forum-post-class"> · {post.character.race} {post.character.class}</span>
                        )}
                      </span>
                      <span className="forum-meta-dot">·</span>
                      <span className="forum-post-date">{formatDate(post.createdAt)}</span>
                      {post.tags?.length > 0 && (
                        <>
                          <span className="forum-meta-dot">·</span>
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="forum-tag">{tag}</span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="forum-post-right">
                    <CategoryBadge category={post.category} />
                    <div className="forum-post-stats">
                      <span title="Comments">💬 {post.commentCount ?? 0}</span>
                      <span title="Views">👁 {post.views ?? 0}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="forum-pagination">
              <button
                className="forum-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span className="forum-page-info">
                Page {page} of {totalPages}
                <span className="forum-page-total"> · {total} posts</span>
              </span>
              <button
                className="forum-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
