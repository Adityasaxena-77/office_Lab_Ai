"""SQLite persistence.

Why SQLite (vs in-memory pandas): data survives restarts, filtering/joins are
pushed to SQL, and it needs no extra infrastructure. pandas is still used on the
joined result for aggregations. Swap `connect()` to move to PostgreSQL.
"""
import sqlite3
from contextlib import contextmanager

import pandas as pd

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS orders(order_id TEXT PRIMARY KEY, customer_id TEXT, customer_name TEXT, order_date TEXT);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, product_id TEXT, qty INTEGER, price REAL);
CREATE INDEX IF NOT EXISTS ix_items_order ON order_items(order_id);
CREATE TABLE IF NOT EXISTS products(product_id TEXT PRIMARY KEY, product_name TEXT, category TEXT);
CREATE TABLE IF NOT EXISTS shipments(shipment_id TEXT PRIMARY KEY, order_id TEXT, delivery_days INTEGER, status TEXT, is_delayed INTEGER);
CREATE INDEX IF NOT EXISTS ix_ship_order ON shipments(order_id);
"""

# Denormalised view of order lines joined with products and shipments.
JOINED_SQL = """
SELECT i.order_id, o.order_date, o.customer_id, o.customer_name, i.product_id,
       COALESCE(p.product_name, i.product_id) AS product_name,
       COALESCE(p.category, 'Uncategorized') AS category,
       i.qty, i.price, i.qty * i.price AS line_total,
       s.delivery_days, s.status AS shipment_status,
       CASE WHEN s.order_id IS NULL THEN 'Unknown'
            WHEN s.is_delayed = 1 THEN 'Delayed' ELSE 'On Time' END AS delivery_status
FROM order_items i
JOIN orders o ON o.order_id = i.order_id
LEFT JOIN products p ON p.product_id = i.product_id
LEFT JOIN shipments s ON s.order_id = i.order_id
"""


@contextmanager
def connect():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init():
    with connect() as c:
        c.executescript(SCHEMA)


def is_empty() -> bool:
    with connect() as c:
        return c.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 0


def save_orders(orders, items):
    with connect() as c:
        c.executemany("DELETE FROM order_items WHERE order_id=?", [(o["order_id"],) for o in orders])
        c.executemany("INSERT OR REPLACE INTO orders VALUES (:order_id,:customer_id,:customer_name,:order_date)", orders)
        c.executemany("INSERT INTO order_items(order_id,product_id,qty,price) VALUES (:order_id,:product_id,:qty,:price)", items)


def save_products(rows):
    with connect() as c:
        c.executemany("INSERT OR REPLACE INTO products VALUES (:product_id,:product_name,:category)", rows)


def save_shipments(rows):
    with connect() as c:
        c.executemany("INSERT OR REPLACE INTO shipments VALUES (:shipment_id,:order_id,:delivery_days,:status,:is_delayed)", rows)


def query_items(start=None, end=None, category=None, status=None) -> pd.DataFrame:
    where, params = [], []
    if start:
        where.append("order_date >= ?"); params.append(start)
    if end:
        where.append("order_date <= ?"); params.append(end)
    if category:
        where.append("category = ?"); params.append(category)
    if status:
        where.append("delivery_status = ?"); params.append(status)
    sql = f"SELECT * FROM ({JOINED_SQL})" + (" WHERE " + " AND ".join(where) if where else "")
    with connect() as c:
        return pd.read_sql_query(sql, c, params=params)
