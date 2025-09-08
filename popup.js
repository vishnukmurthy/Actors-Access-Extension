document.getElementById("save").addEventListener("click", () => {
  const state = document.getElementById("state").value.trim();
  chrome.storage.sync.set({ filterState: state }, () => {
    alert("Saved state: " + state);
  });
  // document.getElementById("state").value = state;
});

// Reset selection and clear filter
document.getElementById("reset").addEventListener("click", () => {
  // Reset the dropdown to the first option
  document.getElementById("state").value = "";

  // Clear the filter state in storage
  chrome.storage.sync.set({ filterState: "" }, () => {
    alert("Filter reset. Showing all listings.");
  });
});

// Restore saved state when the popup opens
document.addEventListener("DOMContentLoaded", () => {
  const sel = document.getElementById("state");
  chrome.storage.sync.get("filterState", ({ filterState }) => {
    const val = (filterState || "").toUpperCase();
    // only set if it exists in the dropdown
    if ([...sel.options].some(o => o.value === val)) {
      sel.value = val;
    } else {
      sel.value = ""; // default option
    }
  });
});

