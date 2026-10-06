import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "../api";

const COLORS = ["#2878d0", "#efb526", "#36a7df", "#ef625a", "#1eaa8a", "#8f71d9"];
const STATUS_COLORS = { "On Time": "#2878d0", Delayed: "#ef625a", Unknown: "#efb526" };
const VISIT_DEMO = [
  { month: "Jan", visits: 22, teamA: 29, teamB: 44, teamC: 24 },
  { month: "Feb", visits: 10, teamA: 25, teamB: 55, teamC: 22 },
  { month: "Mar", visits: 21, teamA: 36, teamB: 40, teamC: 35 },
  { month: "Apr", visits: 26, teamA: 30, teamB: 67, teamC: 29 },
  { month: "May", visits: 12, teamA: 44, teamB: 22, teamC: 46 },
  { month: "Jun", visits: 21, teamA: 35, teamB: 42, teamC: 34 },
  { month: "Jul", visits: 36, teamA: 63, teamB: 22, teamC: 64 },
  { month: "Aug", visits: 20, teamA: 52, teamB: 40, teamC: 52 },
  { month: "Sep", visits: 43, teamA: 58, teamB: 50, teamC: 56 },
  { month: "Oct", visits: 21, teamA: 27, teamB: 24, teamC: 30 },
  { month: "Nov", visits: 37, teamA: 35, teamB: 37, teamC: 35 },
  { month: "Dec", visits: 30, teamA: 39, teamB: 42, teamC: 38 },
];
const VISIT_REGIONS = [
  { region: "America", visits: 277 },
  { region: "Asia", visits: 347 },
  { region: "Europe", visits: 92 },
  { region: "Africa", visits: 284 },
];
const REGION_COLORS = ["#2865ca", "#1596e8", "#f1b61d", "#ef4b4d"];

const fmt = (metric, currency) => (v) => (metric === "revenue" ? formatMoney(v, currency) : v);

function TeamLegend({ payload = [] }) {
  return (
    <ul className="team-legend">
      {payload.filter(({ value }) => value !== "Website Visits").map(({ value, color }) => (
        <li key={value}><span style={{ backgroundColor: color }} />{value}</li>
      ))}
    </ul>
  );
}

export function WebsiteVisitsChart() {
  return (
    <ResponsiveContainer width="100%" height={238}>
      <ComposedChart data={VISIT_DEMO} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e8edf3" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} width={32} tick={{ fontSize: 9 }} />
        <Tooltip />
        <Legend content={(props) => <TeamLegend {...props} />} verticalAlign="top" align="right" wrapperStyle={{ width: "100%" }} />
        <Bar dataKey="visits" name="Website Visits" fill="#2878d0" barSize={7} legendType="none" isAnimationActive={false} />
        <Line dataKey="teamA" name="Team A" type="monotone" stroke="#278ddd" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line dataKey="teamB" name="Team B" type="monotone" stroke="#efb526" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line dataKey="teamC" name="Team C" type="monotone" stroke="#28a3df" strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CurrentVisitsChart() {
  return (
    <ResponsiveContainer width="100%" height={238}>
      <PieChart>
        <Pie data={VISIT_REGIONS} dataKey="visits" nameKey="region" outerRadius={72}
             label={({ cx, cy, midAngle, outerRadius: radius, percent }) => {
               const angle = (-midAngle * Math.PI) / 180;
               const labelRadius = radius * 0.62;
               return (
                 <text x={cx + labelRadius * Math.cos(angle)} y={cy + labelRadius * Math.sin(angle)}
                       fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={9}>
                   {(percent * 100).toFixed(1)}%
                 </text>
               );
             }}
             labelLine={false} isAnimationActive={false}>
          {VISIT_REGIONS.map((entry, index) => <Cell key={entry.region} fill={REGION_COLORS[index]} />)}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 9 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrend({ data, metric, currency }) {
  const companion = metric === "revenue" ? "orders" : "revenue";
  const lineColor = metric === "revenue" ? "#efb526" : "#2878d0";
  const barColor = metric === "revenue" ? "#2878d0" : "#efb526";
  const formatPeriod = (period) => {
    const date = new Date(`${period.length === 7 ? `${period}-01` : period}T00:00:00`);
    return Number.isNaN(date.getTime()) ? period : new Intl.DateTimeFormat(undefined, {
      month: "short", ...(period.length === 10 ? { day: "numeric" } : {}),
    }).format(date);
  };
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 2, bottom: 0 }}>
        <CartesianGrid stroke="#e8edf3" strokeDasharray="2 3" vertical={false} />
        <XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="primary" width={62} allowDecimals={false}
               tickFormatter={metric === "revenue" ? (v) => formatMoney(v, currency) : undefined} />
        <YAxis yAxisId="secondary" orientation="right" width={8} hide allowDecimals={false}
               tickFormatter={companion === "revenue" ? (v) => formatMoney(v, currency) : undefined} />
        <Tooltip formatter={(value, key) => key === "revenue"
          ? [formatMoney(value, currency), "Revenue"]
          : [`${value} orders`, "Orders"]} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        <Bar yAxisId="secondary" dataKey={companion} name={companion === "orders" ? "Orders" : "Revenue"}
             fill={barColor} barSize={12} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Line yAxisId="primary" type="monotone" dataKey={metric} name={metric === "revenue" ? "Revenue" : "Orders"} stroke={lineColor}
            strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Clicking a bar drills down into that category. */
export function CategoryChart({ data, metric, currency, selected, onSelect }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="category" /><YAxis width={70} allowDecimals={false} />
        <Tooltip formatter={fmt(metric, currency)} />
        <Bar dataKey={metric} radius={[6, 6, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(d) => onSelect(d.category === selected ? "" : d.category)}>
          {data.map((d, i) => <Cell key={d.category} fill={COLORS[i % COLORS.length]} opacity={!selected || selected === d.category ? 1 : 0.35} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DeliveryChart({ data, selected, onSelect }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
           <Pie data={data} dataKey="orders" nameKey="delivery_status" outerRadius={82} paddingAngle={2}
             label={({ percent }) => `${Math.round(percent * 100)}%`} labelLine={false} isAnimationActive={false}
             cursor="pointer" onClick={(d) => onSelect(d.delivery_status === selected ? "" : d.delivery_status)}>
          {data.map((d) => <Cell key={d.delivery_status} fill={STATUS_COLORS[d.delivery_status] || "#64748b"}
                                 opacity={!selected || selected === d.delivery_status ? 1 : 0.35} />)}
        </Pie>
        <Tooltip formatter={(v, _n, p) => [`${v} orders${p.payload.avg_days != null ? ` · avg ${p.payload.avg_days} days` : ""}`, p.payload.delivery_status]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
