const { apiKey, invokeUrl } = window.APP_CONFIG;
const apigClient = apigClientFactory.newClient({ apiKey });

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
}

// ---------- Search: GET /search?q=... (via generated SDK) ----------
document.getElementById("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  setStatus("Searching...");
  resultsEl.innerHTML = "";
  try {
    const res = await apigClient.searchGet({ q }, {}, {});
    const results = res.data.results || [];
    if (results.length === 0) {
      setStatus(`No photos found for "${q}".`);
      return;
    }
    setStatus(`${results.length} photo(s) found for "${q}".`);
    for (const photo of results) {
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      img.src = photo.url;
      img.alt = photo.labels.join(", ");
      const cap = document.createElement("figcaption");
      cap.textContent = photo.labels.join(", ");
      fig.append(img, cap);
      resultsEl.appendChild(fig);
    }
  } catch (err) {
    console.error(err);
    setStatus("Search failed - check the console.", true);
  }
});

// ---------- Upload: PUT /photos/{object} (S3 proxy) ----------
// Sent with fetch so the raw image bytes go through untouched; same API, same API key.
document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("file-input").files[0];
  if (!file) return;
  const customLabels = document
    .getElementById("labels-input")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");

  // unique, URL-safe object key
  const key = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const headers = { "Content-Type": file.type, "x-api-key": apiKey };
  if (customLabels) headers["x-amz-meta-customLabels"] = customLabels;

  setStatus("Uploading...");
  try {
    const res = await fetch(`${invokeUrl}/photos/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    setStatus(`Uploaded ${file.name}${customLabels ? ` with labels: ${customLabels}` : ""}. It will be searchable in a few seconds.`);
    e.target.reset();
  } catch (err) {
    console.error(err);
    setStatus("Upload failed - check the console.", true);
  }
});
