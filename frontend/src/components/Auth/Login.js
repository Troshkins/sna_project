import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, background: 'var(--bg-secondary)', borderRadius: 12 }}>
      <h2 style={{ color: 'var(--accent-light)' }}>Вход</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          style={inputStyle} />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required
          style={inputStyle} />
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" style={buttonStyle}>Войти</button>
      </form>
      <p onClick={() => navigate('/register')} style={{ cursor: 'pointer', color: 'var(--accent-light)', marginTop: 10 }}>
        Нет аккаунта? Зарегистрироваться
      </p>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: 10,
  margin: '10px 0',
  background: 'var(--bg-primary)',
  border: '1px solid var(--accent)',
  borderRadius: 6,
  color: 'var(--text-primary)'
};

const buttonStyle = {
  width: '100%',
  padding: 10,
  background: 'var(--accent)',
  border: 'none',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export default Login;
