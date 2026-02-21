import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span>Lottery</span>
          <strong>Big</strong>
        </Link>
        <nav className="nav-links">
          <NavLink to="/games">Games</NavLink>
          <NavLink to="/promotions">Promotions</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
        <Link to="/login" className="btn btn-primary">
          Login / Join
        </Link>
      </div>
    </header>
  );
}
