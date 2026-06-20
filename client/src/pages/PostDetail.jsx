import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post, put, del } from '../lib/api';
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

// Plain-text presence check for rich-text HTML.
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

  // Inline editing: editingId is the topic id or a comment id; null = nothing.
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  const startEditTopic = () => {
    setEditingId(postData._id);
    setEditTitle(postData.title);
    setEditHtml(postData.content);
    setEditError('');
  };
  const startEditComment = (c) => {
    setEditingId(c._id);
    setEditHtml(c.content);
    setEditError('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditHtml('');
    setEditTitle('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!hasText(editHtml)) { setEditError('Content is required.'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      if (editingId === postData._id) {
        const res = await put(`/api/posts/${postData._id}`, { title: editTitle.trim(), content: editHtml }, token);
        setPost(prev => ({ ...prev, title: res.data.title, content: res.data.content }));
      } else {
        const res = await put(`/api/posts/${id}/comments/${editingId}`, { content: editHtml }, token);
        setComments(prev => prev.map(c => (c._id === editingId ? { ...c, content: res.data.content, isEdited: true } : c)));
      }
      cancelEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this topic?')) return;
    try {
      await del(`/api/posts/${id}`, token);
      navigate('/forum');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this reply?')) return;
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

  // Edit/delete is allowed only on the last word in the thread (and only for
  // its own author) — or for mods. The topic is the last word only with no
  // replies; otherwise the last word is the newest reply.
  const lastCommentId = comments.length ? comments[comments.length - 1]._id : null;
  const topicCanManage = isAdmin || (isAuthor && comments.length === 0);
  const editingTopic = editingId === postData._id;

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main thread-main">

          <Breadcrumb items={crumbs} />

          {/* Topic header — title + description only, no author identity */}
          <header className="thread-head">
            {editingTopic ? (
              <div className="edit-box">
                <input
                  className="edit-title"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Topic title"
                />
                <RichTextEditor value={editHtml} onChange={setEditHtml} placeholder="Topic description…" />
                {editError && <div className="alert error visible">{editError}</div>}
                <div className="edit-actions">
                  <button className="btn-secondary" type="button" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
                  <button className="btn-primary" type="button" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            ) : (
              <>
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
                {topicCanManage && (
                  <div className="thread-head-actions">
                    <button className="post-edit-btn" onClick={startEditTopic}>Edit</button>
                    <button className="post-delete-btn" onClick={handleDeletePost}>Delete topic</button>
                  </div>
                )}
              </>
            )}
          </header>

          {/* Replies — two columns: text left, character profile right */}
          <section className="reply-list">
            {comments.map(c => {
              const cc = CLASS_COLORS[c.character?.class] || 'var(--gold)';
              const mine = user?._id === c.author?._id;
              const canManage = isAdmin || (mine && c._id === lastCommentId);
              const editingThis = editingId === c._id;
              return (
                <article key={c._id} className="reply">
                  <div className="reply-text">
                    {editingThis ? (
                      <div className="edit-box">
                        <RichTextEditor value={editHtml} onChange={setEditHtml} placeholder="Edit your reply…" />
                        {editError && <div className="alert error visible">{editError}</div>}
                        <div className="edit-actions">
                          <button className="btn-secondary" type="button" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
                          <button className="btn-primary" type="button" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <RichText html={c.content} />
                        <div className="reply-foot">
                          <span className="reply-date">{formatDate(c.createdAt)}{c.isEdited && <span className="reply-edited"> · edited</span>}</span>
                          {canManage && (
                            <span className="reply-manage">
                              <button className="reply-edit" onClick={() => startEditComment(c)}>Edit</button>
                              <button className="reply-del" onClick={() => handleDeleteComment(c._id)}>Delete</button>
                            </span>
                          )}
                        </div>
                      </>
                    )}
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
