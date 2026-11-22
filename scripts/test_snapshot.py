"""Run: python3 scripts/test_snapshot.py (no dependencies)."""

from snapshot import build, summarise_busskoll, summarise_elvarsel

BUS = {"as_of": "t", "overall": {"mae_busskoll": 30.1, "mae_sl": 41.4, "days_beat": 21, "days_scored": 21}}
ELV = {
    "zone": "SE3", "unit": "EUR/MWh", "as_of": "t",
    "forecast": [
        {"time": "a", "price_eur_mwh": 80.0, "low": 40.0, "high": 100.0},
        {"time": "b", "price_eur_mwh": 100.0, "low": 50.0, "high": 120.0},
    ],
}


def test_busskoll_percentage():
    assert summarise_busskoll(BUS)["pct_lower"] == 27  # 1 - 30.1/41.4 = 27.3%


def test_elvarsel_avg_and_peak():
    s = summarise_elvarsel(ELV)
    assert (s["avg"], s["peak"], s["peak_time"], s["low"], s["high"]) == (90.0, 100.0, "b", 40.0, 120.0)


def test_failed_source_keeps_previous_value():
    previous = {"sources": {"tenderlens": {"expiring_12m": 1, "fetched_at": "old"}}}

    def fetcher(url):
        if "tenderlens" in url:
            raise TimeoutError("down")
        if "busskoll" in url:
            return BUS
        if "elvarsel" in url:
            return ELV
        return {"last_publish": {"registry_snapshot": "2026-11-16", "published_at": "x"}}

    snap, failed = build(previous, fetcher, "now")
    assert snap["sources"]["tenderlens"] == previous["sources"]["tenderlens"]
    assert snap["sources"]["busskoll"]["fetched_at"] == "now"
    assert len(failed) == 1


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
