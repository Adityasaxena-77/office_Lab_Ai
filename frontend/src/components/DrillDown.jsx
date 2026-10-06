import { formatMoney } from "../api";
import { useFetch } from "../hooks/useFetch";
import { apiParams, useFilters } from "../state/FilterContext";
import { Async } from "./Status";

/** Product-level breakdown for the category selected on the bar chart. */
export default function DrillDown() {
  const { filters, setFilters } = useFilters();
  const result = useFetch(
    filters.category ? `/analytics/category/${encodeURIComponent(filters.category)}` : null,
    apiParams(filters)
  );
  if (!filters.category) return null;
  return (
    <section className="card">
      <header className="row-head">
        <h3>Drill-down: {filters.category}</h3>
        <button className="ghost" onClick={() => setFilters({ category: "" })}>Close ✕</button>
      </header>
      <Async result={result} empty={(d) => !d?.length}>
        {(rows) => (
          <div className="table-wrap"><table>
            <thead><tr><th>Product</th><th>Units</th><th>Orders</th><th className="num">Revenue</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.product_id}><td>{r.product_name} <small>({r.product_id})</small></td><td>{r.units}</td><td>{r.orders}</td>
                <td className="num">{formatMoney(r.revenue, filters.currency)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
    </section>
  );
}
