# Travel memories

Put photos in `travel-memories/photos/` and edit `travel-memories/memories.json`. Select a state or district on the map to see its memories. Use `us` for US states and `bd` for Bangladesh districts. Region names must match `data/travel-visits.json` or `data/travel-regions.json` exactly.

Each region holds an array of memories. Each memory accepts these optional fields:

| Field | Content |
| :--- | :--- |
| `title` | Short heading |
| `date` | Visit date or date description, displayed as written |
| `caption` | Your travel note, displayed as plain text |
| `photo` | Image path relative to outside.html, such as `travel-memories/photos/your-photo.jpg` |
| `alt` | Description of the photograph |

Blank template for one Texas memory, replace empty values with your own details and remove unused fields:

```json
{
  "us": {
    "Texas": [
      {
        "title": "",
        "date": "",
        "caption": "",
        "photo": "",
        "alt": ""
      }
    ]
  },
  "bd": {}
}
```

Add multiple objects to a region's array for separate visits. Empty entries are ignored. Visited regions already have empty arrays ready to edit. No memories are included initially. Keep filenames and paths identical, including capitalization. Photo paths are relative to `outside.html`, not to this JSON file.

Copied share links use `/travel/us/` or `/travel/bd/` for whole maps. Region links append a lowercase region slug, for example `/travel/us/texas/` or `/travel/bd/cox-s-bazar/`. These pages include social preview metadata and a matching 1200 × 630 PNG, then open the interactive view. The address bar on the interactive map still uses `outside.html#travel/us/texas`.

Regenerate previews after changing visited places or map geometry. The generator needs Node.js and `sharp`; neither is needed by site visitors. With `sharp` installed in `/tmp/travel-preview-build/node_modules`, run from the repository root:

```sh
NODE_PATH=/tmp/travel-preview-build/node_modules node scripts/generate_travel_previews.cjs
```

Commit the generated `travel/` pages and `images/travel-share/` images with the source changes so previews are available when the site is published. Social platforms may cache previously fetched previews.
