import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { get, put } from '../../lib/api';

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!token) return undefined;
    const load = () => {
      get('/api/notifications', token)
        .then(r => { setItems(r.data || []); setUnread(r.meta?.unread || 0); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!token) return null;

  const openItem = (n) => {
    setOpen(false);
    if (!n.isRead) {
      put(`/api/notifications/${n._id}/read`, {}, token).catch(() => {});
      setItems(prev => prev.map(x => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread(u => Math.max(0, u - 1));
    }
    if (n.post) navigate(`/forum/${n.post}`);
  };

  const markAll = () => {
    put('/api/notifications/read-all', {}, token).catch(() => {});
    setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="notif" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(o => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-head">
            <span>Notifications</span>
            {unread > 0 && <button className="notif-readall" onClick={markAll}>Mark all read</button>}
          </div>

          {items.length === 0 ? (
            <div className="notif-empty">No word has reached you yet.</div>
          ) : (
            <div className="notif-list">
              {items.map(n => (
                <button
                  key={n._id}
                  className={`notif-item${n.isRead ? '' : ' unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notif-avatar">{n.actorCharacter?.avatar || '✉️'}</span>
                  <span className="notif-text">
                    <strong>{n.actorCharacter?.name || 'Someone'}</strong> replied to <em>{n.text || 'your thread'}</em>
                  </span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
