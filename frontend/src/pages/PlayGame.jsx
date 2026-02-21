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
    if (!isWingoLike || countdown !== 0) {
      return;
    }

    if (settledPeriodRef.current === period) {
      return;
    }

    settledPeriodRef.current = period;

    if (pendingBet) {
      settlePendingBet(period);
      return;
    }

    settleNoBetRound(period);
  }, [countdown, isWingoLike, pendingBet, period]);

  useEffect(() => {
    if (!result) return;
    setOutcomePopup({
      won: Boolean(result.won),
      amount: result.won ? result.payout : Math.abs(result.profit ?? result.betAmount ?? 0)
    });
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

  const playRound = async (betAmount) => {
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

      }, 1200);
    } catch (err) {
      setIsPlaying(false);
      setError(err.message);
    }
  };

  const handleConfirmBet = async (totalAmount) => {
    setShowBetModal(false);

    if (isWingoLike) {
      setPendingBet({ totalAmount, choice, period });
      playTone(620, 110, 'sine', 0.04);
      return;
    }

    await playRound(totalAmount);
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

  return (
    <div className="wingo-shell">
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

      <div className="wingo-prev-box">
        <div className="wingo-prev-head">
          <span>Previous 10</span>
        </div>
        <div className="wingo-prev-table">
          <div className="wingo-prev-row header">
            <span>Period</span>
            <span>Result</span>
            <span>Color</span>
          </div>
          {roundResults.length === 0 && <div className="wingo-prev-empty">No rounds yet</div>}
          {roundResults.map((row) => (
            <div key={`${row.period}-${row.number}`} className="wingo-prev-row">
              <span>{row.period}</span>
              <span>{row.number}</span>
              <span className={`tag ${row.color}`}>{row.color}</span>
            </div>
          ))}
        </div>
      </div>
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
