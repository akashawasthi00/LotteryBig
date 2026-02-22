import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ChartBars from '../components/ChartBars.jsx';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [crashSummary, setCrashSummary] = useState(null);
  const [crashRounds, setCrashRounds] = useState([]);
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [game, setGame] = useState({ name: '', shortDescription: '', bannerUrl: '', status: 'Active', sortOrder: 0, categoryId: '' });
  const [adjust, setAdjust] = useState({ userId: '', amount: 0, reason: 'Manual adjustment' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [userData, summaryData, dashboardData, auditData] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/reports/summary'),
        apiFetch('/api/admin/reports/dashboard'),
        apiFetch('/api/admin/audit')
      ]);
      setUsers(userData);
      setSummary(summaryData);
      setDashboard(dashboardData);
      setAuditLogs(auditData);
      const [crashSummaryData, crashRoundsData] = await Promise.all([
        apiFetch('/api/admin/crash/summary'),
        apiFetch('/api/admin/crash/rounds')
      ]);
      setCrashSummary(crashSummaryData);
      setCrashRounds(crashRoundsData);
      const allGames = await apiFetch('/api/admin/games');
      setGames(allGames);
      const categoryData = await apiFetch('/api/categories');
      setCategories(categoryData);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitGame = async () => {
    setMessage('');
    setError('');
    if (!game.categoryId) {
      setError('Select a category before saving the game.');
      return;
    }
    try {
      await apiFetch('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify(game)
      });
      setMessage('Game added.');
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCrashGame = async () => {
    setMessage('');
    setError('');
    const crashGame = games.find((g) => g.name === 'Crash Multiplier');
    if (!crashGame) {
      setError('Crash Multiplier game not found.');
      return;
    }

    const nextStatus = crashGame.status === 'Active' ? 'Hidden' : 'Active';
    try {
      await apiFetch(`/api/admin/games/${crashGame.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: crashGame.name,
          shortDescription: crashGame.shortDescription,
          bannerUrl: crashGame.bannerUrl,
          categoryId: crashGame.categoryId,
          status: nextStatus,
          sortOrder: crashGame.sortOrder
        })
      });
      setMessage(`Crash game ${nextStatus === 'Active' ? 'enabled' : 'disabled'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const adjustWallet = async () => {
    setMessage('');
    setError('');
    try {
      await apiFetch('/api/admin/wallet/adjust', {
        method: 'POST',
        body: JSON.stringify({ ...adjust, amount: Number(adjust.amount) })
      });
      setMessage('Wallet updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  const banUser = async (id) => {
    await apiFetch(`/api/admin/users/${id}/ban`, { method: 'POST' });
    load();
  };

  const unbanUser = async (id) => {
    await apiFetch(`/api/admin/users/${id}/unban`, { method: 'POST' });
    load();
  };

  return (
    <div className="page">
      <section className="section-title">
        <h2>Admin Console</h2>
        <p>Manage users, games, and platform health.</p>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      {summary && (
        <div className="card-grid">
          <div className="card">
            <h3>Total Users</h3>
            <p>{summary.totalUsers}</p>
          </div>
          <div className="card">
            <h3>Active Users</h3>
            <p>{summary.activeUsers}</p>
          </div>
          <div className="card">
            <h3>Total Points</h3>
            <p>{summary.totalPointsIssued}</p>
          </div>
          <div className="card">
            <h3>Transactions</h3>
            <p>{summary.transactionsCount}</p>
          </div>
        </div>
      )}

      {dashboard && (
        <div className="card-grid">
          <ChartBars title="Daily Signups" series={dashboard.dailySignups} />
          <ChartBars title="Daily Active Users" series={dashboard.dailyActiveUsers} />
          <ChartBars title="Point Topups" series={dashboard.pointTopups} />
          <ChartBars title="Withdrawals" series={dashboard.withdrawals} />
          <ChartBars title="Wallet Balance Buckets" series={dashboard.walletBalanceBuckets} />
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <h3>Add Game</h3>
          <select
            value={game.categoryId}
            onChange={(e) => setGame({ ...game, categoryId: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Name"
            value={game.name}
            onChange={(e) => setGame({ ...game, name: e.target.value })}
          />
          <input
            placeholder="Short description"
            value={game.shortDescription}
            onChange={(e) => setGame({ ...game, shortDescription: e.target.value })}
          />
          <input
            placeholder="Banner URL"
            value={game.bannerUrl}
            onChange={(e) => setGame({ ...game, bannerUrl: e.target.value })}
          />
          <input
            placeholder="Sort order"
            type="number"
            value={game.sortOrder}
            onChange={(e) => setGame({ ...game, sortOrder: Number(e.target.value) })}
          />
          <button className="btn btn-primary" onClick={submitGame}>
            Save Game
          </button>
        </div>

        <div className="card">
          <h3>Adjust Wallet</h3>
          <input
            placeholder="User ID"
            value={adjust.userId}
            onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })}
          />
          <input
            placeholder="Amount (+/-)"
            type="number"
            value={adjust.amount}
            onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })}
          />
          <input
            placeholder="Reason"
            value={adjust.reason}
            onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
          />
          <button className="btn btn-ghost" onClick={adjustWallet}>
            Apply
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Recent Users</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>Email</span>
            <span>Phone</span>
            <span>Status</span>
            <span>Balance</span>
            <span>Actions</span>
          </div>
          {users.map((user) => (
            <div className="table-row" key={user.id}>
              <span>{user.email || '-'}</span>
              <span>{user.phone || '-'}</span>
              <span>{user.status}</span>
              <span>{user.balance}</span>
              <span>
                {user.status === 'Banned' ? (
                  <button className="btn btn-ghost" onClick={() => unbanUser(user.id)}>
                    Unban
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => banUser(user.id)}>
                    Ban
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Audit Trail</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>Action</span>
            <span>Summary</span>
            <span>Time</span>
          </div>
          {auditLogs.map((log) => (
            <div className="table-row" key={log.id}>
              <span>{log.action}</span>
              <span>{log.summary}</span>
              <span>{new Date(log.createdAtUtc).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {crashSummary && (
        <div className="card">
          <h3>Crash Game Summary</h3>
          <div className="card-grid">
            <div className="card">
              <h4>Total Wagered</h4>
              <p>{crashSummary.totalWagered}</p>
            </div>
            <div className="card">
              <h4>Total Paid</h4>
              <p>{crashSummary.totalPaid}</p>
            </div>
            <div className="card">
              <h4>Profit / Loss</h4>
              <p>{crashSummary.profit}</p>
            </div>
            <div className="card">
              <h4>Crash Game Status</h4>
              <p>{games.find((g) => g.name === 'Crash Multiplier')?.status || 'Unknown'}</p>
              <button className="btn btn-ghost" onClick={toggleCrashGame}>
                Toggle
              </button>
            </div>
          </div>
        </div>
      )}

      {crashRounds.length > 0 && (
        <div className="card">
          <h3>Crash Round History</h3>
          <div className="table">
            <div className="table-row table-head">
              <span>Round</span>
              <span>Crash</span>
              <span>Bets</span>
              <span>Wagered</span>
              <span>Paid</span>
              <span>Ended</span>
            </div>
            {crashRounds.map((round) => (
              <div className="table-row" key={round.roundId}>
                <span>#{round.roundNumber}</span>
                <span>{round.crashMultiplier.toFixed(2)}x</span>
                <span>{round.betsCount}</span>
                <span>{round.totalWagered}</span>
                <span>{round.totalPaid}</span>
                <span>{round.endedAtUtc ? new Date(round.endedAtUtc).toLocaleString() : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
