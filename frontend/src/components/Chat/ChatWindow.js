import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api, { extractErrorMessage } from '../../api/axios';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import { useRooms } from '../../context/RoomsContext';
import {
  formatTime,
  getRoomLabel,
  getRoomSubtitle,
  isSelfRoom,
} from '../../utils/rooms';
import Avatar from '../Sidebar/Avatar';

const groupMessages = (messages) => {
  // Collapse consecutive messages from the same sender into visual groups.
  const groups = [];
  messages.forEach((msg) => {
    const last = groups[groups.length - 1];
    const senderId = msg.sender?.id || 'unknown';
    if (last && last.senderId === senderId) {
      last.items.push(msg);
    } else {
      groups.push({ senderId, sender: msg.sender, items: [msg] });
    }
  });
  return groups;
};

const ChatWindow = ({ roomId, onClose }) => {
  const { user } = useAuth();
  const { rooms } = useRooms();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const activeRoomRef = useRef(null);

  const room = useMemo(() => rooms.find((r) => r.id === roomId) || null, [rooms, roomId]);
  const selfRoom = useMemo(() => isSelfRoom(room, user?.id), [room, user?.id]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Load history
  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setMessages([]);
    (async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}/messages`);
        if (cancelled) return;
        setMessages(data.messages || []);
        requestAnimationFrame(() => scrollToBottom(false));
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err, 'Could not load history'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, scrollToBottom]);

  // Socket lifecycle: share one connection and re-join rooms as needed
  useEffect(() => {
    if (!roomId || !user) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    socketRef.current = socket;

    const previousRoom = activeRoomRef.current;
    if (previousRoom && previousRoom !== roomId) {
      socket.emit('leave_room', { roomId: previousRoom });
    }

    socket.emit('join_room', { roomId }, (err) => {
      if (err) console.warn('join_room:', err.message);
    });
    activeRoomRef.current = roomId;

    const handleNewMessage = (msg) => {
      if (msg.room !== roomId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => scrollToBottom(true));
    };

    const handleSocketError = (err) => {
      console.warn('socket_error:', err?.message);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('socket_error', handleSocketError);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('socket_error', handleSocketError);
      if (activeRoomRef.current === roomId) {
        socket.emit('leave_room', { roomId });
        activeRoomRef.current = null;
      }
    };
  }, [roomId, user, scrollToBottom]);

  const sendMessage = () => {
    const value = text.trim();
    if (!value || sending || !socketRef.current) return;
    setSending(true);
    socketRef.current.emit(
      'send_message',
      { roomId, text: value },
      (err) => {
        setSending(false);
        if (err) {
          setError(err.message || 'Could not send message');
          return;
        }
        setText('');
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const roomLabel = getRoomLabel(room, user?.id) || 'Chat';
  const roomSubtitle = getRoomSubtitle(room, user?.id);
  const seed = selfRoom
    ? user?.id
    : room?.roomType === 'direct'
      ? (room.members || []).find((m) => m.id !== user?.id)?.id || room?.id
      : room?.id;

  const groups = useMemo(() => groupMessages(messages), [messages]);

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <Avatar seed={seed} name={roomLabel} />
        <div className="body">
          <div className="title">{roomLabel}</div>
          <div className="subtitle">{roomSubtitle}</div>
        </div>
        <button className="btn ghost icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {loading && (
          <div className="chat-empty">
            <div className="loader-col">
              <div className="spinner" />
              <span>Loading history…</span>
            </div>
          </div>
        )}

        {!loading && error && <div className="error-banner">{error}</div>}

        {!loading && !error && messages.length === 0 && (
          <div className="chat-empty">
            {selfRoom
              ? 'This is your space for notes, links and reminders.'
              : 'No messages yet. Be the first to write.'}
          </div>
        )}

        <AnimatePresence initial={false}>
          {groups.map((group, gi) => {
            const mine = group.senderId === user?.id;
            const last = group.items[group.items.length - 1];
            return (
              <motion.div
                key={`${group.senderId}-${gi}-${group.items[0].id}`}
                className={`msg-group${mine ? ' mine' : ''}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Avatar
                  seed={group.senderId}
                  name={group.sender?.username || 'U'}
                />
                <div className="msg-stack">
                  <div className="msg-meta">
                    {mine
                      ? selfRoom ? 'You' : 'You'
                      : group.sender?.username || 'Anonymous'}
                    {' · '}
                    {formatTime(last.createdAt)}
                  </div>
                  {group.items.map((m) => (
                    <div className="msg-bubble" key={m.id}>{m.text}</div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="chat-composer">
        <textarea
          rows={1}
          placeholder={selfRoom ? 'Write yourself a note…' : 'Type a message…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
        />
        <button
          className="btn primary"
          onClick={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </section>
  );
};

export default ChatWindow;
