import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setToken, isAdmin } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(res.token);
      if (!isAdmin()) {
        setError('Admin access required.');
        return;
      }
      setMessage('Logged in.');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <section className="section-title">
        <h2>Admin Login</h2>
        <p>Sign in with your admin account.</p>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="form-card">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
