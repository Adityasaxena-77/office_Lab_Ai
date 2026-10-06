"""REST API layer: validation, response envelope, error handling. No business logic."""
import re
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import analytics, config, external, parsers, pipeline, store

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.init()
    if store.is_empty():          # first run: seed with the bundled sample files
        pipeline.load_samples()
    yield


app = FastAPI(title="Order Analytics API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def ok(data, **meta):
    return {"status": "ok", "data": data, "meta": meta}


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"status": "error", "message": exc.detail}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    msg = "; ".join(f"{'.'.join(map(str, e['loc'][1:]))}: {e['msg']}" for e in exc.errors())
    return JSONResponse({"status": "error", "message": msg}, status_code=422)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    return JSONResponse({"status": "error", "message": "Internal server error"}, status_code=500)


class Filters:
    """Shared query parameters for every analytics endpoint."""
    def __init__(self, start: str | None = Query(None, description="YYYY-MM-DD"),
                 end: str | None = Query(None, description="YYYY-MM-DD"),
                 category: str | None = None,
                 status: str | None = Query(None, description="Delayed | On Time | Unknown"),
                 currency: str = Query(config.BASE_CURRENCY, min_length=3, max_length=3)):
        for name, v in (("start", start), ("end", end)):
            if v and not DATE_RE.match(v):
                raise HTTPException(422, f"{name} must be YYYY-MM-DD")
        self.start, self.end, self.category, self.status = start or None, end or None, category or None, status or None
        self.currency = currency.upper()

    async def rate(self):
        try:
            return await external.convert_rate(self.currency)
        except KeyError:
            raise HTTPException(422, f"Unsupported currency '{self.currency}'")

    def items(self):
        return store.query_items(self.start, self.end, self.category, self.status)


# ---------- ingestion ----------
async def _ingest(fn, file: UploadFile):
    try:
        return ok(fn(await file.read()))
    except parsers.ParseError as exc:
        raise HTTPException(422, str(exc))


@app.post("/ingest/json", summary="Load orders (nested JSON)")
async def ingest_json(file: UploadFile = File(...)):
    return await _ingest(pipeline.ingest_json, file)


@app.post("/ingest/xml", summary="Load shipments (XML)")
async def ingest_xml(file: UploadFile = File(...)):
    return await _ingest(pipeline.ingest_xml, file)


@app.post("/ingest/csv", summary="Load products (CSV)")
async def ingest_csv(file: UploadFile = File(...)):
    return await _ingest(pipeline.ingest_csv, file)


# ---------- analytics ----------
@app.get("/analytics/summary")
async def analytics_summary(f: Filters = Depends(),
                            granularity: str = Query("day", pattern="^(day|month)$")):
    rate, source = await f.rate()
    data = analytics.summary(f.items(), rate, granularity)
    data["data_quality"] = pipeline.LAST_ISSUES
    return ok(data, currency=f.currency, rate_source=source)


@app.get("/analytics/category/{category}", summary="Product-level drill-down")
async def category_detail(category: str, f: Filters = Depends()):
    f.category = category
    rate, source = await f.rate()
    return ok(analytics.category_drilldown(f.items(), rate), currency=f.currency, rate_source=source)


@app.get("/orders", summary="Paginated order list")
async def orders(f: Filters = Depends(), page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    rate, source = await f.rate()
    return ok(analytics.order_list(f.items(), rate, page, page_size), currency=f.currency, rate_source=source)


@app.get("/orders/{order_id}")
async def order(order_id: str, currency: str = config.BASE_CURRENCY):
    f = Filters(start=None, end=None, category=None, status=None, currency=currency)
    rate, source = await f.rate()
    df = store.query_items()
    detail = analytics.order_detail(df[df.order_id == order_id], rate)
    if detail is None:
        raise HTTPException(404, f"Order {order_id} not found")
    return ok(detail, currency=f.currency, rate_source=source)


@app.get("/meta", summary="Filter options for the UI")
async def meta():
    df = store.query_items()
    dates = df.order_date.dropna()
    return ok({"categories": sorted(df.category.unique().tolist()),
               "statuses": ["On Time", "Delayed", "Unknown"],
               "date_range": {"min": dates.min() if len(dates) else None, "max": dates.max() if len(dates) else None},
               "currencies": await external.get_currencies(),
               "base_currency": config.BASE_CURRENCY})


@app.get("/health")
async def health():
    return ok({"alive": True})
