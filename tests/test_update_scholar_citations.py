import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import update_scholar_citations as usc  # noqa: E402

PAGE = """
<table><tr><td class="gsc_rsb_std">1,234</td><td class="gsc_rsb_std">900</td>
<td class="gsc_rsb_std">12</td><td class="gsc_rsb_std">10</td>
<td class="gsc_rsb_std">15</td><td class="gsc_rsb_std">11</td></tr></table>
<tr class="gsc_a_tr"><td><a href="/citations?view_op=a&amp;b=1" class="gsc_a_at">Low &amp; Paper</a>
<div class="gs_gray">A Author</div><div class="gs_gray">Venue A, 2024</div></td>
<td class="gsc_a_c"><a>3</a></td><td class="gsc_a_y"><span>2024</span></td></tr>
<tr class="gsc_a_tr"><td><a href="/citations?x=2" class="gsc_a_at">High Paper</a>
<div class="gs_gray">B Author</div><div class="gs_gray">Venue B</div></td>
<td class="gsc_a_c"><a>40</a></td><td class="gsc_a_y"><span>2023</span></td></tr>
"""


class ParseScholarPageTest(unittest.TestCase):
    def test_reads_all_time_metrics_and_papers(self):
        snap = usc.parse_scholar_page(PAGE)
        self.assertEqual((snap["total_citations"], snap["h_index"], snap["i10_index"]), (1234, 12, 15))
        self.assertEqual(snap["papers"][0]["title"], "Low & Paper")
        self.assertEqual(snap["papers"][0]["venue"], "Venue A, 2024")
        self.assertEqual(snap["papers"][0]["link"], "https://scholar.google.com/citations?view_op=a&b=1")
        self.assertEqual(snap["papers"][1]["citations"], 40)

    def test_raises_when_blocked_page_has_no_stats(self):
        with self.assertRaises(RuntimeError):
            usc.parse_scholar_page("<html>unusual traffic</html>")


HISTOGRAM = (
    '<div class="gsc_md_hist_b"><span class="gsc_g_t" style="right:99px">2023</span>'
    '<span class="gsc_g_t" style="right:67px">2024</span><span class="gsc_g_t" style="right:35px">2025</span>'
    '<a href="javascript:void(0)" class="gsc_g_a" style="right:104px;top:1px;height:3px;z-index:3">'
    '<span class="gsc_g_al">13</span></a>'
    '<a href="javascript:void(0)" class="gsc_g_a" style="right:40px;top:1px;height:9px;z-index:1">'
    '<span class="gsc_g_al">1,054</span></a></div>'
)


class ParseYearlyHistogramTest(unittest.TestCase):
    def test_maps_bars_to_years_and_fills_missing_year_with_zero(self):
        self.assertEqual(
            usc.parse_yearly_histogram(HISTOGRAM),
            [{"year": 2023, "citations": 13}, {"year": 2024, "citations": 0}, {"year": 2025, "citations": 1054}],
        )

    def test_returns_empty_list_without_histogram(self):
        self.assertEqual(usc.parse_yearly_histogram(PAGE), [])


class ParseSerpapiTest(unittest.TestCase):
    def test_reads_table_and_articles(self):
        data = {
            "cited_by": {
                "table": [{"citations": {"all": 50}}, {"h_index": {"all": 4}}, {"i10_index": {"all": 2}}],
                "graph": [{"year": 2024, "citations": 3}, {"year": 2025, "citations": 9}],
            },
            "articles": [{"title": "T", "year": "2025", "publication": "V", "cited_by": {"value": 7}, "link": "L"}],
        }
        snap = usc.parse_serpapi(data)
        self.assertEqual((snap["total_citations"], snap["h_index"], snap["i10_index"]), (50, 4, 2))
        self.assertEqual(snap["papers"][0]["citations"], 7)
        self.assertEqual(snap["yearly"], [{"year": 2024, "citations": 3}, {"year": 2025, "citations": 9}])

    def test_raises_on_api_error(self):
        with self.assertRaises(RuntimeError):
            usc.parse_serpapi({"error": "Invalid API key"})


class BuildDocumentTest(unittest.TestCase):
    def test_replaces_same_day_entry_and_sorts_papers(self):
        snap = {"total_citations": 10, "papers": [{"title": "a", "citations": 1}, {"title": "b", "citations": 5}]}
        prev = {"history": [{"date": "2026-01-01", "total_citations": 8}, {"date": "2026-01-02", "total_citations": 9}]}
        doc = usc.build_document(snap, prev, "2026-01-02")
        self.assertEqual(doc["history"], [{"date": "2026-01-01", "total_citations": 8}, {"date": "2026-01-02", "total_citations": 10}])
        self.assertEqual(doc["top_papers"][0]["title"], "b")
        self.assertEqual(prev["history"][1]["total_citations"], 9)  # input not mutated

    def test_keeps_manual_points_past_history_cap_in_date_order(self):
        manual = {"date": "2020-01-01", "total_citations": 1, "source": "manual"}
        daily = [{"date": f"2021-{m:02d}-01", "total_citations": 2} for m in range(1, 4)]
        original_cap = usc.MAX_HISTORY_DAYS
        usc.MAX_HISTORY_DAYS = 2
        try:
            doc = usc.build_document({"total_citations": 5}, {"history": daily + [manual]}, "2021-04-01")
        finally:
            usc.MAX_HISTORY_DAYS = original_cap
        self.assertEqual([e["date"] for e in doc["history"]], ["2020-01-01", "2021-03-01", "2021-04-01"])

    def test_rejects_snapshot_without_total(self):
        with self.assertRaises(RuntimeError):
            usc.build_document({"papers": []}, {}, "2026-01-01")


if __name__ == "__main__":
    unittest.main()
