console.log("Content script loaded");

// ====== CONFIG ======
const LINKS_SELECTOR = ".list table tr td.bd_title .bd_data a"; // your list selector
// ====== END CONFIG ======

// Map of state abbreviation -> full name
const STATE_MAP = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

alert("Content script running!");

async function fetchDocument(url) {
  const res = await fetch(url, { credentials: "include" }); // sends cookies
  const html = await res.text();
  return new DOMParser().parseFromString(html, "text/html");
}

// --- Helper: apply filter to listings ---
async function applyFilter(state) {
  console.log("Ok this is running during load");
  if (!state) return;

  const links = Array.from(document.querySelectorAll(LINKS_SELECTOR));
  const matches = [];

  for (let i = 0; i < links.length; i++) {
    const a = links[i];
    const href = a.href || a.getAttribute("href");
    if (!href) continue;

    try {
      const doc = await fetchDocument(href);
      const match = searchSubPages(doc, state);

      // Visual feedback on the list page
      const row = a.closest("tr") || a;
      if (match) {
        row.style.outline = "2px solid lime";
        row.style.opacity = "";
        matches.push({
          title: (a.innerText || a.textContent || "").trim(),
          url: href
        });
      } else {
        row.style.opacity = "0.4";
        row.style.outline = "2px solid #f2f2f2";
      }

      console.log(`[${i + 1}/${links.length}] ${href} → match: ${match}`);
    } catch (e) {
      console.warn("Failed to process:", href, e);
    }
  }

  // (Optional) persist matches if you want to read them later from the popup
  chrome.storage.local.set({
    aaMatches: { state, items: matches, ts: Date.now() }
  });

  console.log("Ok this is running with state. Matches:", matches);
}

// stand-alone, boolean-only
function searchSubPages(doc, state) {
  const table = doc.querySelector("table");

  // From that table, get the first row
  const firstRow = table?.querySelector("tr");

  // From that row, get the 3rd <td> (index 2)
  const locationCell = firstRow?.querySelectorAll("td")?.[2];

  // Extract text (null-safe)
  const locationText = locationCell?.innerText?.trim() || "";

  console.log("Found location:", locationText);

  const fullName = STATE_MAP[state?.toUpperCase()];
  const lc = locationText.toLowerCase();
  const abbr = (state || "").toLowerCase();
  const full = (fullName || "").toLowerCase();

  // Simple contains: abbr OR full
  return lc.includes(abbr) || (full && lc.includes(full));
}

// --- On load: get saved filter ---
chrome.storage.sync.get("filterState", ({ filterState }) => {
  if (filterState) {
    applyFilter(filterState);
  }
});

// --- Listen for changes (e.g. popup Save) ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.filterState) {
    const newState = changes.filterState.newValue;
    applyFilter(newState);
  }
});
