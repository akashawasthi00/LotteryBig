import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getToken } from '../api.js';

const CATEGORY_ICONS = {
  'Mini Games': '\uD83C\uDFAE',
  'Lottery': '\uD83C\uDFAB',
  'PVC': '\u2660\uFE0F',
  'Slots': '\uD83C\uDFB0',
  'Popular': '\uD83D\uDD25',
  'Fishing': '\uD83C\uDFA3',
  'Casino': '\uD83C\uDFB2',
  'Sports': '\u26BD'
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const isLoggedIn = Boolean(getToken());
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/categories')
      .then((data) => {
        setCategories(data);
        const lottery = data.find((x) => x.name.toLowerCase() === 'lottery');
        setActiveCategoryId(lottery?.id || data[0]?.id || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  function handleCategoryClick(category) {
    setActiveCategoryId(category.id);

    if (category.name.toLowerCase() === 'mini games') {
      navigate(isLoggedIn ? '/minigames' : '/login');
      return;
    }

    if (category.games?.length > 0) {
      const gameId = category.games[0].id;
      navigate(isLoggedIn ? `/play/${gameId}` : '/login');
    }
  }

  return (
    <div className="page home home-lite">
      <section className="home-top">
        <div className="home-brand">
          <div className="brand-pill">LotteryBig</div>
          <div className="home-actions">
            <button className="icon-btn" type="button"></button>
            <button className="icon-btn" type="button">{'\u2B07\uFE0F'}</button>
          </div>
        </div>

        <div className="hero-banner">
          <div className="hero-banner-inner">
            <h1>LotteryBig</h1>
            <p>Play the latest games in one place.</p>
          </div>
        </div>

        <div className="home-notice">
          <span className="notice-icon"></span>
          <p>If you experience slow performance, please ensure a stable internet connection.</p>
          <button className="btn btn-ghost notice-btn">Detail</button>
        </div>
      </section>

      <section className="category-strip">
        {error && <div className="alert">{error}</div>}
        {categories.length === 0 && !error && (
          <div className="card">
            <h3>No categories yet</h3>
            <p>Categories will appear here once they are configured by the admin.</p>
          </div>
        )}
        <div className="category-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-tile ${activeCategoryId === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
              type="button"
            >
              <div className="category-icon">
                <span>{CATEGORY_ICONS[category.name] || ''}</span>
              </div>
              <div className="category-name">{category.name}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
