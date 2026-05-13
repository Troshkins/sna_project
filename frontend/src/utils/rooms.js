export const isSelfRoom = (room, currentUserId) => {
  if (!room || room.roomType !== 'direct') return false;
  const members = room.members || [];
  if (members.length === 0) return false;
  return members.every((m) => m && m.id === currentUserId);
};

export const getRoomLabel = (room, currentUserId) => {
  if (!room) return '';
  if (room.roomType === 'direct') {
    if (isSelfRoom(room, currentUserId)) return 'Saved Messages';
    const peer = (room.members || []).find((m) => m.id !== currentUserId);
    return peer?.username || 'Direct chat';
  }
  return room.name || 'Untitled';
};

export const getRoomSubtitle = (room, currentUserId) => {
  if (!room) return '';
  if (room.roomType === 'direct') {
    if (isSelfRoom(room, currentUserId)) return 'Notes to yourself';
    const peer = (room.members || []).find((m) => m.id !== currentUserId);
    return peer?.email || 'Direct chat';
  }
  return 'Group';
};

export const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};
