import { formatMoney } from "./api";
import ChartCard from "./components/ChartCard";
import { CategoryChart, CurrentVisitsChart, DeliveryChart, RevenueTrend, WebsiteVisitsChart } from "./components/Charts";
import DrillDown from "./components/DrillDown";
import Filters from "./components/Filters";
import KpiCard from "./components/KpiCard";
import OrdersTable from "./components/OrdersTable";
import { Async } from "./components/Status";
import Toggle from "./components/Toggle";
import { useFetch } from "./hooks/useFetch";
import { apiParams, useFilters } from "./state/FilterContext";

export default function App() {
  const { filters, setFilters } = useFilters();
  const summary = useFetch("/analytics/summary", { ...apiParams(filters), granularity: filters.granularity });
  const { loading, data, meta } = summary;
  const k = data?.kpis;
  const empty = (d) => !d?.kpis.total_orders;
  const issues = Object.values(data?.data_quality || {}).flat();
  const today = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(new Date());
  const metricToggle = (
    <Toggle value={filters.metric} onChange={(metric) => setFilters({ metric })} options={[["revenue", "Revenue"], ["orders", "Orders"]]} />
  );

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="Order Analytics dashboard">
          <span className="brand-mark" aria-hidden="true">oa</span>
          <span className="brand-name">Order Analytics</span>
        </a>
        <div className="workspace-card">
          <span className="workspace-avatar">OA</span>
          <span><strong>Order Operations</strong><small>Analytics workspace</small></span>
          <span className="workspace-chevron">⌄</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <a className="active" href="#dashboard"><span className="nav-mark">▦</span>Dashboard</a>
          <a href="#analytics"><span className="nav-mark">◒</span>Analytics</a>
          <a href="#orders"><span className="nav-mark">▤</span>Orders</a>
        </nav>
        <div className="nav-label shortcuts-label">SHORTCUTS</div>
        <nav className="sidebar-nav secondary-nav" aria-label="Dashboard shortcuts">
          <a href="#filters"><span className="nav-mark">⚑</span>Filters</a>
          {issues.length > 0 && <a href="#data-quality"><span className="nav-mark">△</span>Data quality <span className="issue-count">{issues.length}</span></a>}
        </nav>
        <div className="sidebar-footer"><span className="workspace-avatar small-avatar">OA</span><span><strong>Order Admin</strong><small>Operations</small></span></div>
      </aside>
      <main className="app" id="dashboard">
        <header className="topbar">
          <div className="utility-bar">
            <div className="topbar-actions">
              {meta?.rate_source === "fallback" && <span className="badge warn" title="Exchange-rate API unreachable">Approximate FX rates</span>}
              <span className="currency-chip">{filters.currency}</span>
              <span className="notification-indicator" aria-label={`${issues.length} data quality issues`} title={`${issues.length} data quality issues`}>
                <span className="bell-icon" />
                {issues.length > 0 && <span className="notification-count">{issues.length}</span>}
              </span>
              <span className="header-avatar" aria-label="Order Admin">OA</span>
            </div>
          </div>
          <div className="welcome-copy">
            <h1>Hi, Welcome back</h1>
            <p className="welcome-date">Order overview <span>·</span> {today}</p>
          </div>
        </header>

      <div className="kpis">
        <KpiCard loading={loading} icon="▤" label="Total Orders" value={k?.total_orders} />
        <KpiCard loading={loading} icon="₹" label="Total Revenue" value={k && formatMoney(k.total_revenue, filters.currency)} />
        <KpiCard loading={loading} icon="◷" label="Average Order" value={k && formatMoney(k.avg_order_value, filters.currency)} />
        <KpiCard loading={loading} icon="△" label="Delayed Orders" tone="danger" value={k?.delayed_orders} hint={k && `${k.delay_rate}% of orders`} />
      </div>

      <div className="reference-chart-grid">
        <ChartCard className="visits-card" title="Website Visits" subtitle="Demo data · (+43%) than last year">
          <WebsiteVisitsChart />
        </ChartCard>
        <ChartCard className="current-visits-card" title="Current Visits">
          <CurrentVisitsChart />
        </ChartCard>
      </div>

      <section className="order-analytics-section" id="analytics">
        <header className="section-heading"><h2>Order Analytics</h2><span>Live order data</span></header>
        <div className="grid">
        <ChartCard className="trend-card" title={`${filters.metric === "revenue" ? "Revenue" : "Orders"} trend`} actions={<>
          <Toggle value={filters.granularity} onChange={(granularity) => setFilters({ granularity })} options={[["day", "Daily"], ["month", "Monthly"]]} />
          {metricToggle}</>}>
          <Async result={summary} empty={empty}>{(d) => <RevenueTrend data={d.revenue_trend} metric={filters.metric} currency={filters.currency} />}</Async>
        </ChartCard>

        <ChartCard className="delivery-card" title="Delivery performance">
          <Async result={summary} empty={empty}>{(d) => (
            <DeliveryChart data={d.delivery_performance} selected={filters.status} onSelect={(status) => setFilters({ status })} />)}</Async>
        </ChartCard>

        <ChartCard className="category-card" title="Category-wise revenue" actions={metricToggle}>
          <Async result={summary} empty={empty}>{(d) => (
            <CategoryChart data={d.category_revenue} metric={filters.metric} currency={filters.currency}
                           selected={filters.category} onSelect={(category) => setFilters({ category })} />)}</Async>
        </ChartCard>
        </div>

      <div id="filters"><Filters /></div>

      <DrillDown />
      <OrdersTable />

      {issues.length > 0 && (
        <details className="card dq" id="data-quality"><summary>Data quality notes ({issues.length})</summary>
          <ul>{issues.map((m, i) => <li key={i}>{m}</li>)}</ul></details>
      )}
          </section>
      </main>
    </div>
  );
}
