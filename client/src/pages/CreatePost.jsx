import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { post } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import RichTextEditor from '../components/forum/RichTextEditor';

const CATEGORIES = ['General', 'Quests', 'Lore', 'Characters', 'Trading', 'Announcements'];

// Plain-text length of rich-text HTML, for validation.
function stripText(html) {
  if (typeof document === 'undefined') return (html || '').trim();
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').trim();
}

export default function CreatePost() {
  const { token, character } = useAuth();
  const navigate = useNavigate();
  const navState = useLocation().state || {};
  const locationId    = navState.locationId    || null;
  const locationName  = navState.locationName  || null;
  const cityId        = navState.cityId        || locationId;
  const subLocationId = navState.subLocationId || null;
  const placeName     = navState.subLocationName || locationName;
  const backTo = subLocationId
    ? `/world/areas/${cityId}/venue/${subLocationId}`
    : locationId ? `/world/areas/${locationId}` : null;

  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent]   = useState('');
  const [tags, setTags]         = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const text = stripText(content);
    if (!title.trim())   { setError('Title is required.'); return; }
    if (title.length < 3){ setError('Title must be at least 3 characters.'); return; }
    if (!text)           { setError('Content is required.'); return; }
    if (text.length < 10){ setError('Content must be at least 10 characters.'); return; }

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);

    setSubmitting(true);
    try {
      const body = { title: title.trim(), content: content.trim(), category, tags: tagList };
      if (subLocationId) body.subLocation = subLocationId;
      else if (locationId) body.location = locationId;
      const res = await post('/api/posts', body, token);
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

          {backTo
            ? <button className="post-back-link" onClick={() => navigate(backTo)}>← Back to {placeName}</button>
            : <Link to="/forum" className="post-back-link">← Back to Forum</Link>
          }

          <div className="create-post-wrap">
            <header className="create-post-header">
              <h1 className="forum-title">New Post</h1>
              {placeName && (
                <div className="create-post-location">
                  📍 Writing in <span className="create-post-location-name">{placeName}</span>
                </div>
              )}
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
                <label>Content</label>
                <RichTextEditor value={content} onChange={setContent} placeholder="Tell your story, in character…" />
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
