"""Ingestion orchestration: parse -> clean -> store. Returns a report dict."""
from . import parsers, store, transform

LAST_ISSUES: dict[str, list[str]] = {}   # latest data-quality issues per entity


def _report(entity, received, loaded, issues, **extra):
    LAST_ISSUES[entity] = issues
    return {"entity": entity, "received": received, "loaded": loaded,
            "skipped": received - loaded, "issues": issues, **extra}


def ingest_json(raw: bytes):
    records = parsers.parse_json(raw)
    orders, items, issues = transform.clean_orders(records)
    store.save_orders(orders, items)
    return _report("orders", len(records), len(orders), issues, items_loaded=len(items))


def ingest_csv(raw: bytes):
    records = parsers.parse_csv(raw)
    products, issues = transform.clean_products(records)
    store.save_products(products)
    return _report("products", len(records), len(products), issues)


def ingest_xml(raw: bytes):
    records = parsers.parse_xml(raw)
    shipments, issues = transform.clean_shipments(records)
    store.save_shipments(shipments)
    return _report("shipments", len(records), len(shipments), issues)


def load_samples():
    from .config import SAMPLE_DIR
    for name, fn in (("Orders.json", ingest_json), ("Products.csv", ingest_csv), ("Shipment.xml", ingest_xml)):
        path = SAMPLE_DIR / name
        if path.exists():
            fn(path.read_bytes())
