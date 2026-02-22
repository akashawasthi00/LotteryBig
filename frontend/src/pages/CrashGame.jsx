import { useEffect, useMemo, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { apiFetch, getToken, getUserId } from '../api.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5280';
const formatMultiplier = (value) => `${Number(value).toFixed(2)}x`;

const emptyPanel = () => ({
  amount: 10,
  autoCashout: '',
  betId: null,
  status: 'Idle',
  cashoutMultiplier: null,
  winAmount: null,
  isPlaced: false
});

export default function CrashGame() {
  const [phase, setPhase] = useState('Waiting');
  const [roundId, setRoundId] = useState('');
  const [roundNumber, setRoundNumber] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [nextRoundAt, setNextRoundAt] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [history, setHistory] = useState([]);
  const [bets, setBets] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [betPanels, setBetPanels] = useState([emptyPanel(), emptyPanel()]);
  const [planePos, setPlanePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const userId = getUserId();

  const myBets = useMemo(() => bets.filter((bet) => bet.isMine), [bets]);
  const allBets = useMemo(() => bets, [bets]);
  const topBets = useMemo(() => {
    return [...bets]
      .filter((bet) => bet.winAmount && bet.winAmount > 0)
      .sort((a, b) => b.winAmount - a.winAmount)
      .slice(0, 10);
  }, [bets]);

  useEffect(() => {
    apiFetch('/api/crash/state')
      .then((data) => {
        setPhase(data.phase);
        setRoundId(data.roundId);
        setRoundNumber(data.roundNumber || 0);
        setIsEnabled(data.isEnabled !== false);
        setMultiplier(data.multiplier);
        setNextRoundAt(data.nextRoundAtUtc ? new Date(data.nextRoundAtUtc) : null);
      })
      .catch((err) => setError(err.message));

    apiFetch('/api/crash/history')
      .then(setHistory)
      .catch((err) => setError(err.message));

    apiFetch('/api/crash/bets/current')
      .then(setBets)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/crash`, {
        accessTokenFactory: () => getToken() || ''
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('roundWaiting', (data) => {
      setPhase('Waiting');
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 0);
      setIsEnabled(true);
      setMultiplier(1.0);
      setNextRoundAt(data.nextRoundAtUtc ? new Date(data.nextRoundAtUtc) : null);
      setMessage('Place your bets before the round starts.');
      setError('');
      setBets([]);
      setBetPanels((prev) => prev.map((panel) => ({ ...panel, betId: null, status: 'Idle', cashoutMultiplier: null, winAmount: null, isPlaced: false })));
    });

    connection.on('roundStarted', (data) => {
      setPhase('InProgress');
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 0);
      setIsEnabled(true);
      setMultiplier(1.0);
      setNextRoundAt(null);
      setMessage('Round started! Cash out anytime.');
      setError('');
      pointsRef.current = [];
    });

    connection.on('multiplier', (data) => {
      setMultiplier(data.multiplier);
    });

    connection.on('betPlaced', (data) => {
      setBets((prev) => [{
        betId: data.betId,
        roundId: data.roundId,
        userLabel: data.userLabel,
        betAmount: data.betAmount,
        targetMultiplier: data.targetMultiplier,
        cashoutMultiplier: null,
        winAmount: 0,
        status: data.status,
        isMine: data.userId === userId
      }, ...prev].slice(0, 200));
    });

    connection.on('betCashedOut', (data) => {
      setBets((prev) => prev.map((bet) => {
        if (bet.betId !== data.betId) return bet;
        return {
          ...bet,
          cashoutMultiplier: data.cashoutMultiplier,
          winAmount: data.winAmount,
          status: data.status
        };
      }));

      if (data.userId === userId) {
        setBetPanels((prev) => prev.map((panel) => {
          if (panel.betId !== data.betId) return panel;
          return {
            ...panel,
            status: 'CashedOut',
            cashoutMultiplier: data.cashoutMultiplier,
            winAmount: data.winAmount
          };
        }));
      }
    });

    connection.on('roundCrashed', (data) => {
      setPhase('Crashed');
      setMultiplier(data.crashMultiplier);
      setMessage(`Crashed at ${formatMultiplier(data.crashMultiplier)}`);

      setBetPanels((prev) => prev.map((panel) => {
        if (!panel.betId || panel.status === 'CashedOut') return panel;
        return { ...panel, status: 'Lost' };
      }));

      setHistory((prev) => {
        const updated = [{ roundId: data.roundId, crashMultiplier: data.crashMultiplier, endedAtUtc: new Date().toISOString() }, ...prev];
        return updated.slice(0, 20);
      });
    });

    connection.start().catch((err) => setError(err.message));

    connection.on('gameDisabled', (data) => {
      setIsEnabled(false);
      setPhase('Disabled');
      setMessage(data?.message || 'Crash game disabled.');
    });

    return () => {
      connection.stop();
    };
  }, [userId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const points = pointsRef.current;
    if (phase === 'InProgress') {
      const lastX = points.length ? points[points.length - 1].x : 0;
      points.push({ x: lastX + 1, y: multiplier });
    }

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#201923');
    gradient.addColorStop(1, '#0b0b0d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (points.length < 2) return;

    const maxX = Math.max(points.length, 10);
    const maxY = Math.max(...points.map((p) => p.y), 2.5);

    ctx.strokeStyle = '#ff4d4f';
    ctx.lineWidth = 3;
    ctx.beginPath();

    points.forEach((point, index) => {
      const x = (point.x / maxX) * (width - 40) + 20;
      const y = height - (point.y / maxY) * (height - 40) - 20;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    const last = points[points.length - 1];
    if (last) {
      const x = (last.x / maxX) * (width - 40) + 20;
      const y = height - (last.y / maxY) * (height - 40) - 20;
      setPlanePos({ x, y });
    }
  }, [multiplier, phase]);

  const placeBet = async (index) => {
    setError('');
    setMessage('');
    const panel = betPanels[index];
    try {
      const res = await apiFetch('/api/crash/bet', {
        method: 'POST',
        body: JSON.stringify({
          betAmount: Number(panel.amount),
          autoCashoutMultiplier: panel.autoCashout ? Number(panel.autoCashout) : null
        })
      });

      setBetPanels((prev) => prev.map((p, idx) => idx === index ? {
        ...p,
        betId: res.betId,
        status: res.status,
        isPlaced: true
      } : p));

      setMessage('Bet placed.');
    } catch (err) {
      setError(err.message);
    }
  };

  const cashout = async (index) => {
    setError('');
    setMessage('');
    const panel = betPanels[index];
    if (!panel.betId) return;
    try {
      const res = await apiFetch('/api/crash/cashout', {
        method: 'POST',
        body: JSON.stringify({ betId: panel.betId })
      });
      setBetPanels((prev) => prev.map((p, idx) => idx === index ? {
        ...p,
        status: 'CashedOut',
        cashoutMultiplier: res.cashoutMultiplier,
        winAmount: res.winAmount
      } : p));
      setMessage(`Cashed out at ${formatMultiplier(res.cashoutMultiplier)} for ₹${res.winAmount}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePanel = (index, patch) => {
    setBetPanels((prev) => prev.map((panel, idx) => idx === index ? { ...panel, ...patch } : panel));
  };

  const historyClass = (value) => {
    if (value >= 10) return 'history-chip hot';
    if (value >= 2) return 'history-chip warm';
    return 'history-chip cool';
  };

  const renderBetList = (list) => (
    <div className="aviator-table">
      <div className="aviator-row aviator-head">
        <span>User</span>
        <span>Bet INR</span>
        <span>X</span>
        <span>Cash out INR</span>
      </div>
      {list.map((bet) => (
        <div className={`aviator-row ${bet.isMine ? 'mine' : ''}`} key={bet.betId}>
          <span>{bet.userLabel}</span>
          <span>{bet.betAmount.toFixed(2)}</span>
          <span>{bet.cashoutMultiplier ? formatMultiplier(bet.cashoutMultiplier) : '--'}</span>
          <span>{bet.winAmount ? bet.winAmount.toFixed(2) : '--'}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page aviator-page">
      <section className="aviator-strip">
        <div className="aviator-brand">
          <span className="aviator-logo">Aviator</span>
          <button className="aviator-help">How to play?</button>
        </div>
        <div className="aviator-history">
          {history.map((item) => (
            <span key={item.roundId} className={historyClass(item.crashMultiplier)}>
              {formatMultiplier(item.crashMultiplier)}
            </span>
          ))}
        </div>
        <div className="aviator-meta">
          <span className="aviator-balance">0 INR</span>
          <span className="aviator-menu">≡</span>
        </div>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="aviator-layout">
        <aside className="aviator-bets">
          <div className="aviator-tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')} type="button">All Bets</button>
            <button className={activeTab === 'mine' ? 'active' : ''} onClick={() => setActiveTab('mine')} type="button">My Bets</button>
            <button className={activeTab === 'top' ? 'active' : ''} onClick={() => setActiveTab('top')} type="button">Top</button>
          </div>

          <div className="aviator-bets-count">
            <div>
              <strong>{activeTab === 'all' ? allBets.length : activeTab === 'mine' ? myBets.length : topBets.length}</strong>
              <span>{activeTab === 'all' ? 'ALL BETS' : activeTab === 'mine' ? 'MY BETS' : 'TOP'}</span>
            </div>
          </div>

          {activeTab === 'all' && renderBetList(allBets)}
          {activeTab === 'mine' && renderBetList(myBets)}
          {activeTab === 'top' && renderBetList(topBets)}
        </aside>

        <section className="aviator-stage">
          <div className="aviator-partner">
            <div className="partner-title">UFC | Aviator</div>
            <div className="partner-sub">OFFICIAL PARTNERS</div>
            <div className="partner-badge">SPRIBE • Official Game</div>
          </div>
          <div className={`aviator-multiplier ${phase === 'Crashed' ? 'crashed' : ''}`}>
            {formatMultiplier(multiplier)}
          </div>
          <div className="aviator-round">Round ID: {roundNumber || '--'}</div>
          <canvas ref={canvasRef} width="920" height="420" className="aviator-canvas"></canvas>
          <div
            className={`aviator-plane ${phase !== 'InProgress' ? 'hidden' : ''}`}
            style={{ transform: `translate(${planePos.x}px, ${planePos.y}px)` }}
          >
            ✈
          </div>
          <div className="aviator-phase">{phase}</div>
          {nextRoundAt && (
            <div className="aviator-countdown">
              Next round at {nextRoundAt.toLocaleTimeString()}
            </div>
          )}
          {!isEnabled && (
            <div className="aviator-disabled">
              Game is disabled by admin.
            </div>
          )}
        </section>
      </div>

      <section className="aviator-bet-panels">
        {betPanels.map((panel, index) => (
          <div className="aviator-panel" key={index}>
            <div className="aviator-panel-tabs">
              <button className="active" type="button">Bet</button>
              <button type="button">Auto</button>
            </div>
            <div className="aviator-panel-inputs">
              <label>Bet Amount</label>
              <div className="aviator-input-row">
                <input
                  type="number"
                  min="1"
                  value={panel.amount}
                  onChange={(e) => updatePanel(index, { amount: e.target.value })}
                  disabled={panel.isPlaced}
                />
              </div>
              <label>Auto Cashout</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 2.00"
                value={panel.autoCashout}
                onChange={(e) => updatePanel(index, { autoCashout: e.target.value })}
                disabled={panel.isPlaced}
              />
            </div>
            <div className="aviator-panel-status">
              <span>Status</span>
              <strong>{panel.status}</strong>
            </div>
            <div className="aviator-panel-actions">
              <button
                className="btn btn-primary"
                onClick={() => placeBet(index)}
                disabled={!isEnabled || phase !== 'Waiting' || panel.isPlaced}
              >
                Bet {Number(panel.amount || 0).toFixed(2)} INR
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => cashout(index)}
                disabled={!isEnabled || phase !== 'InProgress' || !panel.isPlaced || panel.status === 'CashedOut'}
              >
                Cash Out
              </button>
            </div>
            {panel.cashoutMultiplier && (
              <div className="aviator-panel-win">
                Cashed at {formatMultiplier(panel.cashoutMultiplier)} • ₹{panel.winAmount}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
