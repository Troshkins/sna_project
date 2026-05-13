import React, { useCallback, useEffect, useState } from 'react';
import { useRooms } from '../../context/RoomsContext';
import Sidebar from '../Sidebar/Sidebar';
import GraphView from '../Graph/GraphView';
import ChatWindow from '../Chat/ChatWindow';

const MainLayout = () => {
  const { rooms } = useRooms();
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // If the selected room vanishes (deleted / left), close the chat
  useEffect(() => {
    if (selectedRoomId && !rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [rooms, selectedRoomId]);

  const handleSelectRoom = useCallback((roomId) => {
    setSelectedRoomId(roomId);
  }, []);

  const handleCloseChat = useCallback(() => {
    setSelectedRoomId(null);
  }, []);

  return (
    <div className={`app-shell${selectedRoomId ? ' with-chat' : ''}`}>
      <Sidebar
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
      />
      <GraphView
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
      />
      {selectedRoomId && (
        <ChatWindow
          key={selectedRoomId}
          roomId={selectedRoomId}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default MainLayout;
