"""Central configuration (override via environment variables)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("APP_DB_PATH", str(ROOT / "data.db"))
SAMPLE_DIR = ROOT / "sample_data"

BASE_CURRENCY = "INR"                     # currency the order prices are assumed to be in
DELAY_THRESHOLD_DAYS = int(os.getenv("DELAY_THRESHOLD_DAYS", 5))
RATES_URL = "https://open.er-api.com/v6/latest/{base}"
COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=currencies"
EXTERNAL_TTL_SECONDS = 3600
HTTP_TIMEOUT = 5.0
# Used only when the external API is unreachable (offline / rate-limited).
FALLBACK_RATES = {"INR": 1.0, "USD": 0.012, "EUR": 0.011, "GBP": 0.0095, "JPY": 1.8, "AED": 0.044}
