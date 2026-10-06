"""External API access (async, cached, with graceful fallback).

- Exchange rates: open.er-api.com  -> used for currency conversion.
- REST Countries: restcountries.com -> currency codes/names for the currency selector
  (the API suggested in Hit_External_API.xlsx).
"""
import time

import httpx

from . import config

_cache: dict = {}


def _fresh(key):
    hit = _cache.get(key)
    return hit[1] if hit and time.time() - hit[0] < config.EXTERNAL_TTL_SECONDS else None


async def _get_json(url):
    async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def get_rates():
    """Returns (rates relative to BASE_CURRENCY, source: 'live' | 'cached' | 'fallback')."""
    key = "rates"
    cached = _fresh(key)
    if cached:
        return cached, "cached"
    try:
        data = await _get_json(config.RATES_URL.format(base=config.BASE_CURRENCY))
        rates = data["rates"]
        _cache[key] = (time.time(), rates)
        return rates, "live"
    except Exception:  # network down, bad payload, rate limit ...
        return config.FALLBACK_RATES, "fallback"


async def convert_rate(target: str):
    """Multiplier to convert BASE_CURRENCY amounts into `target`."""
    rates, source = await get_rates()
    target = target.upper()
    if target not in rates:
        raise KeyError(target)
    return float(rates[target]), source


async def get_currencies():
    """[{code, name, symbol}] from REST Countries, limited to currencies we have rates for."""
    key = "currencies"
    cached = _fresh(key)
    if cached:
        return cached
    rates, _ = await get_rates()
    out = {}
    try:
        for country in await _get_json(config.COUNTRIES_URL):
            for code, info in (country.get("currencies") or {}).items():
                if code in rates:
                    out[code] = {"code": code, "name": info.get("name", code), "symbol": info.get("symbol", code)}
        result = sorted(out.values(), key=lambda c: c["code"])
        if result:
            _cache[key] = (time.time(), result)
            return result
    except Exception:
        pass
    return [{"code": c, "name": c, "symbol": c} for c in sorted(rates) if c in config.FALLBACK_RATES]
