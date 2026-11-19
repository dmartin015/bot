// Comprobación de salud de un addon: GET a su manifest.json.
// Un addon está "up" solo si responde 200 en menos de 10 s con un JSON
// válido que tenga id y name. Cualquier otra cosa (timeout, 5xx, 404,
// HTML en vez de JSON) cuenta como fallo.
const TIMEOUT_MS = 10_000;

async function checkAddon(addon) {
  const started = Date.now();
  try {
    const res = await fetch(addon.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "stremio-nuvio-bot/0.1 (monitor)" },
    });
    const ms = Date.now() - started;
    if (!res.ok) return { name: addon.name, up: false, ms, error: `HTTP ${res.status}` };
    const json = await res.json();
    if (!json || typeof json !== "object" || !json.id || !json.name) {
      return { name: addon.name, up: false, ms, error: "manifest sin id/name" };
    }
    return { name: addon.name, up: true, ms, version: json.version || null, manifestId: json.id, manifestName: json.name };
  } catch (err) {
    const ms = Date.now() - started;
    const reason = err && err.name === "TimeoutError" ? "timeout 10s" : (err.message || "error de red");
    return { name: addon.name, up: false, ms, error: reason };
  }
}

async function checkAll(addons) {
  const configured = addons.filter((a) => a.url);
  const skipped = addons.filter((a) => !a.url);
  const results = [];
  for (const addon of configured) results.push(await checkAddon(addon));
  return { results, skipped };
}

module.exports = { checkAddon, checkAll, TIMEOUT_MS };
