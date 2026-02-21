import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { getGameIcon, getGameSlug } from '../gameVisuals.js';

const BET_PRESETS = [1, 10, 100, 1000];
const MULTIPLIERS = [1, 5, 10, 20, 50, 100];

export default function PlayGame() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [choice, setChoice] = useState('red');
  const [cashoutAt, setCashoutAt] = useState(1.5);
  const [targetMultiplier, setTargetMultiplier] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [period, setPeriod] = useState(() => Math.floor(Date.now() / 30));
  const [roundResults, setRoundResults] = useState([]);
  const [showBetModal, setShowBetModal] = useState(false);
  const [pendingBet, setPendingBet] = useState(null);
  const [liveNumber, setLiveNumber] = useState(() => Math.floor(Math.random() * 10));
  const [winPopup, setWinPopup] = useState(null);

  const settledPeriodRef = useRef(null);

  useEffect(() => {
    apiFetch(`/api/games/${id}`)
      .then(setGame)
      .catch((err) => setError(err.message));
  }, [id]);

  const gameKey = useMemo(() => (game?.name || '').toLowerCase(), [game]);
  const gameSlug = useMemo(() => getGameSlug(game?.name || ''), [game]);
  const isWingoLike = gameKey === 'colour trading' || gameKey === 'big small';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          setPeriod((p) => p + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

        const number = parseNumberOutcome(res.outcome);
        if (number !== null) {
          setLiveNumber(number);
          appendRoundResult(roundPeriod, number);
        }

        if (res.won) {
          setWinPopup({ amount: res.payout });
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

        if (res.won) {
          setWinPopup({ amount: res.payout });
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

  return (
    <div className="page">
      {!game && !error && <div className="card">Loading game...</div>}
      {error && <div className="alert">{error}</div>}

      {game && (
        <div className="card play-card">
          <div className={`game-cover game-${gameSlug}`}>
            <img className="game-logo-img" src={getGameIcon(game.name)} alt={`${game.name} icon`} />
          </div>
          <h2>{game.name}</h2>
          <p>{game.shortDescription}</p>

          {isWingoLike ? (
            <WingoDesk
              gameKey={gameKey}
              countdown={countdown}
              period={period}
              choice={choice}
              setChoice={setChoice}
              roundResults={roundResults}
              pendingBet={pendingBet}
              liveNumber={liveNumber}
              isPlaying={isPlaying}
              onBet={() => setShowBetModal(true)}
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
              title="WinGo 30sec"
              choice={choice}
              onCancel={() => setShowBetModal(false)}
              onConfirm={handleConfirmBet}
            />
          )}

          {winPopup && (
            <div className="bet-modal-backdrop">
              <div className="bet-modal win-popup">
                <h3>Congratulations</h3>
                <p>You won</p>
                <strong>₹{winPopup.amount}</strong>
                <button className="btn btn-primary" onClick={() => setWinPopup(null)}>OK</button>
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
  setChoice,
  roundResults,
  pendingBet,
  liveNumber,
  isPlaying,
  onBet
}) {
  const isBigSmall = gameKey === 'big small';

  return (
    <div className="wingo-shell">
      <div className="wingo-topbar">
        <div>
          <span className="wingo-label">Period</span>
          <strong>{period}</strong>
        </div>
      </div>

      <div className={`wingo-center-timer ${countdown <= 5 ? 'danger' : ''}`}>
        {String(countdown).padStart(2, '0')}
      </div>

      <div className={`live-result num-${liveNumber} ${isPlaying ? 'spinning' : ''}`}>
        <span>Live Result</span>
        <strong>{liveNumber}</strong>
      </div>

      {pendingBet && (
        <div className="pending-bet-banner">
          Bet placed: {pendingBet.choice} • ₹{pendingBet.totalAmount} • Settles at 00s
        </div>
      )}

      {isBigSmall ? (
        <div className="wingo-colors two-cols">
          <button className={`color-btn red ${choice === 'small' ? 'active' : ''}`} onClick={() => setChoice('small')}>
            Small (0-4)
          </button>
          <button className={`color-btn green ${choice === 'big' ? 'active' : ''}`} onClick={() => setChoice('big')}>
            Big (5-9)
          </button>
        </div>
      ) : (
        <>
          <div className="wingo-colors">
            <button className={`color-btn red ${choice === 'red' ? 'active' : ''}`} onClick={() => setChoice('red')}>
              Red 2x
            </button>
            <button className={`color-btn green ${choice === 'green' ? 'active' : ''}`} onClick={() => setChoice('green')}>
              Green 2x
            </button>
            <button className={`color-btn violet ${choice === 'violet' ? 'active' : ''}`} onClick={() => setChoice('violet')}>
              Violet 4.5x
            </button>
          </div>

          <div className="wingo-numbers">
            {Array.from({ length: 10 }).map((_, number) => (
              <button
                key={number}
                className={`number-chip chip-${number} ${choice === String(number) ? 'active' : ''}`}
                onClick={() => setChoice(String(number))}
              >
                {number}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="wingo-action-row">
        <button className="btn btn-primary" onClick={onBet}>Place Bet</button>
      </div>

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
