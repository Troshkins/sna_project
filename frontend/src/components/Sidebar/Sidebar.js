import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRooms } from '../../context/RoomsContext';
import { getRoomLabel, getRoomSubtitle, isSelfRoom } from '../../utils/rooms';
import Avatar from './Avatar';
import NewDirectModal from './NewDirectModal';
import NewGroupModal from './NewGroupModal';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Chats' },
  { id: 'group', label: 'Groups' },
];

const Sidebar = ({ selectedRoomId, onSelectRoom }) => {
  const { user, logout } = useAuth();
  const { rooms, loading, openSelfChat } = useRooms();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [directOpen, setDirectOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const handleOpenSelf = async () => {
    try {
      const room = await openSelfChat();
      if (room) onSelectRoom(room.id);
    } catch (err) {
      console.warn('Could not open Saved Messages:', err);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => {
        if (tab === 'direct') return r.roomType === 'direct';
        if (tab === 'group') return r.roomType !== 'direct';
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        return getRoomLabel(r, user?.id).toLowerCase().includes(q);
      });
  }, [rooms, tab, query, user?.id]);

  return (
    <aside className="sidebar">
      <div
        className="sidebar-header sidebar-header-self"
        onClick={handleOpenSelf}
        title="Open Saved Messages"
      >
        <Avatar seed={user?.id} name={user?.username} size="lg" />
        <div className="identity">
          <div className="name">{user?.username}</div>
          <div className="email">{user?.email}</div>
        </div>
        <button
          className="btn ghost icon"
          onClick={(e) => {
            e.stopPropagation();
            logout();
          }}
          title="Sign out"
          aria-label="Sign out"
        >
          ⎋
        </button>
      </div>

      <div className="sidebar-search">
        <input
          className="input"
          placeholder="Search chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sidebar-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sidebar-list">
        {loading && <div className="empty-hint">Loading chats…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-hint">
            Nothing yet.<br />
            Start your first conversation or build a group.
          </div>
        )}

        {filtered.map((room) => {
          const label = getRoomLabel(room, user?.id);
          const subtitle = getRoomSubtitle(room, user?.id);
          const isActive = room.id === selectedRoomId;
          const selfRoom = isSelfRoom(room, user?.id);
          const seed = selfRoom
            ? user?.id
            : room.roomType === 'direct'
              ? (room.members || []).find((m) => m.id !== user?.id)?.id || room.id
              : room.id;
          return (
            <motion.div
              key={room.id}
              layout
              className={`contact-row${isActive ? ' active' : ''}`}
              onClick={() => onSelectRoom(room.id)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Avatar seed={seed} name={label} />
              <div className="body">
                <div className="title">{label}</div>
                <div className="subtitle">{subtitle}</div>
              </div>
              <span className="kind-badge">
                {selfRoom ? 'YOU' : room.roomType === 'direct' ? 'DM' : 'GRP'}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="btn" onClick={() => setDirectOpen(true)}>+ Chat</button>
        <button className="btn primary" onClick={() => setGroupOpen(true)}>+ Group</button>
      </div>

      <NewDirectModal
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        onCreated={(room) => onSelectRoom(room.id)}
      />
      <NewGroupModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreated={(room) => onSelectRoom(room.id)}
      />
    </aside>
  );
};

export default Sidebar;
