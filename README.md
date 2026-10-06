# Order Analytics – FastAPI + React

Windows startup commands: [RUN.md](RUN.md).

Ingests orders (JSON), products (CSV) and shipments (XML), joins and cleans them, and serves
analytics to a React dashboard.

## Run
```bash
# Backend  (http://localhost:8000, docs at /docs)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
pytest                       # 6 tests

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```
On first start the backend seeds itself from `backend/sample_data/`. Re-load data any time:
```bash
curl -F file=@Orders.json   localhost:8000/ingest/json
curl -F file=@Products.csv  localhost:8000/ingest/csv
curl -F file=@Shipment.xml  localhost:8000/ingest/xml
```

## API
| Endpoint | Purpose |
|---|---|
| `POST /ingest/json\|xml\|csv` | Upload a file; returns received/loaded/skipped counts + data-quality issues |
| `GET /analytics/summary` | KPIs, revenue trend (`granularity=day\|month`), category revenue, delivery performance |
| `GET /analytics/category/{name}` | Product-level drill-down |
| `GET /orders?page=&page_size=` | Paginated orders; `GET /orders/{id}` for line items |
| `GET /meta` | Categories, date range, currencies (REST Countries) |

All analytics endpoints accept `start`, `end`, `category`, `status` (`On Time`/`Delayed`/`Unknown`), `currency`.
Every response uses the envelope `{"status": "ok"|"error", "data": ..., "meta": ...}`.

## Design decisions
- **Layers**: `parsers` (bytes→dicts) → `transform` (clean/validate) → `store` (SQLite) → `analytics` (pandas, pure) → `main` (HTTP only).
- **Storage – SQLite**: persistent, joins/filters in SQL, zero setup; pandas for aggregation. Swap `store.connect()` for PostgreSQL if needed.
- **Messy input handled** (the sample files are deliberately corrupt): UTF-8 BOM; JSON with every line CSV-quoted;
  CSV rows wrapped in quotes; missing/invalid qty, price, date, category, delivery days; duplicate IDs;
  orders without shipment (`Unknown`) or product (`Uncategorized`). Nothing is silently dropped – each issue is reported.
- **Delay flag**: shipment status is `Delayed` **or** `delivery_days > 5` (`DELAY_THRESHOLD_DAYS`).
- **Order value** = Σ qty × price. With a category filter, order value/revenue count only matching lines.
- **Currency**: prices are assumed to be INR. Rates come from open.er-api.com (async, cached 1 h);
  if unreachable, static fallback rates are used and the UI shows an "Approximate FX rates" badge.
  Currency list comes from the REST Countries API (from `Hit_External_API.xlsx`).
- **Frontend**: Context + useReducer for filters, `useFetch` hook (abort stale requests, loading/error/retry),
  reusable `Async`, `KpiCard`, `ChartCard`, `Toggle`. Clicking a category bar or delivery slice filters + drills down;
  clicking an order opens its line items. Responsive grid, dark-mode aware.

## Ideas for next steps
Response caching of `/analytics/summary`, background ingestion for large files, auth, Docker compose.
