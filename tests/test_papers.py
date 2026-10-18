import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPERS = json.loads((ROOT / "data" / "papers.json").read_text())

NODE_CHECK = """
const assert = require("assert");
const { filterPapers, collectTags, sortByAdded, paperLinks, notesUrl } = require(process.argv[1]);
const papers = [
  { slug: "a", title: "Bandit Paper", authors: "X", year: 2024, added: "2026-10-01", tags: ["Decision-making"] },
  { slug: "b", title: "LoRA Paper", authors: "Y", year: 2026, added: "2026-09-15", venue: "arXiv", tags: ["Fine-tuning", "Decision-making"] },
  { slug: "c", title: "Old Paper", authors: "Z", year: 2019, tags: ["Fine-tuning"] },
];
assert.deepStrictEqual(filterPapers(papers, "", "").map(p => p.slug), ["a", "b", "c"]);
assert.deepStrictEqual(filterPapers(papers, "Fine-tuning", "").map(p => p.slug), ["b", "c"]);
assert.deepStrictEqual(filterPapers(papers, "", "  lora ").map(p => p.slug), ["b"]);
assert.deepStrictEqual(filterPapers(papers, "Decision-making", "arxiv").map(p => p.slug), ["b"]);
assert.deepStrictEqual(collectTags(papers), ["Decision-making", "Fine-tuning"]);
assert.deepStrictEqual(sortByAdded(papers).map(p => p.slug), ["a", "b", "c"]);
assert.strictEqual(notesUrl({ bodyUrl: "notes/a-1.md" }), "notes/a-1.md");
assert.strictEqual(notesUrl({ bodyUrl: "https://evil.example/x.md" }), "");
assert.strictEqual(notesUrl({ bodyUrl: "notes/../x.md" }), "");
assert.deepStrictEqual(paperLinks({ arxiv: "1", doi: "d", code: "javascript:x" }).map(l => l[0]), ["arXiv", "PDF", "DOI"]);
"""


class PapersDataTest(unittest.TestCase):
    def test_entries_have_required_fields_and_unique_slugs(self):
        slugs = [p["slug"] for p in PAPERS]
        self.assertEqual(len(slugs), len(set(slugs)))
        for p in PAPERS:
            self.assertTrue(p["title"] and isinstance(p["year"], int) and p["tags"], p["slug"])
            self.assertRegex(p.get("added", "2000-01-01"), r"^\d{4}-\d{2}-\d{2}$", p["slug"])
            if "bodyUrl" in p:
                self.assertTrue((ROOT / "papers" / p["bodyUrl"]).is_file(), p["slug"])


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
