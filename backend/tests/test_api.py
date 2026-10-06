import os
import tempfile

os.environ["APP_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest
from fastapi.testclient import TestClient

from app import external, parsers, transform
from app.main import app


@pytest.fixture(scope="module")
def client():
    async def offline():                      # never hit the network in tests
        from app.config import FALLBACK_RATES
        return FALLBACK_RATES, "fallback"
    external.get_rates = offline
    with TestClient(app) as c:                # lifespan seeds the sample data
        yield c


def test_parse_corrupt_json_and_csv():
    from app.config import SAMPLE_DIR
    orders = parsers.parse_json((SAMPLE_DIR / "Orders.json").read_bytes())
    assert [o["order_id"] for o in orders] == ["1001", "1002"]
    prods = parsers.parse_csv((SAMPLE_DIR / "Products.csv").read_bytes())
    assert prods[0] == {"ProductID": "P101", "ProductName": "Laptop", "Category": "Electronics"}


def test_clean_orders_handles_bad_rows():
    orders, items, issues = transform.clean_orders([
        {"order_id": "9", "items": [{"product_id": "p1", "qty": "x", "price": 5}], "order_date": "bad"},
        {"items": []}])
    assert len(orders) == 1 and items == [] and len(issues) >= 3


def test_summary_kpis(client):
    d = client.get("/analytics/summary").json()["data"]
    assert d["kpis"]["total_orders"] == 2
    assert d["kpis"]["total_revenue"] == 2800
    assert d["kpis"]["delayed_orders"] == 1
    cats = {c["category"]: c["revenue"] for c in d["category_revenue"]}
    assert cats == {"Electronics": 2200, "Furniture": 600}


def test_filters_and_currency(client):
    d = client.get("/analytics/summary?category=Furniture&currency=USD").json()
    assert d["data"]["kpis"]["total_orders"] == 1
    assert d["data"]["kpis"]["total_revenue"] == pytest.approx(600 * 0.012, abs=0.01)
    assert client.get("/analytics/summary?currency=XXX").status_code == 422
    assert client.get("/analytics/summary?start=nope").status_code == 422


def test_orders_pagination_and_detail(client):
    p = client.get("/orders?page_size=1&page=2").json()["data"]
    assert p["total"] == 2 and p["pages"] == 2 and len(p["items"]) == 1
    assert client.get("/orders/1001").json()["data"]["total_value"] == 2200
    assert client.get("/orders/nope").status_code == 404


def test_ingest_endpoint_reports_issues(client):
    bad = b'<shipments><shipment><shipment_id>S9</shipment_id><order_id>1001</order_id><status>delayed</status></shipment></shipments>'
    r = client.post("/ingest/xml", files={"file": ("s.xml", bad)}).json()["data"]
    assert r["loaded"] == 1 and any("missing delivery_days" in i for i in r["issues"])
    assert client.post("/ingest/xml", files={"file": ("s.xml", b"<oops")}).status_code == 422
