import { useState } from 'react';
import { apiFetch, setToken } from '../api.js';

export default function Login() {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    setError('');
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(res.token);
    setMessage('Logged in.');
  };

  const handleRegister = async () => {
    setError('');
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(res.token);
    setMessage('Account created.');
  };

  const handleRequestOtp = async () => {
    setError('');
    const res = await apiFetch('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
    setDemoOtp(res.code);
  };

  const handleVerifyOtp = async () => {
    setError('');
    const res = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code: otp })
    });
    setToken(res.token);
    setMessage('Logged in via OTP.');
  };

  return (
    <div className="page">
      <section className="section-title">
        <h2>Login / Create Account</h2>
        <p>Use email + password or OTP sign-in.</p>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="tabs">
        <button className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>
          Email
        </button>
        <button className={mode === 'otp' ? 'active' : ''} onClick={() => setMode('otp')}>
          Phone OTP
        </button>
      </div>

      {mode === 'email' && (
        <div className="form-card">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleEmailLogin}>
              Login
            </button>
            <button className="btn btn-ghost" onClick={handleRegister}>
              Create Account
            </button>
          </div>
        </div>
      )}

      {mode === 'otp' && (
        <div className="form-card">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn btn-primary" onClick={handleRequestOtp}>
            Send OTP
          </button>
          {demoOtp && <p className="note">Demo OTP: {demoOtp}</p>}
          <label>Enter OTP</label>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} />
          <button className="btn btn-ghost" onClick={handleVerifyOtp}>
            Verify
          </button>
        </div>
      )}
    </div>
  );
}
