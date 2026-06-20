import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post, del } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import Breadcrumb from '../components/layout/Breadcrumb';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PostDetail() {
  const { id } = useParams();
  const { token, user, character } = useAuth();
  const navigate = useNavigate();

  const [postData, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
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
    if (!commentText.trim()) return;
    setCommentError('');
    setSubmitting(true);
    try {
      const res = await post(`/api/posts/${id}/comments`, { content: commentText.trim() }, token);
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post and all comments?')) return;
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

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main">

          <Breadcrumb items={postData.location ? [
            { label: '🗺 Map', to: '/map' },
            { label: postData.location.name, to: `/world/areas/${postData.location._id}` },
            postData.subLocation && { label: postData.subLocation.name, to: `/world/areas/${postData.location._id}/venue/${postData.subLocation._id}` },
            { label: postData.title },
          ] : [
            { label: 'Off-Topic', to: '/forum' },
            { label: postData.title },
          ]} />

          {/* Post */}
          <article className="post-article">
            <header className="post-art-header">
              <div className="post-art-meta">
                <span className="post-cat-badge">{postData.category}</span>
                {postData.isPinned && <span className="post-pin-badge">📌 Pinned</span>}
                {postData.isLocked && <span className="post-lock-badge">🔒 Locked</span>}
              </div>
              <h1 className="post-art-title">{postData.title}</h1>
              <div className="post-art-by">
                <span className="post-char-avatar">{postData.character?.avatar || '⚔️'}</span>
                <div>
                  {postData.character?._id ? (
                    <Link to={`/character/${postData.character._id}`} className="post-char-name post-char-link">
                      {postData.character.name}
                    </Link>
                  ) : (
                    <span className="post-char-name">{postData.character?.name}</span>
                  )}
                  {postData.character?.class && (
                    <span className="post-char-class"> · {postData.character.race} {postData.character.class} · Lv.{postData.character.level}</span>
                  )}
                  <div className="post-art-date">{formatDate(postData.createdAt)} · {postData.views} views</div>
                </div>
              </div>
            </header>

            <div className="post-art-content">
              {postData.content.split('\n').map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>

            {postData.tags?.length > 0 && (
              <div className="post-art-tags">
                {postData.tags.map(t => <span key={t} className="forum-tag">{t}</span>)}
              </div>
            )}

            {(isAuthor || isAdmin) && (
              <div className="post-art-actions">
                <button className="post-delete-btn" onClick={handleDeletePost}>Delete Post</button>
              </div>
            )}
          </article>

          {/* Comments */}
          <section className="comments-section">
            <h2 className="comments-heading">
              {comments.length === 0 ? 'No replies yet' : `${comments.length} ${comments.length === 1 ? 'Reply' : 'Replies'}`}
            </h2>

            <div className="comments-list">
              {comments.map(c => (
                <div key={c._id} className="comment-row">
                  <div className="comment-avatar">{c.character?.avatar || '⚔️'}</div>
                  <div className="comment-body">
                    <div className="comment-header">
                      {c.character?._id ? (
                        <Link to={`/character/${c.character._id}`} className="comment-char-name comment-char-link">
                          {c.character.name}
                        </Link>
                      ) : (
                        <span className="comment-char-name">{c.character?.name || 'Unknown'}</span>
                      )}
                      {c.character?.class && (
                        <span className="comment-char-class"> · {c.character.race} {c.character.class}</span>
                      )}
                      <span className="comment-date">{formatDate(c.createdAt)}</span>
                      {(user?._id === c.author?._id || isAdmin) && (
                        <button className="comment-del-btn" onClick={() => handleDeleteComment(c._id)}>×</button>
                      )}
                    </div>
                    <p className="comment-text">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply form */}
            {token && character ? (
              postData.isLocked ? (
                <div className="comment-locked">🔒 This thread is locked. No new replies.</div>
              ) : (
                <form className="comment-form" onSubmit={handleComment}>
                  <div className="comment-form-by">
                    <span>{character.avatar || '⚔️'}</span>
                    <span>{character.name} · {character.race} {character.class}</span>
                  </div>
                  <textarea
                    className="comment-textarea"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write your reply in character…"
                    rows={4}
                    maxLength={5000}
                  />
                  {commentError && <div className="alert error visible">{commentError}</div>}
                  <button className="btn-primary" type="submit" disabled={submitting || !commentText.trim()}>
                    {submitting ? 'Posting…' : 'Post Reply'}
                  </button>
                </form>
              )
            ) : token && !character ? (
              <div className="comment-locked">You need an active character to reply.</div>
            ) : (
              <div className="comment-locked"><Link to="/login">Log in</Link> to reply.</div>
            )}
          </section>

        </main>
      </div>
    </>
  );
}
