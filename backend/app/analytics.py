"""Aggregations over the joined order-line DataFrame. Pure functions, no I/O."""
import pandas as pd


def _records(df: pd.DataFrame):
    return df.astype(object).where(df.notna(), None).to_dict("records")


def _money(x, rate):
    return round(float(x) * rate, 2)


def summary(df: pd.DataFrame, rate: float, granularity: str = "day") -> dict:
    if df.empty:
        return {"kpis": {"total_orders": 0, "total_revenue": 0, "delayed_orders": 0,
                         "delay_rate": 0, "avg_order_value": 0},
                "revenue_trend": [], "category_revenue": [], "delivery_performance": []}
    orders = df.drop_duplicates("order_id")
    n_orders = int(orders.order_id.nunique())
    revenue = df.line_total.sum() * rate
    delayed = int((orders.delivery_status == "Delayed").sum())

    d = df.dropna(subset=["order_date"]).copy()
    d["period"] = d.order_date.str[:7] if granularity == "month" else d.order_date
    trend = (d.groupby("period").agg(revenue=("line_total", "sum"), orders=("order_id", "nunique"))
             .reset_index().sort_values("period"))
    trend["revenue"] = (trend.revenue * rate).round(2)

    cat = (df.groupby("category").agg(revenue=("line_total", "sum"), orders=("order_id", "nunique"),
                                      units=("qty", "sum")).reset_index().sort_values("revenue", ascending=False))
    cat["revenue"] = (cat.revenue * rate).round(2)

    deliv = (orders.groupby("delivery_status").agg(orders=("order_id", "count"), avg_days=("delivery_days", "mean"))
             .reset_index())
    deliv["avg_days"] = deliv.avg_days.round(1)

    return {
        "kpis": {"total_orders": n_orders, "total_revenue": round(float(revenue), 2),
                 "delayed_orders": delayed, "delay_rate": round(delayed / n_orders * 100, 1),
                 "avg_order_value": round(float(revenue) / n_orders, 2)},
        "revenue_trend": _records(trend),
        "category_revenue": _records(cat),
        "delivery_performance": _records(deliv),
    }


def order_list(df: pd.DataFrame, rate: float, page: int, page_size: int) -> dict:
    """One row per order. With a category filter, totals cover only matching lines."""
    if df.empty:
        return {"items": [], "page": page, "page_size": page_size, "total": 0, "pages": 0}
    g = (df.groupby("order_id").agg(
            order_date=("order_date", "first"), customer_name=("customer_name", "first"),
            total_value=("line_total", "sum"), lines=("product_id", "count"), units=("qty", "sum"),
            categories=("category", lambda s: ", ".join(sorted(set(s)))),
            delivery_status=("delivery_status", "first"), delivery_days=("delivery_days", "first"))
         .reset_index().sort_values(["order_date", "order_id"], ascending=False, na_position="last"))
    g["total_value"] = (g.total_value * rate).round(2)
    total = len(g)
    chunk = g.iloc[(page - 1) * page_size: page * page_size]
    return {"items": _records(chunk), "page": page, "page_size": page_size,
            "total": total, "pages": -(-total // page_size)}


def order_detail(df: pd.DataFrame, rate: float):
    if df.empty:
        return None
    head = df.iloc[0]
    lines = df[["product_id", "product_name", "category", "qty", "price", "line_total"]].copy()
    lines["price"] = (lines.price * rate).round(2)
    lines["line_total"] = (lines.line_total * rate).round(2)
    return {"order_id": head.order_id, "order_date": head.order_date, "customer_id": head.customer_id,
            "customer_name": head.customer_name, "delivery_status": head.delivery_status,
            "shipment_status": None if pd.isna(head.shipment_status) else head.shipment_status,
            "delivery_days": None if pd.isna(head.delivery_days) else int(head.delivery_days),
            "total_value": round(float(lines.line_total.sum()), 2), "items": _records(lines)}


def category_drilldown(df: pd.DataFrame, rate: float):
    if df.empty:
        return []
    p = (df.groupby(["product_id", "product_name"]).agg(
            revenue=("line_total", "sum"), units=("qty", "sum"), orders=("order_id", "nunique"))
         .reset_index().sort_values("revenue", ascending=False))
    p["revenue"] = (p.revenue * rate).round(2)
    return _records(p)
