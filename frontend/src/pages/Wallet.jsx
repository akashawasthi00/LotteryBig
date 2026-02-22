import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const load = () => {
    apiFetch('/api/wallet/balance')
      .then(setBalance)
      .catch((err) => setError(err.message));

    apiFetch('/api/wallet/transactions')
      .then(setTransactions)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const submitWithdraw = async () => {
    setError('');
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    try {
      await apiFetch('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, reference: 'web' })
      });
      setShowWithdraw(false);
      setWithdrawAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Razorpay SDK failed to load.'));
      document.body.appendChild(script);
    });

  const startRecharge = async () => {
    setError('');
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setIsPaying(true);
    try {
      await loadRazorpay();
      const order = await apiFetch('/api/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });

      const methodConfig = {
        upi: paymentMethod === 'upi',
        card: paymentMethod === 'card',
        netbanking: paymentMethod === 'netbanking',
        wallet: paymentMethod === 'wallet'
      };

      const options = {
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'LotteryBig',
        description: 'Wallet recharge',
        order_id: order.orderId,
        method: methodConfig,
        handler: async (response) => {
          try {
            await apiFetch('/api/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });
            setShowRecharge(false);
            setRechargeAmount('');
            load();
          } catch (err) {
            setError(err.message);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="page">
      <section className="section-title">
        <h2>Wallet</h2>
        <p style={{ color: '#000' }}>Track points, cashouts, and activity history.</p>
      </section>

      {error && <div className="alert">{error}</div>}

      <div className="wallet-panel">
        <div>
          <h3>Balance</h3>
          <div className="balance">
            {balance ? `${balance.balance.toFixed(2)} ${balance.currency}` : '--'}
          </div>
        </div>
        <div className="wallet-actions">
          <button className="btn btn-primary" onClick={() => setShowRecharge(true)}>
            Recharge
          </button>
          <button className="btn btn-ghost" onClick={() => setShowWithdraw(true)}>
            Withdraw
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Recent Transactions</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>Type</span>
            <span>Amount</span>
            <span>Reason</span>
            <span>Time</span>
          </div>
          {transactions.map((tx) => (
            <div className="table-row" key={tx.id}>
              <span>{tx.type}</span>
              <span>{tx.amount}</span>
              <span>{tx.reason}</span>
              <span>{new Date(tx.createdAtUtc).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {showRecharge && (
        <div className="bet-modal-backdrop">
          <div className="payment-modal">
            <div className="payment-modal-head">
              <span className="step">2</span>
              <div>
                <h3>Payment</h3>
                <p>How would you like to pay?</p>
              </div>
            </div>

            <div className="payment-amount">
              <label>Amount</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>

            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                <div>
                  <span>UPI / QR</span>
                  <small>Pay using any UPI app</small>
                </div>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <div>
                  <span>Credit or Debit Card</span>
                  <small>Visa, Mastercard, Rupay</small>
                </div>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'netbanking'}
                  onChange={() => setPaymentMethod('netbanking')}
                />
                <div>
                  <span>Netbanking</span>
                  <small>All major banks</small>
                </div>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'wallet'}
                  onChange={() => setPaymentMethod('wallet')}
                />
                <div>
                  <span>Wallet</span>
                  <small>Paytm, PhonePe, etc.</small>
                </div>
              </label>
            </div>

            <div className="payment-footer">
              <button className="btn btn-ghost" onClick={() => setShowRecharge(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isPaying} onClick={startRecharge}>
                {isPaying ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="bet-modal-backdrop">
          <div className="bet-modal">
            <h3>Withdraw</h3>
            <div className="bet-section">
              <label>Amount</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="bet-bottom-bar">
              <span>Reference: web</span>
              <div className="bet-actions">
                <button className="btn btn-ghost" onClick={() => setShowWithdraw(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitWithdraw}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
