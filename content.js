// console.log("Content script loaded");

// ====== CONFIG ======
const LINKS_SELECTOR = ".list table tr td.bd_title .bd_data a";
// ====== END CONFIG ======

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

// alert("Content script running!");

async function fetchDocument(url) {
  const res = await fetch(url, { credentials: "include" });
  const html = await res.text();
  return new DOMParser().parseFromString(html, "text/html");
}

// ---- RUN CANCELLATION TOKEN ----
let currentRunId = 0;

// --- Helper: apply filter to listings ---
async function applyFilter(state) {
  console.log("Starting scan for:", state);
  if (!state) return;

  // Bump run id; anything from older runs is ignored
  const runId = ++currentRunId;

  const links = Array.from(document.querySelectorAll(LINKS_SELECTOR));

  // RESET styles before this run so we start clean
  for (const a of links) {
    const row = a.closest("tr") || a;
    row.style.opacity = "";
    row.style.outline = "";
  }

  const matches = [];

  for (let i = 0; i < links.length; i++) {
    // If a newer run started, stop doing DOM work for this run
    if (runId !== currentRunId) {
      console.log("Cancelling old run", runId);
      return;
    }

    const a = links[i];
    const href = a.href || a.getAttribute("href");
    if (!href) continue;

    try {
      const doc = await fetchDocument(href);
      // If a newer run started while we were fetching, bail out
      if (runId !== currentRunId) return;

      const match = searchSubPages(doc, state);

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

  // Optional: persist matches
  chrome.storage.local.set({
    aaMatches: { state, items: matches, ts: Date.now() }
  });

  console.log("Scan complete for", state, "Matches:", matches.length);
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match abbr only when it's a separate token (e.g., ", TX" or "(TX)" or " TX " or "TX," or at start/end)
// Letters are A–Z; anything else counts as a separator.
function makeAbbrRegex(abbr) {
  const A = escapeForRegex(abbr.toUpperCase());
  // (^|[^A-Z])TX([^A-Z]|$)  with i flag
  return new RegExp(`(^|[^A-Z])${A}([^A-Z]|$)`, "i");
}

// Full state name: use word boundaries (works well for multi-word states like "New York")
function makeFullRegex(full) {
  const F = escapeForRegex(full);
  return new RegExp(`\\b${F}\\b`, "i");
}

function searchSubPages(doc, state) {
  const table = doc.querySelector("table");
  const firstRow = table?.querySelector("tr");
  const locationCell = firstRow?.querySelectorAll("td")?.[2];
  const raw = locationCell?.innerText?.trim() || "";

  // Normalize a bit: strip leading "Location:" and squeeze spaces
  const locationText = raw.replace(/^Location:\s*/i, "").replace(/\s+/g, " ").trim();

  const abbr = (state || "").toUpperCase();
  const fullName = STATE_MAP[abbr];

  // Build regexes
  const abbrRe = abbr ? makeAbbrRegex(abbr) : null;
  const fullRe = fullName ? makeFullRegex(fullName) : null;

  const matchAbbr = abbrRe ? abbrRe.test(locationText.toUpperCase()) : false;
  const matchFull = fullRe ? fullRe.test(locationText) : false;

  const match = matchAbbr || matchFull;

  // helpful debug
  console.log("Found location:", locationText, { matchAbbr, matchFull, match });

  return match;
}


// --- On load: get saved filter ---
chrome.storage.sync.get("filterState", ({ filterState }) => {
  if (filterState) {
    applyFilter(filterState);
  }
});

// --- Listen for changes (e.g. popup Save) ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.filterState) return;

  const newState = (changes.filterState.newValue || "").trim();

  if (!newState) {
    // Reset case: clear all outlines/opacity
    const links = Array.from(document.querySelectorAll(LINKS_SELECTOR));
    for (const a of links) {
      const row = a.closest("tr") || a;
      row.style.opacity = "";
      row.style.outline = "";
    }
    chrome.storage.local.remove("aaMatches");
    console.log("Reset view to default (no filter).");
    return;
  }

  // Otherwise, run filter
  applyFilter(newState);
});
