import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clearToken, getToken, isAdmin } from '../api.js';

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(getToken());
  const showAdmin = isAdmin();
  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span>Lottery</span>
          <strong>Big</strong>
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/support">Support</NavLink>
          {showAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        {isLoggedIn ? (
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/signup" className="btn btn-primary">Signup</Link>
          </div>
        )}
      </div>
    </header>
  );
}
