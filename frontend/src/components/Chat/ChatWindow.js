import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const ChatWindow = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [room, setRoom] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!roomId || !user) return;
    // Загружаем данные комнаты и сообщения с сервера
    const fetchRoomAndMessages = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/messages/${roomId}/messages`)
        ]);
        setRoom(roomRes.data.data);
        setMessages(msgRes.data.data);
      } catch (err) {
        console.error('Ошибка загрузки данных комнаты');
      }
    };
    fetchRoomAndMessages();

    // Подключаемся к сокету
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    socketRef.current = socket;

    socket.emit('join_room', { roomId }, (err) => {
      if (err) console.error('Socket join error', err.message);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('socket_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => {
      socket.emit('leave_room', { roomId });
      socket.disconnect();
    };
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, text }, (response) => {
      if (response?.message) {
        console.error(response.message);
      }
    });
    setText('');
  };

  const roomName = room
    ? (room.roomType === 'direct'
        ? room.members.find(m => m._id !== user.id)?.username || 'Чат'
        : room.name)
    : 'Загрузка...';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--accent)' }}>
        <h3 style={{ color: 'var(--accent-light)' }}>{roomName}</h3>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ 
            marginBottom: 8, 
            padding: 6, 
            backgroundColor: msg.sender?.id === user.id ? 'var(--accent)' : 'var(--bg-primary)',
            borderRadius: 8,
            maxWidth: '80%',
            alignSelf: msg.sender?.id === user.id ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {msg.sender?.username || 'Аноним'}
            </div>
            <div style={{ color: 'var(--text-primary)' }}>{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', padding: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Сообщение..."
          style={{ flex: 1, padding: 8, background: 'var(--bg-primary)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--text-primary)' }}
        />
        <button type="submit" style={{ marginLeft: 8, padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: 'white' }}>
          Отправить
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
