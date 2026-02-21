import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [razorpayOrder, setRazorpayOrder] = useState(null);

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

  const submit = async (type) => {
    setError('');
    try {
      await apiFetch(`/api/wallet/${type}`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), reference: 'web' })
      });
      setAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const createRazorpayOrder = async () => {
    setError('');
    try {
      const order = await apiFetch('/api/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) })
      });
      setRazorpayOrder(order);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <section className="section-title">
        <h2>Wallet</h2>
        <p>Track points, cashouts, and activity history.</p>
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
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => submit('topup')}>
            Top Up
          </button>
          <button className="btn btn-ghost" onClick={() => submit('withdraw')}>
            Withdraw
          </button>
          <button className="btn btn-ghost" onClick={createRazorpayOrder}>
            Razorpay Order
          </button>
        </div>
      </div>

      {razorpayOrder && (
        <div className="card">
          <h3>Razorpay Order Created</h3>
          <p>Order ID: {razorpayOrder.orderId}</p>
          <p>
            Amount: {razorpayOrder.amount} {razorpayOrder.currency} (Demo:{' '}
            {razorpayOrder.demoMode ? 'Yes' : 'No'})
          </p>
        </div>
      )}

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
    </div>
  );
}
