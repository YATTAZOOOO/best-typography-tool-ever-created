const $ = (id) => document.getElementById(id);
const statusEl = $("status");
let lastResult = "";
let lastPreview = "";

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", !!isError);
}

function renderPreview() {
  $("preview").innerHTML = $("hl").checked ? lastPreview : lastResult;
}

async function run() {
  const text = $("input").value;
  if (!text.trim()) { setStatus("Nothing to process.", false); return; }
  const payload = {
    text,
    entityType: parseInt(document.querySelector('input[name=entityType]:checked').value, 10),
    useBr: $("useBr").checked,
    useP: $("useP").checked,
    maxNobr: parseInt($("maxNobr").value, 10) || 0,
  };
  $("go").disabled = true;
  setStatus("Processing…", false);
  try {
    const res = await fetch("/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setStatus("Error: " + (data.error || res.statusText), true); return; }
    lastResult = data.result || "";
    lastPreview = data.preview || lastResult;
    $("output").value = lastResult;
    renderPreview();
    setStatus("Done.", false);
  } catch (e) {
    setStatus("Network error: " + e.message, true);
  } finally {
    $("go").disabled = false;
  }
}

$("go").addEventListener("click", run);
$("hl").addEventListener("change", renderPreview);
$("copy").addEventListener("click", async () => {
  if (!lastResult) return;
  try {
    await navigator.clipboard.writeText(lastResult);
    setStatus("Copied.", false);
  } catch {
    $("output").select();
    document.execCommand("copy");
    setStatus("Copied.", false);
  }
});
$("input").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
});
