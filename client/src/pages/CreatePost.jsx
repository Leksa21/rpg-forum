import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { post } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const CATEGORIES = ['General', 'Quests', 'Lore', 'Characters', 'Trading', 'Announcements'];

export default function CreatePost() {
  const { token, character } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent]   = useState('');
  const [tags, setTags]         = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim())   { setError('Title is required.'); return; }
    if (title.length < 3){ setError('Title must be at least 3 characters.'); return; }
    if (!content.trim()) { setError('Content is required.'); return; }
    if (content.length < 10) { setError('Content must be at least 10 characters.'); return; }

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);

    setSubmitting(true);
    try {
      const res = await post('/api/posts', { title: title.trim(), content: content.trim(), category, tags: tagList }, token);
      navigate(`/forum/${res.data._id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main">

          <Link to="/forum" className="post-back-link">← Back to Forum</Link>

          <div className="create-post-wrap">
            <header className="create-post-header">
              <h1 className="forum-title">New Post</h1>
              {character && (
                <div className="create-post-as">
                  Writing as <span className="create-post-char">
                    {character.avatar} {character.name} · {character.race} {character.class}
                  </span>
                </div>
              )}
            </header>

            <form className="create-post-form" onSubmit={handleSubmit} noValidate>

              <div className="form-group">
                <label htmlFor="cp-title">Title</label>
                <input
                  id="cp-title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Give your tale a name…"
                  maxLength={200}
                  autoFocus
                />
                <span className="form-hint">{title.length}/200</span>
              </div>

              <div className="form-group">
                <label htmlFor="cp-cat">Category</label>
                <select id="cp-cat" value={category} onChange={e => setCategory(e.target.value)} className="form-select">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cp-content">Content</label>
                <textarea
                  id="cp-content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Tell your story, in character…"
                  rows={12}
                  maxLength={20000}
                  className="create-post-textarea"
                />
                <span className="form-hint">{content.length}/20000</span>
              </div>

              <div className="form-group">
                <label htmlFor="cp-tags">Tags <span className="form-label-opt">(optional, comma-separated)</span></label>
                <input
                  id="cp-tags"
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="e.g. battle, tavern, magic"
                />
              </div>

              {error && <div className="alert error visible">{error}</div>}

              <div className="create-post-actions">
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }} onClick={() => navigate('/forum')}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Publishing…' : 'Publish Post'}
                </button>
              </div>

            </form>
          </div>

        </main>
      </div>
    </>
  );
}
