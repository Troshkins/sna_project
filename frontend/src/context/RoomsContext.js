import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const RoomsContext = createContext(null);

export const RoomsProvider = ({ children }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { data } = await api.get('/rooms');
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchRooms();
    } else {
      setRooms([]);
      setLoading(false);
    }
  }, [user, fetchRooms]);

  const upsertRoom = useCallback((room) => {
    setRooms((prev) => {
      const exists = prev.some((r) => r.id === room.id);
      if (exists) {
        return prev.map((r) => (r.id === room.id ? room : r));
      }
      return [room, ...prev];
    });
  }, []);

  const createGroup = useCallback(async (name) => {
    const { data } = await api.post('/rooms', { name });
    upsertRoom(data.room);
    return data.room;
  }, [upsertRoom]);

  const createDirect = useCallback(async (userId) => {
    const { data } = await api.post('/rooms/direct', { userId });
    upsertRoom(data.room);
    return data.room;
  }, [upsertRoom]);

  // Open or create the user's own "Saved Messages" room.
  const openSelfChat = useCallback(async () => {
    if (!user) return null;
    const { data } = await api.post('/rooms/direct', { userId: user.id });
    upsertRoom(data.room);
    return data.room;
  }, [user, upsertRoom]);

  const addMember = useCallback(async (roomId, userId) => {
    const { data } = await api.post(`/rooms/${roomId}/members`, { userId });
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, members: data.members } : r))
    );
    return data.members;
  }, []);

  const deleteRoom = useCallback(async (roomId) => {
    await api.delete(`/rooms/${roomId}`);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const leaveRoom = useCallback(async (roomId) => {
    await api.delete(`/rooms/${roomId}/members/me`);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const value = useMemo(
    () => ({
      rooms,
      loading,
      error,
      refresh: fetchRooms,
      createGroup,
      createDirect,
      openSelfChat,
      addMember,
      deleteRoom,
      leaveRoom,
    }),
    [
      rooms,
      loading,
      error,
      fetchRooms,
      createGroup,
      createDirect,
      openSelfChat,
      addMember,
      deleteRoom,
      leaveRoom,
    ]
  );

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
};

export const useRooms = () => {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider');
  return ctx;
};
