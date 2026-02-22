import { Link } from 'react-router-dom';

export default function MiniGames() {
  return (
    <div className="page">
      <section className="section-title">
        <h2>Mini Games</h2>
        <p>Fast rounds, instant decisions, and quick payouts.</p>
      </section>

      <div className="card-grid">
        <div className="card crash-card">
          <div className="crash-card-icon">✈️</div>
          <h3>Crash Multiplier</h3>
          <p>Ride the multiplier and cash out before the crash.</p>
          <div className="crash-card-actions">
            <Link className="btn btn-primary" to="/minigames/crash">Play</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
