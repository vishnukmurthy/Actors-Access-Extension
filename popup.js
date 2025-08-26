document.getElementById("save").addEventListener("click", () => {
  const state = document.getElementById("state").value.trim();
  chrome.storage.sync.set({ filterState: state }, () => {
    alert("Saved state: " + state);
  });
});