import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { getGameSlug } from '../gameVisuals.js';

const BET_PRESETS = [1, 10, 100, 1000];
const MULTIPLIERS = [1, 5, 10, 20, 50, 100];
const WINGO_MODES = [
  { id: '30s', label: 'WinGo 30 Sec', durationSec: 30 },
  { id: '1m', label: 'WinGo 1 Min', durationSec: 60 },
  { id: '3m', label: 'WinGo 3 Min', durationSec: 180 },
  { id: '5m', label: 'WinGo 5 Min', durationSec: 300 }
];

export default function PlayGame() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [choice, setChoice] = useState('red');
  const [cashoutAt, setCashoutAt] = useState(1.5);
  const [targetMultiplier, setTargetMultiplier] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState('30s');
  const [countdown, setCountdown] = useState(30);
  const [period, setPeriod] = useState(() => Math.floor(Date.now() / 30));
  const [roundResults, setRoundResults] = useState([]);
  const [showBetModal, setShowBetModal] = useState(false);
  const [pendingBet, setPendingBet] = useState(null);
  const [liveNumber, setLiveNumber] = useState(() => Math.floor(Math.random() * 10));
  const [outcomePopup, setOutcomePopup] = useState(null);
  const [walletAction, setWalletAction] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');

  const settledPeriodRef = useRef(null);
  const previousPeriodRef = useRef(null);
  const notifiedResultRef = useRef('');

  useEffect(() => {
    loadWalletBalance();
    apiFetch(`/api/games/${id}`)
      .then(setGame)
      .catch((err) => setError(err.message));
  }, [id]);

  const gameKey = useMemo(() => (game?.name || '').toLowerCase(), [game]);
  const gameSlug = useMemo(() => getGameSlug(game?.name || ''), [game]);
  const isWingoLike = gameKey === 'colour trading' || gameKey === 'big small' || gameKey === 'lottery';
  const selectedMode = useMemo(
    () => WINGO_MODES.find((x) => x.id === selectedModeId) || WINGO_MODES[0],
    [selectedModeId]
  );
  const selectedDurationSec = selectedMode.durationSec;

  const loadWalletBalance = () => {
    apiFetch('/api/wallet/balance')
      .then((wallet) => setWalletBalance(wallet.balance))
      .catch(() => {
        setWalletBalance((prev) => (prev === null ? 0 : prev));
      });
  };

  useEffect(() => {
    const syncRoundClock = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsedInRound = nowSec % selectedDurationSec;
      const remaining = (selectedDurationSec - elapsedInRound) % selectedDurationSec;
      setCountdown(remaining);
      setPeriod(Math.floor(nowSec / selectedDurationSec));
    };

    syncRoundClock();
    const timer = setInterval(syncRoundClock, 1000);

    return () => clearInterval(timer);
  }, [selectedDurationSec]);

  useEffect(() => {
    setPendingBet(null);
    settledPeriodRef.current = null;
    previousPeriodRef.current = null;
  }, [selectedModeId]);

  useEffect(() => {
    if (!isWingoLike || countdown <= 0) {
      return;
    }

    setLiveNumber(Math.floor(Math.random() * 10));

    if (countdown <= 5) {
      playTone(860, 100, 'square', 0.04);
    }
  }, [countdown, isWingoLike]);

  useEffect(() => {
    if (!isWingoLike) return;

    const prev = previousPeriodRef.current;
    previousPeriodRef.current = period;

    if (prev === null || prev === period) return;
    if (settledPeriodRef.current === prev) return;
    settledPeriodRef.current = prev;

    if (pendingBet && pendingBet.period === prev) {
      settlePendingBet(prev);
      return;
    }

    settleNoBetRound(prev);
  }, [isWingoLike, pendingBet, period]);

  useEffect(() => {
    if (!result) return;
    const resultKey = `${result.won}-${result.outcome}-${result.payout}-${result.newBalance}`;
    if (notifiedResultRef.current === resultKey) return;
    notifiedResultRef.current = resultKey;

    const amount = result.won ? result.payout : Math.abs(result.profit ?? result.betAmount ?? 0);
    setOutcomePopup({
      won: Boolean(result.won),
      amount
    });

    window.alert(
      result.won
        ? `Congratulations, you win!\nRs ${Number(amount || 0).toFixed(2)}/-`
        : `You lost.\nRs ${Number(amount || 0).toFixed(2)}/-`
    );
  }, [result]);

  const settlePendingBet = async (roundPeriod) => {
    setIsPlaying(true);
    const bet = pendingBet;

    try {
      const payload = {
        gameId: id,
        betAmount: Number(bet.totalAmount),
        choice: bet.choice,
        cashoutAt: Number(cashoutAt),
        targetMultiplier: Number(targetMultiplier)
      };

      const res = await apiFetch('/api/gameplay/play', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setTimeout(() => {
        setResult(res);
        setIsPlaying(false);
        setPendingBet(null);
        if (typeof res.newBalance === 'number') {
          setWalletBalance(res.newBalance);
        }

        const number = parseNumberOutcome(res.outcome);
        if (number !== null) {
          setLiveNumber(number);
          appendRoundResult(roundPeriod, number);
        }

        if (res.won) {
          playTone(980, 130, 'triangle', 0.05);
          setTimeout(() => playTone(1240, 160, 'triangle', 0.05), 140);
        } else {
          playTone(220, 190, 'sawtooth', 0.04);
        }
      }, 1400);
    } catch (err) {
      setIsPlaying(false);
      setPendingBet(null);
      setError(err.message);
    }
  };

  const settleNoBetRound = (roundPeriod) => {
    setIsPlaying(true);
    const number = Math.floor(Math.random() * 10);

    setTimeout(() => {
      setLiveNumber(number);
      appendRoundResult(roundPeriod, number);
      setIsPlaying(false);
    }, 900);
  };

  const appendRoundResult = (roundPeriod, number) => {
    const color = getNumberColor(number);
    setRoundResults((prev) => [{ period: roundPeriod, number, color }, ...prev].slice(0, 10));
  };

  const playRound = async (betAmount, roundPeriod = period) => {
    setError('');
    setResult(null);
    setIsPlaying(true);

    try {
      const payload = {
        gameId: id,
        betAmount: Number(betAmount),
        choice,
        cashoutAt: Number(cashoutAt),
        targetMultiplier: Number(targetMultiplier)
      };

      const res = await apiFetch('/api/gameplay/play', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setTimeout(() => {
        setResult(res);
        setIsPlaying(false);
        if (typeof res.newBalance === 'number') {
          setWalletBalance(res.newBalance);
        }

        if (isWingoLike) {
          const number = parseNumberOutcome(res.outcome);
          if (number !== null) {
            setLiveNumber(number);
            appendRoundResult(roundPeriod, number);
          }
        }

      }, 1200);
    } catch (err) {
      setIsPlaying(false);
      setError(err.message);
    }
  };

  const handleConfirmBet = async (totalAmount) => {
    setShowBetModal(false);
    playTone(620, 110, 'sine', 0.04);
    await playRound(totalAmount, period);
  };

  const handleQuickChoice = (nextChoice) => {
    setChoice(nextChoice);
    setShowBetModal(true);
  };

  const submitWalletAction = async () => {
    if (!walletAction) {
      return;
    }

    setError('');
    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    try {
      await apiFetch(`/api/wallet/${walletAction}`, {
        method: 'POST',
        body: JSON.stringify({ amount, reference: `play-${gameSlug || 'game'}` })
      });
      setWalletAction(null);
      setWalletAmount('');
      loadWalletBalance();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      {!game && !error && <div className="card">Loading game...</div>}
      {error && <div className="alert">{error}</div>}

      {game && (
        <div className="card play-card">
          <div className="wallet-top-actions">
            <div className="wallet-top-balance">
              <div className="wallet-amount-row">
                <strong>{walletBalance === null ? '--' : `Rs ${walletBalance.toFixed(2)}`}</strong>
                <button
                  type="button"
                  className="wallet-refresh-btn"
                  onClick={loadWalletBalance}
                  aria-label="Refresh balance"
                >
                  ↻
                </button>
              </div>
              <div className="wallet-label-row">
                <span className="wallet-badge-icon">💼</span>
                <span>Wallet balance</span>
              </div>
            </div>
            <div className="wallet-top-buttons">
              <button className="wallet-action-btn wallet-withdraw-btn" onClick={() => setWalletAction('withdraw')}>Withdraw</button>
              <button className="wallet-action-btn wallet-deposit-btn" onClick={() => setWalletAction('topup')}>Deposit</button>
            </div>
          </div>

          <h2>{game.name}</h2>
          <p>{game.shortDescription}</p>

          {isWingoLike ? (
            <WingoDesk
              gameKey={gameKey}
              countdown={countdown}
              period={period}
              choice={choice}
              onSelectChoice={handleQuickChoice}
              modes={WINGO_MODES}
              selectedModeId={selectedModeId}
              onSelectMode={setSelectedModeId}
              roundResults={roundResults}
              pendingBet={pendingBet}
              liveNumber={liveNumber}
              isPlaying={isPlaying}
            />
          ) : (
            <StandardGameDesk
              gameKey={gameKey}
              gameSlug={gameSlug}
              choice={choice}
              cashoutAt={cashoutAt}
              targetMultiplier={targetMultiplier}
              isPlaying={isPlaying}
              setCashoutAt={setCashoutAt}
              setTargetMultiplier={setTargetMultiplier}
              onPlay={playRound}
            />
          )}

          {result && (
            <div className={result.won ? 'success' : 'alert'} style={{ marginTop: '16px' }}>
              <p>{result.won ? 'You won this round.' : 'You lost this round.'}</p>
              <p>Outcome: {result.outcome}</p>
              <p>Multiplier: {result.multiplier}x</p>
              <p>Payout: Rs {result.payout}</p>
              <p>Profit: Rs {result.profit}</p>
              <p>New Balance: Rs {result.newBalance}</p>
            </div>
          )}

          {showBetModal && (
            <BetModal
              title={selectedMode.label}
              choice={choice}
              onCancel={() => setShowBetModal(false)}
              onConfirm={handleConfirmBet}
            />
          )}

          {walletAction && (
            <div className="bet-modal-backdrop">
              <div className="bet-modal">
                <h3>{walletAction === 'topup' ? 'Deposit' : 'Withdraw'}</h3>
                <p className="bet-selected">Game: {game.name}</p>
                <div className="bet-section">
                  <label>Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="bet-bottom-bar">
                  <span>Reference: play-{gameSlug || 'game'}</span>
                  <div className="bet-actions">
                    <button className="btn btn-ghost" onClick={() => setWalletAction(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={submitWalletAction}>
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {outcomePopup && (
            <div className="bet-modal-backdrop">
              <div className={`bet-modal win-popup ${outcomePopup.won ? 'win' : 'loss'}`}>
                {outcomePopup.won ? (
                  <>
                    <h3>Congratulations, you win</h3>
                    <strong>Rs {Number(outcomePopup.amount || 0).toFixed(2)}/-</strong>
                  </>
                ) : (
                  <>
                    <h3>You lost</h3>
                    <strong>Rs {Number(outcomePopup.amount || 0).toFixed(2)}/-</strong>
                  </>
                )}
                <button className="btn btn-primary" onClick={() => setOutcomePopup(null)}>OK</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StandardGameDesk({
  gameKey,
  gameSlug,
  choice,
  cashoutAt,
  targetMultiplier,
  isPlaying,
  setCashoutAt,
  setTargetMultiplier,
  onPlay
}) {
  const [betAmount, setBetAmount] = useState(100);

  return (
    <>
      <div className={`game-stage game-stage-${gameSlug} ${isPlaying ? 'playing' : ''}`}>
        <GameStage keyName={gameKey} choice={choice} cashoutAt={cashoutAt} targetMultiplier={targetMultiplier} />
        <div className="game-stage-overlay">
          {isPlaying ? 'Round Running...' : 'Ready'}
        </div>
      </div>

      <div className="play-controls">
        <div>
          <label>Bet Amount (Rs)</label>
          <input
            type="number"
            value={betAmount}
            min="10"
            onChange={(e) => setBetAmount(e.target.value)}
          />
        </div>

        {gameKey === 'aviator' && (
          <div>
            <label>Cashout At (x)</label>
            <input
              type="number"
              step="0.01"
              value={cashoutAt}
              min="1.01"
              max="20"
              onChange={(e) => setCashoutAt(e.target.value)}
            />
          </div>
        )}

        {gameKey === 'limbo' && (
          <div>
            <label>Target Multiplier (x)</label>
            <input
              type="number"
              step="0.01"
              value={targetMultiplier}
              min="1.1"
              max="20"
              onChange={(e) => setTargetMultiplier(e.target.value)}
            />
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={() => onPlay(betAmount)} disabled={isPlaying}>
        {isPlaying ? 'Playing...' : 'Play Round'}
      </button>
    </>
  );
}

function WingoDesk({
  gameKey,
  countdown,
  period,
  choice,
  onSelectChoice,
  modes,
  selectedModeId,
  onSelectMode,
  roundResults,
  pendingBet,
  liveNumber,
  isPlaying
}) {
  const isBigSmall = gameKey === 'big small';
  const isLottery = gameKey === 'lottery';
  const wingoThemeClass = `wingo-${getGameSlug(gameKey)}`;

  return (
    <div className={`wingo-shell ${wingoThemeClass}`}>
      <div className="wingo-mode-strip">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`wingo-mode-btn ${selectedModeId === mode.id ? 'active' : ''}`}
            onClick={() => onSelectMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="wingo-topbar">
        <div>
          <span className="wingo-label">Period</span>
          <strong>{period}</strong>
        </div>
      </div>

      <div className={`wingo-center-timer ${countdown <= 5 ? 'danger' : ''}`}>
        {formatCountdown(countdown)}
      </div>

      <div className={`live-result num-${liveNumber} ${isPlaying ? 'spinning' : ''}`}>
        <span>Live Result</span>
        <strong>{liveNumber}</strong>
      </div>

      {pendingBet && (
        <div className="pending-bet-banner">
          Bet placed: {pendingBet.choice} • ₹{pendingBet.totalAmount} • Settles at 00:00
        </div>
      )}

      {isLottery ? (
        <>
          <div className="wingo-colors two-cols">
            <button className={`color-btn red ${choice === 'small' ? 'active' : ''}`} onClick={() => onSelectChoice('small')}>
              Small (0-4)
            </button>
            <button className={`color-btn green ${choice === 'big' ? 'active' : ''}`} onClick={() => onSelectChoice('big')}>
              Big (5-9)
            </button>
          </div>
          <div className="wingo-colors">
            <button className={`color-btn red ${choice === 'red' ? 'active' : ''}`} onClick={() => onSelectChoice('red')}>
              Red 2x
            </button>
            <button className={`color-btn green ${choice === 'green' ? 'active' : ''}`} onClick={() => onSelectChoice('green')}>
              Green 2x
            </button>
            <button className={`color-btn violet ${choice === 'violet' ? 'active' : ''}`} onClick={() => onSelectChoice('violet')}>
              Violet 4.5x
            </button>
          </div>
          <div className="wingo-numbers">
            {Array.from({ length: 10 }).map((_, number) => (
              <button
                key={number}
                className={`number-chip chip-${number} ${choice === String(number) ? 'active' : ''}`}
                onClick={() => onSelectChoice(String(number))}
              >
                {number}
              </button>
            ))}
          </div>
        </>
      ) : isBigSmall ? (
        <div className="wingo-colors two-cols">
          <button className={`color-btn red ${choice === 'small' ? 'active' : ''}`} onClick={() => onSelectChoice('small')}>
            Small (0-4)
          </button>
          <button className={`color-btn green ${choice === 'big' ? 'active' : ''}`} onClick={() => onSelectChoice('big')}>
            Big (5-9)
          </button>
        </div>
      ) : (
        <>
          <div className="wingo-colors">
            <button className={`color-btn red ${choice === 'red' ? 'active' : ''}`} onClick={() => onSelectChoice('red')}>
              Red 2x
            </button>
            <button className={`color-btn green ${choice === 'green' ? 'active' : ''}`} onClick={() => onSelectChoice('green')}>
              Green 2x
            </button>
            <button className={`color-btn violet ${choice === 'violet' ? 'active' : ''}`} onClick={() => onSelectChoice('violet')}>
              Violet 4.5x
            </button>
          </div>

          <div className="wingo-numbers">
            {Array.from({ length: 10 }).map((_, number) => (
              <button
                key={number}
                className={`number-chip chip-${number} ${choice === String(number) ? 'active' : ''}`}
                onClick={() => onSelectChoice(String(number))}
              >
                {number}
              </button>
            ))}
          </div>
        </>
      )}

      <WingoHistoryPanel roundResults={roundResults} />
    </div>
  );
}

function WingoHistoryPanel({ roundResults }) {
  const [activeTab, setActiveTab] = useState('history');
  const chartRows = roundResults.slice(0, 20);
  const chartStats = buildChartStats(roundResults);

  return (
    <div className="wingo-history-panel">
      <div className="wingo-history-tabs">
        <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          Game history
        </button>
        <button type="button" className={activeTab === 'chart' ? 'active' : ''} onClick={() => setActiveTab('chart')}>
          Chart
        </button>
        <button type="button" className={activeTab === 'follow' ? 'active' : ''} onClick={() => setActiveTab('follow')}>
          Follow Strategy
        </button>
      </div>

      {activeTab === 'history' && (
        <>
          <div className="wingo-history-card">
            <div className="wingo-history-head">
              <span>Period</span>
              <span>Number</span>
              <span>Big Small</span>
              <span>Color</span>
            </div>

            {roundResults.length === 0 && (
              <div className="wingo-history-empty">No game history yet</div>
            )}

            {roundResults.map((row) => {
              const sizeLabel = row.number >= 5 ? 'Big' : 'Small';
              const dotColors = getHistoryDotColors(row.number);
              return (
                <div key={`${row.period}-${row.number}`} className="wingo-history-row">
                  <span className="period">{row.period}</span>
                  <span className={`number ${getHistoryNumberClass(row.number)}`}>{row.number}</span>
                  <span className="size">{sizeLabel}</span>
                  <span className="dot-cell">
                    {dotColors.map((dot) => (
                      <span key={`${row.period}-${row.number}-${dot}`} className={`dot ${dot}`} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="wingo-history-footer">
            <button type="button" className="pager-btn muted">{'<'}</button>
            <span>1/50</span>
            <button type="button" className="pager-btn active">{'>'}</button>
          </div>
        </>
      )}

      {activeTab === 'chart' && (
        <div className="wingo-chart-card">
          <div className="wingo-chart-head">
            <span>Period</span>
            <span>Number</span>
          </div>

          <div className="wingo-chart-stats">
            <div className="wingo-chart-stat-row">
              <span>Statistic</span>
              <span>(last 100 Periods)</span>
            </div>
            <div className="wingo-chart-stat-row">
              <span>Winning Numbers</span>
              <span className="num-track">
                {Array.from({ length: 10 }).map((_, n) => (
                  <span key={`wn-${n}`} className="num-dot red-outline">{n}</span>
                ))}
              </span>
            </div>
            <div className="wingo-chart-stat-row">
              <span>Missing</span>
              <span className="num-track text">
                {chartStats.missing.map((x, i) => <span key={`ms-${i}`}>{x}</span>)}
              </span>
            </div>
            <div className="wingo-chart-stat-row">
              <span>Avg missing</span>
              <span className="num-track text">
                {chartStats.avgMissing.map((x, i) => <span key={`am-${i}`}>{x}</span>)}
              </span>
            </div>
            <div className="wingo-chart-stat-row">
              <span>Frequency</span>
              <span className="num-track text">
                {chartStats.frequency.map((x, i) => <span key={`fq-${i}`}>{x}</span>)}
              </span>
            </div>
            <div className="wingo-chart-stat-row">
              <span>Max consecutive</span>
              <span className="num-track text">
                {chartStats.maxConsecutive.map((x, i) => <span key={`mc-${i}`}>{x}</span>)}
              </span>
            </div>
          </div>

          {chartRows.map((row) => (
            <div key={`cr-${row.period}-${row.number}`} className="wingo-chart-row">
              <span className="period">{row.period}</span>
              <span className="num-track">
                {Array.from({ length: 10 }).map((_, n) => (
                  <span
                    key={`${row.period}-${n}`}
                    className={`num-dot ${n === row.number ? `hit ${getHistoryNumberClass(row.number)}` : 'muted'}`}
                  >
                    {n}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'follow' && (
        <div className="wingo-history-card">
          <div className="wingo-history-empty">Follow Strategy will be available in next update.</div>
        </div>
      )}
    </div>
  );
}

function BetModal({ title, choice, onCancel, onConfirm }) {
  const [unitAmount, setUnitAmount] = useState(10);
  const [quantity, setQuantity] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [agreed, setAgreed] = useState(true);

  const totalAmount = unitAmount * quantity * multiplier;

  return (
    <div className="bet-modal-backdrop">
      <div className="bet-modal">
        <h3>{title}</h3>
        <p className="bet-selected">Selected: {choice}</p>

        <div className="bet-section">
          <label>Balance</label>
          <div className="chip-row">
            {BET_PRESETS.map((x) => (
              <button
                key={x}
                className={`mini-chip ${unitAmount === x ? 'active' : ''}`}
                onClick={() => setUnitAmount(x)}
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="bet-section">
          <label>Quantity</label>
          <div className="qty-box">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)}>+</button>
          </div>
        </div>

        <div className="bet-section">
          <label>Multiplier</label>
          <div className="chip-row">
            {MULTIPLIERS.map((x) => (
              <button
                key={x}
                className={`mini-chip ${multiplier === x ? 'active' : ''}`}
                onClick={() => setMultiplier(x)}
              >
                X{x}
              </button>
            ))}
          </div>
        </div>

        <label className="agree-row">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          I agree Pre-sale rules
        </label>

        <div className="bet-bottom-bar">
          <span>Total amount ₹{totalAmount}</span>
          <div className="bet-actions">
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" disabled={!agreed} onClick={() => onConfirm(totalAmount)}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseNumberOutcome(outcome) {
  const match = /Result number:\s*(\d+)/i.exec(outcome || '');
  if (!match) return null;
  return Number(match[1]);
}

function formatCountdown(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getNumberColor(number) {
  if (number === 0 || number === 5) return 'violet';
  return number % 2 === 0 ? 'red' : 'green';
}

function getHistoryDotColors(number) {
  const colors = [];
  colors.push(number % 2 === 0 ? 'red' : 'green');
  if (number === 0 || number === 5) {
    colors.push('violet');
  }
  return colors;
}

function getHistoryNumberClass(number) {
  if (number === 0 || number === 5) return 'violet-mix';
  return number % 2 === 0 ? 'red' : 'green';
}

function buildChartStats(roundResults) {
  const data = roundResults.slice(0, 100).map((x) => x.number);
  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const frequency = numbers.map((n) => data.filter((x) => x === n).length);

  const missing = numbers.map((n) => {
    const idx = data.findIndex((x) => x === n);
    return idx === -1 ? data.length : idx;
  });

  const avgMissing = numbers.map((n) => {
    const positions = [];
    data.forEach((x, i) => {
      if (x === n) positions.push(i);
    });
    if (positions.length < 2) return missing[n];
    const gaps = [];
    for (let i = 1; i < positions.length; i += 1) {
      gaps.push(Math.max(0, positions[i] - positions[i - 1] - 1));
    }
    const sum = gaps.reduce((a, b) => a + b, 0);
    return Math.round(sum / gaps.length);
  });

  const maxConsecutive = numbers.map((n) => {
    let best = 0;
    let current = 0;
    data.forEach((x) => {
      if (x === n) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });
    return best;
  });

  return { frequency, missing, avgMissing, maxConsecutive };
}

function GameStage({ keyName, choice, cashoutAt, targetMultiplier }) {
  if (keyName === 'aviator') {
    return (
      <div className="stage-aviator">
        <div className="aviator-curve" />
        <div className="aviator-plane">JET</div>
        <div className="aviator-multiplier">Target: {cashoutAt}x</div>
      </div>
    );
  }

  if (keyName === 'poker') {
    return (
      <div className="stage-poker">
        <div className="card-stack c1">A</div>
        <div className="card-stack c2">K</div>
        <div className="card-stack c3">10</div>
      </div>
    );
  }

  if (keyName === 'ludo') {
    return (
      <div className="stage-ludo">
        <div className="ludo-grid" />
        <div className="ludo-token r" />
        <div className="ludo-token b" />
        <div className="ludo-token g" />
        <div className="ludo-token y" />
      </div>
    );
  }

  if (keyName === 'boom') {
    return (
      <div className="stage-boom">
        <div className="boom-core">BOOM</div>
        <div className="boom-ring" />
      </div>
    );
  }

  if (keyName === 'vortex') {
    return (
      <div className="stage-vortex">
        <div className="vortex-ring one" />
        <div className="vortex-ring two" />
        <div className="vortex-ring three" />
      </div>
    );
  }

  if (keyName === 'limbo') {
    return (
      <div className="stage-limbo">
        <div className="limbo-bar">
          <div className="limbo-progress" />
        </div>
        <div className="limbo-target">Target: {targetMultiplier}x</div>
      </div>
    );
  }

  return <div className="stage-default">Game Round</div>;
}

function playTone(frequency, durationMs, type = 'sine', gain = 0.03) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      context.close();
    }, durationMs);
  } catch {
    // Ignore audio failures on restricted browsers.
  }
}
