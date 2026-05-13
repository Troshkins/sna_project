import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../api/axios';

const USERNAME_MIN = 3;
const PASSWORD_MIN = 6;

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = username.trim();
    if (trimmedName.length < USERNAME_MIN) {
      setError(`Username must be at least ${USERNAME_MIN} characters`);
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters`);
      return;
    }

    setSubmitting(true);
    try {
      await register(trimmedName, email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not register'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Weave your first communication network</p>

        {/* autoComplete="off" on the form + role attributes help password
            managers stop treating the username field as a password input. */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
          autoComplete="off"
          noValidate
        >
          <div className="field">
            <label className="field-label" htmlFor="reg-username">
              Username
            </label>
            <input
              id="reg-username"
              name="new-username"
              className="input"
              type="text"
              placeholder="e.g. anna_k"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              required
              minLength={USERNAME_MIN}
              maxLength={30}
            />
            <span className="field-hint">
              At least {USERNAME_MIN} characters, no spaces
            </span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              name="email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              name="new-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
            />
            <span className="field-hint">
              At least {PASSWORD_MIN} characters
            </span>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button
            className="btn primary block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <a onClick={() => navigate('/login')}>Sign in</a>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
