"""Cleaning / normalisation. Each function returns (clean_records, issues)."""
from datetime import datetime

from . import config


def _num(v):
    try:
        return float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _date(v):
    if not v:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(str(v).strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def _key(rec: dict) -> dict:  # "Product_ID" / "ProductID" / "product id" -> "productid"
    return {str(k).lower().replace("_", "").replace(" ", ""): v for k, v in rec.items()}


def clean_orders(records):
    """Flatten nested orders -> (orders, items, issues). Last duplicate order_id wins."""
    orders, items, issues = {}, {}, []
    for n, o in enumerate(records, 1):
        if not isinstance(o, dict) or not str(o.get("order_id") or "").strip():
            issues.append(f"order #{n}: missing order_id, skipped")
            continue
        oid = str(o["order_id"]).strip()
        if oid in orders:
            issues.append(f"order {oid}: duplicate, later record replaces earlier one")
        cust = o.get("customer") or {}
        date = _date(o.get("order_date"))
        if date is None:
            issues.append(f"order {oid}: missing/invalid order_date")
        orders[oid] = {"order_id": oid, "customer_id": cust.get("id"),
                       "customer_name": cust.get("name") or "Unknown", "order_date": date}
        rows = []
        for m, it in enumerate(o.get("items") or [], 1):
            pid = str(it.get("product_id") or "").strip().upper()
            qty, price = _num(it.get("qty")), _num(it.get("price"))
            if not pid or qty is None or price is None or qty < 0 or price < 0:
                issues.append(f"order {oid} item #{m}: invalid product/qty/price, skipped")
                continue
            rows.append({"order_id": oid, "product_id": pid, "qty": int(qty), "price": price})
        if not rows:
            issues.append(f"order {oid}: has no valid items (revenue 0)")
        items[oid] = rows
    return list(orders.values()), [r for rows in items.values() for r in rows], issues


def clean_products(records):
    out, issues = {}, []
    for n, rec in enumerate(records, 1):
        r = _key(rec)
        pid = str(r.get("productid") or "").strip().upper()
        if not pid:
            issues.append(f"product row #{n}: missing ProductID, skipped")
            continue
        cat = (r.get("category") or "").strip().title()
        if not cat:
            issues.append(f"product {pid}: missing category -> 'Uncategorized'")
        out[pid] = {"product_id": pid, "product_name": r.get("productname") or pid,
                    "category": cat or "Uncategorized"}
    return list(out.values()), issues


def clean_shipments(records):
    out, issues = {}, []
    for n, rec in enumerate(records, 1):
        r = _key(rec)
        sid, oid = r.get("shipmentid"), str(r.get("orderid") or "").strip()
        if not sid or not oid:
            issues.append(f"shipment #{n}: missing shipment_id/order_id, skipped")
            continue
        days = _num(r.get("deliverydays"))
        if days is None:
            issues.append(f"shipment {sid}: missing delivery_days")
        status = (r.get("status") or "").strip().title() or None
        delayed = status == "Delayed" or (days is not None and days > config.DELAY_THRESHOLD_DAYS)
        out[sid] = {"shipment_id": sid, "order_id": oid,
                    "delivery_days": None if days is None else int(days),
                    "status": status, "is_delayed": int(delayed)}
    return list(out.values()), issues
