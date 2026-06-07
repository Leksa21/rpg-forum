import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socket = null;

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function GlobalChat() {
  const { token, character } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (!token) return;

    socket = io({ auth: { token } });

    socket.on('connect', () => { setConnected(true); setError(''); });
    socket.on('connect_error', (err) => { setError(err.message); setConnected(false); });
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:history', (history) => {
      setMessages(history.map(m => ({ ...m, kind: 'msg' })));
    });

    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev.slice(-99), { ...msg, kind: 'msg' }]);
    });

    socket.on('chat:system', (msg) => {
      setMessages(prev => [...prev.slice(-99), { ...msg, kind: 'system' }]);
    });

    return () => { socket?.disconnect(); socket = null; };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('chat:message', input.trim());
    setInput('');
  };

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <span>💬 Global Chat</span>
        <span className={`chat-status ${connected ? 'chat-online' : 'chat-offline'}`}>
          {connected ? '● Live' : '● Offline'}
        </span>
      </div>

      <div className="chat-messages">
        {error && <div className="chat-sys-msg">⚠ {error}</div>}
        {messages.length === 0 && (
          <div className="chat-sys-msg">No messages yet. Say something, adventurer.</div>
        )}
        {messages.map((msg, i) => (
          msg.kind === 'system'
            ? <div key={i} className="chat-sys-msg">— {msg.text}</div>
            : (
              <div key={msg.id || i} className="chat-msg">
                <span className="chat-avatar">{msg.character?.avatar || '⚔️'}</span>
                <div className="chat-msg-body">
                  <span className="chat-name">
                    {msg.character?.name || msg.username}
                    {msg.character?.class && <span className="chat-class"> · {msg.character.class}</span>}
                  </span>
                  <span className="chat-time">{formatTime(msg.at)}</span>
                  <p className="chat-text">{msg.text}</p>
                </div>
              </div>
            )
        ))}
        <div ref={bottomRef} />
      </div>

      {token && character ? (
        <form className="chat-form" onSubmit={sendMessage}>
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Speak as ${character.name}…`}
            maxLength={500}
            disabled={!connected}
          />
          <button type="submit" className="chat-send" disabled={!connected || !input.trim()}>Send</button>
        </form>
      ) : (
        <div className="chat-sys-msg" style={{ padding: '0.75rem' }}>Log in to chat.</div>
      )}
    </div>
  );
}
