// Comprobación de salud de un addon: GET a su manifest.json.
// Un addon está "up" solo si responde 200 en menos de 20 s con un JSON
// válido que tenga id y name. Cualquier otra cosa (timeout, 5xx, 404,
// HTML en vez de JSON) cuenta como fallo.
// Se comprueba UNO A UNO, en secuencial: pedir los 10 a la vez daba
// falsos positivos (algunos hosts cortaban la conexión). Si una
// petición falla, se reintenta una vez antes de darlo por caído.
const TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAddon(addon) {
  const started = Date.now();
  let lastError = "error de red";
  for (let attempt = 1; attempt <= 2; attempt++) {
    // Timeout propio con AbortController: garantiza que ninguna petición
    // se quede colgada más de TIMEOUT_MS, ni siquiera en Windows.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(addon.url, {
        signal: controller.signal,
        headers: { "User-Agent": "stremio-nuvio-bot/0.1 (monitor)" },
      });
      const ms = Date.now() - started;
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
      } else {
        const json = await res.json();
        if (!json || typeof json !== "object" || !json.id || !json.name) {
          lastError = "manifest sin id/name";
        } else {
          return { name: addon.name, up: true, ms, version: json.version || null, manifestId: json.id, manifestName: json.name };
        }
      }
    } catch (err) {
      lastError =
        err && (err.name === "TimeoutError" || err.name === "AbortError")
          ? "timeout 20s"
          : err.message || "error de red";
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 1) await sleep(RETRY_DELAY_MS);
  }
  return { name: addon.name, up: false, ms: Date.now() - started, error: lastError };
}

async function checkAll(addons) {
  const configured = addons.filter((a) => a.url);
  const skipped = addons.filter((a) => !a.url);
  const results = [];
  for (const addon of configured) results.push(await checkAddon(addon));
  return { results, skipped };
}

// Comprobación de un servicio (Debrid, Stremio, Nuvio...): basta con
// que su API o su web responda 200. No tiene manifest ni versión.
// Misma regla que los addons: uno a uno, 20 s por intento y 1 reintento.
async function checkService(service) {
  const started = Date.now();
  let lastError = "error de red";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(service.url, {
        signal: controller.signal,
        headers: { "User-Agent": "stremio-nuvio-bot/0.1 (monitor)" },
      });
      const ms = Date.now() - started;
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
      } else {
        return { name: service.name, up: true, ms, version: null };
      }
    } catch (err) {
      lastError =
        err && (err.name === "TimeoutError" || err.name === "AbortError")
          ? "timeout 20s"
          : err.message || "error de red";
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 1) await sleep(RETRY_DELAY_MS);
  }
  return { name: service.name, up: false, ms: Date.now() - started, error: lastError };
}

async function checkAllServices(services) {
  const results = [];
  for (const service of services) results.push(await checkService(service));
  return { results };
}

module.exports = { checkAddon, checkAll, checkService, checkAllServices, TIMEOUT_MS };
