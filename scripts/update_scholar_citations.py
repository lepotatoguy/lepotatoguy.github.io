#!/usr/bin/env python3
"""Refresh data/scholar_citations.json, the snapshot behind the Scholar Impact card.

Uses SerpApi when SERPAPI_KEY is set (Google Scholar often blocks GitHub Actions
IP ranges); otherwise parses the public Scholar profile page directly.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

AUTHOR_ID = os.environ.get("SCHOLAR_AUTHOR_ID", "lIwU1F0AAAAJ")
PROFILE_URL = f"https://scholar.google.com/citations?user={AUTHOR_ID}&hl=en"
SCRAPE_URL = f"{PROFILE_URL}&pagesize=100"
DEFAULT_OUTPUT = Path("data/scholar_citations.json")
MAX_HISTORY_DAYS = 730
TOP_PAPER_COUNT = 5
REQUEST_TIMEOUT_S = 40
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

STAT_CELL = re.compile(r'<td class="gsc_rsb_std">([^<]*)</td>')
PAPER_ROW = re.compile(
    r'<tr class="gsc_a_tr">.*?'
    r'<a href="(?P<href>[^"]+)" class="gsc_a_at">(?P<title>.*?)</a>'
    r"(?P<body>.*?)"
    r'<td class="gsc_a_c">(?P<cites>.*?)</td>.*?'
    r'<td class="gsc_a_y">(?P<year>.*?)</td>',
    re.S,
)
YEAR_LABEL = re.compile(r'<span class="gsc_g_t"[^>]*>(\d{4})</span>')
YEAR_BAR = re.compile(
    r'<a[^>]*class="gsc_g_a"[^>]*z-index:(\d+)[^>]*>\s*<span class="gsc_g_al">([^<]*)</span>'
)
GRAY_DIV = re.compile(r'<div class="gs_gray">(.*?)</div>', re.S)
TAG = re.compile(r"<[^>]+>")


def http_get(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
        return response.read().decode("utf-8", errors="replace")


def to_int(value: Any) -> int | None:
    digits = re.sub(r"\D", "", str(value)) if value is not None else ""
    return int(digits) if digits else None


def clean_text(fragment: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", TAG.sub("", fragment))).strip()


def parse_yearly_histogram(page: str) -> list[dict[str, int]]:
    """Citations per year from the profile bar chart. Bars map to years via z-index
    (oldest year has the highest z-index); years without a bar had zero citations."""
    years = [int(y) for y in YEAR_LABEL.findall(page)]
    counts = {int(z): to_int(c) or 0 for z, c in YEAR_BAR.findall(page)}
    total_years = len(years)
    return [{"year": y, "citations": counts.get(total_years - i, 0)} for i, y in enumerate(years)]


def parse_scholar_page(page: str) -> dict[str, Any]:
    """Parse the public profile HTML. Stat cells: [cites all, since, h all, since, i10 all, since]."""
    stats = [to_int(clean_text(cell)) for cell in STAT_CELL.findall(page)]
    if len(stats) < 5:
        raise RuntimeError("Scholar page missing citation table (blocked or layout changed).")

    papers = []
    for row in PAPER_ROW.finditer(page):
        gray = GRAY_DIV.findall(row.group("body"))
        href = html.unescape(row.group("href"))
        papers.append(
            {
                "title": clean_text(row.group("title")),
                "year": clean_text(row.group("year")),
                "venue": clean_text(gray[1]) if len(gray) > 1 else "",
                "citations": to_int(clean_text(row.group("cites"))) or 0,
                "link": "https://scholar.google.com" + href if href.startswith("/") else href,
            }
        )
    return {
        "total_citations": stats[0],
        "h_index": stats[2],
        "i10_index": stats[4],
        "yearly": parse_yearly_histogram(page),
        "papers": papers,
        "source": "google_scholar_direct",
    }


def serpapi_metric(table: list[dict[str, Any]], key: str) -> int | None:
    for row in table:
        if key in row:
            value = row[key]
            return to_int(value.get("all") if isinstance(value, dict) else value)
    return None


def parse_serpapi(data: dict[str, Any]) -> dict[str, Any]:
    if data.get("error"):
        raise RuntimeError(f"SerpApi error: {data['error']}")
    table = (data.get("cited_by") or {}).get("table") or []
    papers = [
        {
            "title": article.get("title", ""),
            "year": str(article.get("year") or ""),
            "venue": article.get("publication") or "",
            "citations": to_int((article.get("cited_by") or {}).get("value")) or 0,
            "link": article.get("link") or "",
        }
        for article in data.get("articles") or []
    ]
    return {
        "total_citations": serpapi_metric(table, "citations"),
        "h_index": serpapi_metric(table, "h_index"),
        "i10_index": serpapi_metric(table, "i10_index"),
        "yearly": [
            {"year": int(row["year"]), "citations": to_int(row.get("citations")) or 0}
            for row in (data.get("cited_by") or {}).get("graph") or []
            if to_int(row.get("year"))
        ],
        "papers": papers,
        "source": "serpapi",
    }


def fetch_snapshot() -> dict[str, Any]:
    key = os.environ.get("SERPAPI_KEY", "").strip()
    if not key:
        return parse_scholar_page(http_get(SCRAPE_URL))
    params = {
        "engine": "google_scholar_author",
        "author_id": AUTHOR_ID,
        "hl": "en",
        "num": "100",
        "api_key": key,
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    return parse_serpapi(json.loads(http_get(url)))


def build_document(snapshot: dict[str, Any], previous: dict[str, Any], today: str) -> dict[str, Any]:
    total = snapshot.get("total_citations")
    if total is None:
        raise RuntimeError("Snapshot has no total citation count.")
    earlier = [entry for entry in previous.get("history") or [] if entry.get("date") != today]
    # Hand-entered points (source "manual") are kept forever; daily snapshots are capped.
    manual = [entry for entry in earlier if entry.get("source") == "manual"]
    daily = [entry for entry in earlier if entry.get("source") != "manual"]
    daily = (daily + [{"date": today, "total_citations": total}])[-MAX_HISTORY_DAYS:]
    history = sorted(manual + daily, key=lambda entry: entry["date"])
    papers = sorted(snapshot.get("papers") or [], key=lambda p: p.get("citations", 0), reverse=True)
    return {
        "profile": {"scholar_id": AUTHOR_ID, "scholar_url": PROFILE_URL},
        "summary": {
            "total_citations": total,
            "h_index": snapshot.get("h_index"),
            "i10_index": snapshot.get("i10_index"),
            "paper_count": len(papers),
            "updated": today,
            "updated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "source": snapshot.get("source"),
        },
        "yearly": snapshot.get("yearly") or previous.get("yearly") or [],
        "history": history,
        "top_papers": papers[:TOP_PAPER_COUNT],
    }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--soft-fail", action="store_true", help="exit 0 if the fetch fails")
    args = parser.parse_args()

    try:
        document = build_document(fetch_snapshot(), load_json(args.output), date.today().isoformat())
    except Exception as exc:  # noqa: BLE001 (network/parse errors all handled the same way)
        print(f"Scholar update failed: {exc}", file=sys.stderr)
        if os.environ.get("GITHUB_ACTIONS"):
            print(f"::warning title=Scholar update skipped::{exc}")  # surfaces on the Actions run page
        return 0 if args.soft_fail else 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = document["summary"]
    print(f"Updated: {summary['total_citations']} citations, h={summary['h_index']} ({summary['source']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
