export default function ChartCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`card chart-card ${className}`}>
      <header>
        <div className="chart-heading"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        <div>{actions}</div>
      </header>
      <div className="chart-body">{children}</div>
    </section>
  );
}
