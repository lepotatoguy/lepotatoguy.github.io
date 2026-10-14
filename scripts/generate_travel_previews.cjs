const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const site = "https://lepotatoguy.github.io";
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function thumbnail(country, map, visits, region) {
  const count = visits.length;
  const total = map.regions.length;
  const percentage = Math.round(count / total * 100);
  const name = region ? region.name : map.name;
  const headingSize = Math.min(62, 365 / (name.length * 0.58));
  const selectedVisited = region && visits.includes(region.name);
  const label = region ? (selectedVisited ? "VISITED " : "") + map.unit.toUpperCase() : "TRAVEL MAP";
  const view = country === "us" ? "-20 -20 1015 650" : "205 -20 565 650";
  const paths = map.regions.map(item => {
    const active = region && region.name === item.name;
    const fill = active ? "#ed8155" : visits.includes(item.name) ? "#3576dc" : "#dce5f0";
    return `<path d="${escape(item.path)}" fill="${fill}" stroke="${active ? "#bd4f27" : "#f7faff"}" stroke-width="${active ? 2 : 1}" vector-effect="non-scaling-stroke"/>`;
  }).join("");
  const pin = region ? `<circle cx="${region.x}" cy="${region.y}" r="7" fill="#fff" stroke="#bd4f27" stroke-width="3"/>` : "";
  const attribution = country === "bd" ? "geoBoundaries · BBS / OCHA ROAP · CC BY 3.0 IGO" : "US Census / US Atlas";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.8" fill="#dae4ef"/></pattern></defs>
    <rect width="1200" height="630" fill="#f7faff"/>
    <rect x="425" y="30" width="740" height="530" rx="24" fill="url(#dots)"/>
    <g font-family="Arial, Helvetica, sans-serif">
      <circle cx="78" cy="79" r="26" fill="#2563eb"/><text x="78" y="89" text-anchor="middle" font-size="29" font-weight="700" fill="#fff">J</text>
      <text x="119" y="87" font-size="21" font-weight="700" letter-spacing="2" fill="#111827">JOY'S TRAVELS</text>
      <text x="54" y="168" font-size="16" letter-spacing="2" font-weight="700" fill="#2563eb">${escape(label)}</text>
      <text x="54" y="247" font-size="${headingSize}" font-weight="700" fill="#111827">${escape(name)}</text>
      <text x="54" y="285" font-size="22" fill="#6b7280">${escape(region ? map.name : "Joyanta J. Mondal")}</text>
      <text x="54" y="389" font-size="72" font-weight="700" fill="#2563eb">${count}</text>
      <text x="154" y="389" font-size="32" fill="#9ca3af">/ ${total}</text>
      <text x="54" y="425" font-size="21" fill="#374151">${escape(map.unit)}s visited</text>
      <rect x="54" y="451" width="330" height="7" rx="3.5" fill="#dce5f0"/>
      <rect x="54" y="451" width="${330 * count / total}" height="7" rx="3.5" fill="#2563eb"/>
      <text x="54" y="488" font-size="18" fill="#6b7280">${percentage}% explored</text>
      <text x="54" y="591" font-size="18" fill="#6b7280">lepotatoguy.github.io</text>
      <text x="1150" y="591" text-anchor="end" font-size="13" fill="#6b7280">${escape(attribution)}</text>
    </g>
    <svg x="440" y="45" width="710" height="500" viewBox="${view}">${paths}${pin}</svg>
  </svg>`;
}

function sharePage(country, map, visits, region, sharePath, imagePath) {
  const name = region ? region.name : map.name;
  const title = `${name} | Joyanta J. Mondal's travels`;
  const description = `${visits.length} of ${map.regions.length} ${map.unit}s visited in ${map.name}. Explore ${name} on my interactive travel map.`;
  const alt = region ? `Travel map of ${map.name} with ${region.name} highlighted.` : `Travel map of ${map.name} with visited ${map.unit}s highlighted in blue.`;
  const interactive = `/outside.html#travel/${country}${region ? "/" + slug(region.name) : ""}`;
  return `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${site}${sharePath}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Joyanta J. Mondal">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${site}${sharePath}">
  <meta property="og:image" content="${site}${imagePath}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${site}${imagePath}">
  <meta name="twitter:image:alt" content="${escape(alt)}">
  <link rel="icon" href="/images/logo.png">
  <style>body{margin:40px auto;padding:0 24px;max-width:900px;font:16px/1.6 Arial,sans-serif;color:#374151}h1{color:#111827}a{color:#2563eb}img{width:100%;height:auto;border-radius:12px}</style>
</head>
<body>
  <h1>${escape(name)}</h1>
  <p>${escape(description)}</p>
  <a href="${interactive}">Open the interactive map</a>
  <p><img src="${imagePath}" width="1200" height="630" alt="${escape(alt)}"></p>
  <script>window.location.replace(${JSON.stringify(interactive)});</script>
</body>
</html>
`;
}

async function main() {
  const maps = JSON.parse(await fs.readFile(path.join(root, "data/travel-regions.json"), "utf8"));
  const visits = JSON.parse(await fs.readFile(path.join(root, "data/travel-visits.json"), "utf8"));
  let count = 0;
  for (const [country, map] of Object.entries(maps)) {
    for (const region of [null, ...map.regions]) {
      const suffix = region ? "/" + slug(region.name) : "";
      const sharePath = `/travel/${country}${suffix}/`;
      const imagePath = `/images/travel-share/${country}/${region ? slug(region.name) : "map"}.png`;
      const htmlFile = path.join(root, sharePath, "index.html");
      const imageFile = path.join(root, imagePath);
      await fs.mkdir(path.dirname(htmlFile), { recursive: true });
      await fs.mkdir(path.dirname(imageFile), { recursive: true });
      await sharp(Buffer.from(thumbnail(country, map, visits[country], region))).png({ compressionLevel: 9 }).toFile(imageFile);
      await fs.writeFile(htmlFile, sharePage(country, map, visits[country], region, sharePath, imagePath));
      count++;
    }
  }
  console.log(`Generated ${count} share pages and matching 1200 × 630 PNG previews.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
