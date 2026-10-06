import { useEffect, useState } from "react";
import { formatMoney } from "../api";
import { useFetch } from "../hooks/useFetch";
import { apiParams, useFilters } from "../state/FilterContext";
import { Async } from "./Status";

function OrderModal({ id, currency, onClose }) {
  const result = useFetch(`/orders/${encodeURIComponent(id)}`, { currency });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <header className="row-head"><h3>Order #{id}</h3><button className="ghost" onClick={onClose}>✕</button></header>
        <Async result={result}>
          {(o) => (<>
            <p className="muted">{o.customer_name} ({o.customer_id}) · {o.order_date || "no date"} · <span className={`pill ${o.delivery_status.replace(" ", "")}`}>{o.delivery_status}</span>
              {o.delivery_days != null && ` · ${o.delivery_days} days`}</p>
            <div className="table-wrap"><table>
              <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th className="num">Price</th><th className="num">Total</th></tr></thead>
              <tbody>{o.items.map((i, n) => (
                <tr key={n}><td>{i.product_name}</td><td>{i.category}</td><td>{i.qty}</td>
                  <td className="num">{formatMoney(i.price, currency)}</td><td className="num">{formatMoney(i.line_total, currency)}</td></tr>))}</tbody>
              <tfoot><tr><td colSpan={4}>Order total</td><td className="num">{formatMoney(o.total_value, currency)}</td></tr></tfoot>
            </table></div>
          </>)}
        </Async>
      </div>
    </div>
  );
}

export default function OrdersTable() {
  const { filters } = useFilters();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const params = apiParams(filters);
  useEffect(() => setPage(1), [JSON.stringify(params)]);
  const result = useFetch("/orders", { ...params, page, page_size: 8 });

  return (
    <section className="card" id="orders">
      <h3>Orders</h3>
      <Async result={result} empty={(d) => !d?.items.length}>
        {(d) => (<>
          <div className="table-wrap"><table>
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Categories</th><th>Delivery</th><th className="num">Value</th></tr></thead>
            <tbody>{d.items.map((o) => (
              <tr key={o.order_id} className="click" onClick={() => setOpen(o.order_id)}>
                <td>#{o.order_id}</td><td>{o.order_date || "—"}</td><td>{o.customer_name}</td><td>{o.categories}</td>
                <td><span className={`pill ${o.delivery_status.replace(" ", "")}`}>{o.delivery_status}</span></td>
                <td className="num">{formatMoney(o.total_value, filters.currency)}</td></tr>))}</tbody>
          </table></div>
          <div className="pager">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span>Page {d.page} of {d.pages} · {d.total} orders</span>
            <button disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </>)}
      </Async>
      {open && <OrderModal id={open} currency={filters.currency} onClose={() => setOpen(null)} />}
    </section>
  );
}
