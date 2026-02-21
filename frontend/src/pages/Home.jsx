import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page home">
      <section className="hero">
        <div>
          <p className="eyebrow">LotteryBig • Points-based demo platform</p>
          <h1>
            Bigger thrills. <br /> Smarter play.
          </h1>
          <p className="lead">
            Build your streak, climb the boards, and unlock daily bonuses. Designed for fast
            play, social competition, and clean, transparent rules.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/games">Play Now</Link>
            <Link className="btn btn-ghost" to="/promotions">View Promotions</Link>
          </div>
          <div className="hero-stats">
            <div>
              <strong>120K+</strong>
              <span>Community Players</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Instant Point Payouts</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Uptime Tracking</span>
            </div>
          </div>
        </div>
        <div className="hero-card">
          <h3>Daily Jackpot</h3>
          <p>Claim free points every morning and boost your streak multiplier.</p>
          <div className="jackpot">Rs 1,25,000</div>
          <span className="note">Demo credits only</span>
        </div>
      </section>

      <section className="trust">
        <div>
          <h2>Trust & Safety</h2>
          <p>
            Built with a strict wallet ledger, transparent history, and configurable limits. All
            activity is logged for admin review.
          </p>
        </div>
        <div className="trust-grid">
          <div>
            <h4>Ledger-first</h4>
            <p>Every credit or debit is stored as an immutable transaction.</p>
          </div>
          <div>
            <h4>Responsible play</h4>
            <p>Self-exclusion, session reminders, and usage analytics ready.</p>
          </div>
          <div>
            <h4>Fraud watch</h4>
            <p>Automated flags for risky patterns and manual review tools.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
