export default function Promotions() {
  const promos = [
    {
      title: 'Welcome Boost',
      body: 'Deposit points and receive 25% extra demo credits.'
    },
    {
      title: 'Weekend Frenzy',
      body: 'Double streak multiplier every Saturday night.'
    },
    {
      title: 'VIP Tiers',
      body: 'Unlock bonus rooms and private tournaments.'
    }
  ];

  return (
    <div className="page">
      <section className="section-title">
        <h2>Promotions</h2>
        <p>Fresh offers to keep the momentum going.</p>
      </section>

      <div className="card-grid">
        {promos.map((promo) => (
          <div className="card" key={promo.title}>
            <h3>{promo.title}</h3>
            <p>{promo.body}</p>
            <button className="btn btn-ghost">Activate</button>
          </div>
        ))}
      </div>
    </div>
  );
}
