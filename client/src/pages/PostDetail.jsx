import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post, del } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import Breadcrumb from '../components/layout/Breadcrumb';
import RichText from '../components/forum/RichText';
import RichTextEditor from '../components/forum/RichTextEditor';

const CLASS_COLORS = {
  Warrior: '#e74c3c', Mage: '#3498db', Rogue: '#f39c12',
  Cleric: '#f1c40f', Ranger: '#27ae60', Paladin: '#9b59b6',
  Warlock: '#8e44ad', Bard: '#e67e22', Druid: '#16a085',
  Necromancer: '#2c3e50',
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Strip tags to check whether the editor actually has text (not just markup).
function hasText(html) {
  if (typeof document === 'undefined') return !!html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').trim().length > 0;
}

export default function PostDetail() {
  const { id } = useParams();
  const { token, user, character } = useAuth();
  const navigate = useNavigate();

  const [postData, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentHtml, setCommentHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      get(`/api/posts/${id}`, token),
      get(`/api/posts/${id}/comments`, token),
    ])
      .then(([p, c]) => {
        if (cancelled) return;
        setPost(p.data);
        setComments(c.data);
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, token]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!hasText(commentHtml)) return;
    setCommentError('');
    setSubmitting(true);
    try {
      const res = await post(`/api/posts/${id}/comments`, { content: commentHtml }, token);
      setComments(prev => [...prev, res.data]);
      setCommentHtml('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this topic and all replies?')) return;
    try {
      await del(`/api/posts/${id}`, token);
      navigate('/forum');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await del(`/api/posts/${id}/comments/${commentId}`, token);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  };

  const isAuthor = postData && user && postData.author?._id === user._id;
  const isAdmin = user?.role === 'admin' || user?.role === 'head_admin';

  if (loading) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar />
        <main className="dash-main">
          <div className="post-skeleton-wrap">
            {[1,2,3].map(i => <div key={i} className="sk-block" style={{ height: i === 1 ? '2rem' : '1rem', width: i === 1 ? '70%' : '40%', marginBottom: '0.75rem' }} />)}
            <div className="sk-block" style={{ height: '8rem', marginTop: '1.5rem' }} />
          </div>
        </main>
      </div>
    </>
  );

  if (error) return (
    <>
      <BgScene />
      <div className="dashboard"><Topbar />
        <main className="dash-main">
          <div className="alert error visible">{error}</div>
          <Link to="/forum" className="post-back-link">← Back to Forum</Link>
        </main>
      </div>
    </>
  );

  const crumbs = postData.location ? [
    { label: '🗺 Map', to: '/map' },
    { label: postData.location.name, to: `/world/areas/${postData.location._id}` },
    postData.subLocation && { label: postData.subLocation.name, to: `/world/areas/${postData.location._id}/venue/${postData.subLocation._id}` },
    { label: postData.title },
  ] : [
    { label: 'Off-Topic', to: '/forum' },
    { label: postData.title },
  ];

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main thread-main">

          <Breadcrumb items={crumbs} />

          {/* Topic header — title + description only, no author identity */}
          <header className="thread-head">
            <div className="thread-head-badges">
              <span className="post-cat-badge">{postData.category}</span>
              {postData.isPinned && <span className="post-pin-badge">📌 Pinned</span>}
              {postData.isLocked && <span className="post-lock-badge">🔒 Locked</span>}
            </div>
            <h1 className="thread-title">{postData.title}</h1>
            <RichText className="thread-desc" html={postData.content} />
            {postData.tags?.length > 0 && (
              <div className="post-art-tags">
                {postData.tags.map(t => <span key={t} className="forum-tag">{t}</span>)}
              </div>
            )}
            {(isAuthor || isAdmin) && (
              <div className="thread-head-actions">
                <button className="post-delete-btn" onClick={handleDeletePost}>Delete topic</button>
              </div>
            )}
          </header>

          {/* Replies — two columns: text left, character profile right */}
          <section className="reply-list">
            {comments.map(c => {
              const cc = CLASS_COLORS[c.character?.class] || 'var(--gold)';
              return (
                <article key={c._id} className="reply">
                  <div className="reply-text">
                    <RichText html={c.content} />
                    <div className="reply-foot">
                      <span className="reply-date">{formatDate(c.createdAt)}</span>
                      {(user?._id === c.author?._id || isAdmin) && (
                        <button className="reply-del" onClick={() => handleDeleteComment(c._id)}>Delete</button>
                      )}
                    </div>
                  </div>

                  <aside className="reply-profile" style={{ '--cc': cc }}>
                    <div className="reply-avatar">{c.character?.avatar || '⚔️'}</div>
                    {c.character?._id ? (
                      <Link to={`/character/${c.character._id}`} className="reply-name">{c.character?.name}</Link>
                    ) : (
                      <span className="reply-name">{c.character?.name || 'Unknown'}</span>
                    )}
                    {c.character?.class && <div className="reply-class">{c.character.race} {c.character.class}</div>}
                    {c.character?.level != null && <div className="reply-level">Level {c.character.level}</div>}
                  </aside>
                </article>
              );
            })}
          </section>

          {/* Compose */}
          {token && character ? (
            postData.isLocked ? (
              <div className="comment-locked">🔒 This thread is locked. No new replies.</div>
            ) : (
              <form className="reply-compose" onSubmit={handleComment}>
                <div className="reply-compose-as">
                  <span className="reply-compose-avatar">{character.avatar || '⚔️'}</span>
                  <span>Replying as <strong>{character.name}</strong> · {character.race} {character.class}</span>
                </div>
                <RichTextEditor value={commentHtml} onChange={setCommentHtml} placeholder="Write your reply in character…" />
                {commentError && <div className="alert error visible">{commentError}</div>}
                <div className="reply-compose-actions">
                  <button className="btn-primary" type="submit" disabled={submitting || !hasText(commentHtml)}>
                    {submitting ? 'Posting…' : 'Post Reply'}
                  </button>
                </div>
              </form>
            )
          ) : token && !character ? (
            <div className="comment-locked">You need an active character to reply.</div>
          ) : (
            <div className="comment-locked"><Link to="/login">Log in</Link> to reply.</div>
          )}

        </main>
      </div>
    </>
  );
}
