import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFetch } from "../hooks/useFetch";
import { useFilters } from "../state/FilterContext";

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Filters() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { data: meta } = useFetch("/meta");
  const field = (name) => ({ value: filters[name], onChange: (e) => setFilters({ [name]: e.target.value }) });

  return (
    <div className="card filters">
      <label>From
        <DatePicker
          key={`start-${filters.start || "empty"}`}
          ariaLabel="Start date"
          selected={parseDate(filters.start)}
          preventOpenOnFocus={false}
          onChange={(date) => setFilters({ start: formatDate(date) })}
          maxDate={parseDate(filters.end)}
          dateFormat="dd-MM-yyyy"
          placeholderText="dd-mm-yyyy"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
            <div className="calendar-header">
              <button type="button" aria-label="Previous month" onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>‹</button>
              <strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)}</strong>
              <button type="button" aria-label="Next month" onClick={increaseMonth} disabled={nextMonthButtonDisabled}>›</button>
            </div>
          )}
        />
      </label>
      <label>To
        <DatePicker
          key={`end-${filters.end || "empty"}`}
          ariaLabel="End date"
          selected={parseDate(filters.end)}
          preventOpenOnFocus={false}
          onChange={(date) => setFilters({ end: formatDate(date) })}
          minDate={parseDate(filters.start)}
          dateFormat="dd-MM-yyyy"
          placeholderText="dd-mm-yyyy"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
            <div className="calendar-header">
              <button type="button" aria-label="Previous month" onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>‹</button>
              <strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)}</strong>
              <button type="button" aria-label="Next month" onClick={increaseMonth} disabled={nextMonthButtonDisabled}>›</button>
            </div>
          )}
        />
      </label>
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
