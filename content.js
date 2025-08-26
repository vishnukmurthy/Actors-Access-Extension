console.log("Content script loaded");
alert("Content script running!");

// --- Helper: apply filter to listings ---
function applyFilter(state) {
  console.log("Ok this is running during load");
  if (!state) return; // nothing to filter yet

  // Example selector – you'll need to inspect Actors Access to adjust
  // const listings = document.querySelectorAll(".listing-card");

  // listings.forEach(listing => {
  //   const locationText = listing.innerText || "";
  //   if (locationText.includes(state)) {
  //     listing.style.display = "block"; // keep
  //   } else {
  //     listing.style.display = "none"; // hide
  //   }
  // });

  console.log("Ok this is running with state");
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
