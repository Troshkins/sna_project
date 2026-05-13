import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api, { extractErrorMessage } from '../../api/axios';
import { useRooms } from '../../context/RoomsContext';
import Avatar from './Avatar';

const NewDirectModal = ({ open, onClose, onCreated }) => {
  const { createDirect } = useRooms();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError('');
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q } });
        if (!cancelled) setResults(data.users || []);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  const handlePick = async (user) => {
    setError('');
    try {
      const room = await createDirect(user.id);
      onCreated?.(room);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not open chat'));
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
              <div className="modal-title">New chat</div>
              <button className="btn ghost small" onClick={onClose}>Close</button>
            </div>
            <div className="modal-body">
              <input
                className="input"
                placeholder="Username or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {error && <div className="error-banner">{error}</div>}
              {query.trim().length < 2 && (
                <div className="empty-hint">Type at least 2 characters</div>
              )}
              {loading && <div className="empty-hint">Searching…</div>}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="empty-hint">No users found</div>
              )}
              {results.map((u) => (
                <div
                  key={u.id}
                  className="search-result"
                  onClick={() => handlePick(u)}
                >
                  <Avatar seed={u.id} name={u.username} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title" style={{ fontSize: 14 }}>{u.username}</div>
                    <div className="subtitle" style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewDirectModal;
