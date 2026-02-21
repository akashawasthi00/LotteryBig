import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { getGameIcon, getGameSlug } from '../gameVisuals.js';

export default function Games() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/games')
      .then(setGames)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <section className="section-title">
        <h2>Games Lobby</h2>
        <p>Start with a quick demo round or explore new formats.</p>
      </section>

      {error && <div className="alert">{error}</div>}

      <div className="card-grid">
        {games.length === 0 && !error && (
          <div className="card">
            <h3>No games yet</h3>
            <p>Add games from the admin console to populate this page.</p>
          </div>
        )}
        {games.map((game) => (
          <div className="card game-card-simple" key={game.id}>
            <h3 className="game-name">{game.name}</h3>
            <div className={`game-tile game-${getGameSlug(game.name)}`}>
              <img className="game-tile-icon" src={getGameIcon(game.name)} alt={`${game.name} icon`} />
            </div>
            <Link className="btn btn-primary game-play-btn" to={`/play/${game.id}`}>Play</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
