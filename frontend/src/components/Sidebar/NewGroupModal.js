import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api, { extractErrorMessage } from '../../api/axios';
import { useRooms } from '../../context/RoomsContext';
import Avatar from './Avatar';

const NewGroupModal = ({ open, onClose, onCreated }) => {
  const { createGroup, addMember } = useRooms();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setQuery('');
      setResults([]);
      setMembers([]);
      setError('');
      setSubmitting(false);
      return;
    }
    mountedRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q } });
        if (!cancelled) setResults(data.users || []);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  const toggleMember = (u) => {
    setMembers((prev) => {
      if (prev.some((m) => m.id === u.id)) {
        return prev.filter((m) => m.id !== u.id);
      }
      return [...prev, u];
    });
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a group name');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const room = await createGroup(trimmed);
      for (const m of members) {
        try {
          await addMember(room.id, m.id);
        } catch (err) {
          console.warn('Could not add member', m.id, err);
        }
      }
      onCreated?.(room);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create group'));
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">New group</div>
              <button className="btn ghost small" onClick={onClose}>Close</button>
            </div>
            <div className="modal-body">
              <input
                className="input"
                placeholder="Group name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={50}
              />
              {members.length > 0 && (
                <div className="tag-row">
                  {members.map((m) => (
                    <span className="tag" key={m.id}>
                      {m.username}
                      <span
                        className="remove"
                        onClick={() => toggleMember(m)}
                        aria-label="Remove"
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="divider" />
              <input
                className="input"
                placeholder="Add members"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {query.trim().length >= 2 && results.length === 0 && (
                <div className="empty-hint">No users found</div>
              )}
              {results.map((u) => {
                const picked = members.some((m) => m.id === u.id);
                return (
                  <div
                    key={u.id}
                    className="search-result"
                    onClick={() => toggleMember(u)}
                  >
                    <Avatar seed={u.id} name={u.username} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.email}</div>
                    </div>
                    <span className="tag" style={{ background: picked ? 'var(--accent-soft)' : undefined }}>
                      {picked ? 'Added' : 'Add'}
                    </span>
                  </div>
                );
              })}
              {error && <div className="error-banner">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <button className="btn primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewGroupModal;
