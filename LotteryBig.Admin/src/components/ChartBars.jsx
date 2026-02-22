export default function ChartBars({ title, series }) {
  const max = Math.max(...series.map((point) => point.value), 1);
  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <div className="chart">
        {series.map((point) => (
          <div key={point.date} className="chart-item">
            <div
              className="chart-bar"
              style={{ height: `${(point.value / max) * 120 + 8}px` }}
              title={`${point.date}: ${point.value}`}
            />
            <span>{point.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
