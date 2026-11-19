// Comprobación única sin arrancar el bot: `npm run check`.
// Útil para probar que los manifests responden antes de desplegar.
const ADDONS = require("./addons");
const { checkAll } = require("./monitor");

(async () => {
  const { results, skipped } = await checkAll(ADDONS);
  for (const r of results) {
    console.log(`${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms${r.version ? ` (v${r.version})` : ""}` : r.error}`);
  }
  for (const s of skipped) console.log(`⚪ ${s.name} — sin configurar (falta la URL del manifest)`);
  process.exit(results.some((r) => !r.up) ? 1 : 0);
})();
