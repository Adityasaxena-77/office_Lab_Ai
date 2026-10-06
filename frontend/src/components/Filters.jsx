import { useFetch } from "../hooks/useFetch";
import { useFilters } from "../state/FilterContext";

export default function Filters() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { data: meta } = useFetch("/meta");
  const field = (name) => ({ value: filters[name], onChange: (e) => setFilters({ [name]: e.target.value }) });

  return (
    <div className="card filters">
      <label>From<input type="date" {...field("start")} min={meta?.date_range.min} max={filters.end || meta?.date_range.max} /></label>
      <label>To<input type="date" {...field("end")} min={filters.start || meta?.date_range.min} max={meta?.date_range.max} /></label>
      <label>Category
        <select {...field("category")}>
          <option value="">All</option>
          {meta?.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Delivery
        <select {...field("status")}>
          <option value="">All</option>
          {meta?.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label>Currency
        <select {...field("currency")}>
          {(meta?.currencies || [{ code: filters.currency }]).map((c) => (
            <option key={c.code} value={c.code}>{c.code}{c.name && c.name !== c.code ? ` – ${c.name}` : ""}</option>
          ))}
        </select>
      </label>
      <button className="ghost" onClick={resetFilters}>Reset</button>
    </div>
  );
}
