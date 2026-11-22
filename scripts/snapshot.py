"""Fetch the live numbers shown on the portfolio's "Running now" board.

Writes data/live.json. If one source fails, its previous reading is kept
(with its old timestamp), so a flaky API never blanks the board.
Standard library only, so the GitHub Action needs no install step.
"""

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "live.json"

SOURCES = {
    "busskoll": "https://busskoll-pearl.vercel.app/v1/scoreboard",
    "elvarsel": "https://elvarsel.vercel.app/v1/forecast?zone=SE3",
    "tenderlens": "https://tenderlens-eosin.vercel.app/v1/stats",
    "bolagsvakt": "https://bolagsvakt.vercel.app/health",
}


def summarise_busskoll(d):
    o = d["overall"]
    return {
        "mae_busskoll": o["mae_busskoll"],
        "mae_sl": o["mae_sl"],
        "pct_lower": round(100 * (1 - o["mae_busskoll"] / o["mae_sl"])),
        "days_beat": o["days_beat"],
        "days_scored": o["days_scored"],
        "as_of": d["as_of"],
    }


def summarise_elvarsel(d):
    pts = d["forecast"]
    peak = max(pts, key=lambda p: p["price_eur_mwh"])
    return {
        "zone": d["zone"],
        "unit": d["unit"],
        "avg": round(sum(p["price_eur_mwh"] for p in pts) / len(pts), 1),
        "peak": round(peak["price_eur_mwh"], 1),
        "peak_time": peak["time"],
        "low": round(min(p["low"] for p in pts), 1),
        "high": round(max(p["high"] for p in pts), 1),
        "hours": len(pts),
        "as_of": d["as_of"],
        # hourly [time, price, low, high] for the board's forecast chart
        "series": [[p["time"], round(p["price_eur_mwh"], 1), round(p["low"], 1), round(p["high"], 1)] for p in pts],
    }


def summarise_tenderlens(d):
    return {"expiring_12m": d["expiring_12m"], "awards": d["awards"], "buyers": d["buyers"]}


def summarise_bolagsvakt(d):
    lp = d["last_publish"]
    return {"registry_snapshot": lp["registry_snapshot"], "published_at": lp["published_at"]}


SUMMARISE = {
    "busskoll": summarise_busskoll,
    "elvarsel": summarise_elvarsel,
    "tenderlens": summarise_tenderlens,
    "bolagsvakt": summarise_bolagsvakt,
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "portfolio-snapshot"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def build(previous, fetcher, now):
    """Return the new snapshot: fresh readings where a source answered, previous ones where it failed."""
    out = {"generated_at": now, "sources": {}}
    failed = []
    for name, url in SOURCES.items():
        try:
            reading = SUMMARISE[name](fetcher(url))
            reading["fetched_at"] = now
            out["sources"][name] = reading
        except Exception as e:  # keep the last good value instead of blanking the row
            failed.append(f"{name}: {e}")
            if name in previous.get("sources", {}):
                out["sources"][name] = previous["sources"][name]
    return out, failed


def main():
    previous = json.loads(OUT.read_text()) if OUT.exists() else {}
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    snap, failed = build(previous, fetch, now)
    for f in failed:
        print("WARN", f, file=sys.stderr)
    if not snap["sources"]:
        sys.exit("no source answered and no previous snapshot; not writing")
    OUT.write_text(json.dumps(snap, indent=2) + "\n")
    print(f"wrote {OUT} ({len(snap['sources'])} sources, {len(failed)} failed)")


if __name__ == "__main__":
    main()
