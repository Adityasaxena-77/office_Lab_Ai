"""Format-level parsing only: bytes -> list[dict]. No business logic here.

The supplied sample files are slightly corrupt (UTF-8 BOM, every line wrapped in
CSV-style quotes with doubled inner quotes). The parsers repair these cases
instead of failing, and raise ParseError when the input is truly unusable.
"""
import csv
import io
import json
import xml.etree.ElementTree as ET


class ParseError(ValueError):
    pass


def _decode(raw: bytes) -> str:
    return raw.decode("utf-8-sig", errors="replace")  # utf-8-sig strips the BOM


def _unwrap_line(line: str) -> str:
    s = line.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1].replace('""', '"')
    return line


def parse_json(raw: bytes) -> list[dict]:
    text = _decode(raw)
    try:
        doc = json.loads(text)
    except json.JSONDecodeError:
        try:  # repair: CSV-escaped JSON
            doc = json.loads("\n".join(_unwrap_line(l) for l in text.splitlines()))
        except json.JSONDecodeError as exc:
            raise ParseError(f"Invalid JSON: {exc}") from exc
    if isinstance(doc, dict):
        doc = doc.get("orders", doc.get("data"))
    if not isinstance(doc, list):
        raise ParseError("Expected a list of orders or an object with an 'orders' key")
    return doc


def parse_csv(raw: bytes) -> list[dict]:
    rows = [r for r in csv.reader(io.StringIO(_decode(raw))) if any(c.strip() for c in r)]
    if not rows:
        raise ParseError("CSV is empty")
    # repair: whole row wrapped in quotes -> one column containing commas
    if all(len(r) == 1 and "," in r[0] for r in rows):
        rows = [next(csv.reader([r[0]])) for r in rows]
    header = [h.strip() for h in rows[0]]
    out = []
    for r in rows[1:]:
        r = (r + [""] * len(header))[: len(header)]
        out.append({h: v.strip() for h, v in zip(header, r)})
    return out


def parse_xml(raw: bytes) -> list[dict]:
    try:
        root = ET.fromstring(_decode(raw).strip())
    except ET.ParseError as exc:
        raise ParseError(f"Invalid XML: {exc}") from exc
    return [
        {child.tag: ((child.text or "").strip() or None) for child in el}
        for el in root.iter("shipment")
    ]
