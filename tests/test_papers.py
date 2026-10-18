import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPERS = json.loads((ROOT / "data" / "papers.json").read_text())

NODE_CHECK = """
const assert = require("assert");
const { filterPapers, collectTags, sortByYear, paperLinks } = require(process.argv[1]);
const papers = [
  { slug: "a", title: "Bandit Paper", authors: "X", year: 2024, tags: ["Decision-making"] },
  { slug: "b", title: "LoRA Paper", authors: "Y", year: 2026, venue: "arXiv", tags: ["Fine-tuning", "Decision-making"] },
];
assert.deepStrictEqual(filterPapers(papers, "", "").map(p => p.slug), ["a", "b"]);
assert.deepStrictEqual(filterPapers(papers, "Fine-tuning", "").map(p => p.slug), ["b"]);
assert.deepStrictEqual(filterPapers(papers, "", "  lora ").map(p => p.slug), ["b"]);
assert.deepStrictEqual(filterPapers(papers, "Decision-making", "arxiv").map(p => p.slug), ["b"]);
assert.deepStrictEqual(collectTags(papers), ["Decision-making", "Fine-tuning"]);
assert.deepStrictEqual(sortByYear(papers).map(p => p.slug), ["b", "a"]);
assert.deepStrictEqual(paperLinks({ arxiv: "1", doi: "d", code: "javascript:x" }).map(l => l[0]), ["arXiv", "PDF", "DOI"]);
"""


class PapersDataTest(unittest.TestCase):
    def test_entries_have_required_fields_and_unique_slugs(self):
        slugs = [p["slug"] for p in PAPERS]
        self.assertEqual(len(slugs), len(set(slugs)))
        for p in PAPERS:
            self.assertTrue(p["title"] and isinstance(p["year"], int) and p["tags"], p["slug"])


@unittest.skipUnless(shutil.which("node"), "node not installed")
class PapersFilterTest(unittest.TestCase):
    def test_search_tag_sort_and_links(self):
        result = subprocess.run(
            ["node", "-e", NODE_CHECK, str(ROOT / "js" / "papers.js")],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
