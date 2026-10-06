export default function KpiCard({ icon, label, value, hint, tone, loading }) {
  return (
    <div className={`card kpi ${tone || ""}`}>
      <span className="kpi-icon" aria-hidden="true">{icon}</span>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{loading ? "…" : value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
