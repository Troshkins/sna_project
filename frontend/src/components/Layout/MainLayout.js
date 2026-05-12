import React, { useState, useCallback } from 'react';
import GraphView from '../Graph/GraphView';
import ChatWindow from '../Chat/ChatWindow';
import { useAuth } from '../../context/AuthContext';

const MainLayout = () => {
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectRoom = useCallback((roomId) => {
    setSelectedRoomId(roomId);
  }, []);

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Верхняя панель с информацией и кнопками */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: 12 }}>
            {user?.username}
          </span>
          <button onClick={triggerRefresh} style={miniButton}>🔄</button>
          <button onClick={logout} style={miniButton}>Выход</button>
        </div>
        <GraphView onSelectRoom={handleSelectRoom} refreshTrigger={refreshKey} />
      </div>
      {selectedRoomId && (
        <div style={{ width: 350, borderLeft: '2px solid var(--accent)' }}>
          <button onClick={() => setSelectedRoomId(null)} style={{ ...miniButton, margin: 4 }}>
            ✖ Закрыть чат
          </button>
          <ChatWindow roomId={selectedRoomId} />
        </div>
      )}
    </div>
  );
};

const miniButton = {
  background: 'var(--accent)',
  border: 'none',
  color: 'white',
  padding: '4px 10px',
  borderRadius: 6,
  cursor: 'pointer'
};

export default MainLayout;
