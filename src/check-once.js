// Comprobación única sin arrancar el bot: `npm run check`.
// Útil para probar que los manifests y los servicios responden antes
// de desplegar.
const ADDONS = require("./addons");
const SERVICES = require("./services");
const { checkAll, checkAllServices } = require("./monitor");

(async () => {
  const { results, skipped } = await checkAll(ADDONS);
  for (const r of results) {
    console.log(`${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms${r.version ? ` (v${r.version})` : ""}` : r.error}`);
  }
  for (const s of skipped) console.log(`⚪ ${s.name} — sin configurar (falta la URL del manifest)`);
  console.log("— Servicios —");
  const { results: serviceResults } = await checkAllServices(SERVICES);
  for (const r of serviceResults) {
    console.log(`${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms` : r.error}`);
  }
  const allDown = [...results, ...serviceResults].some((r) => !r.up);
  process.exit(allDown ? 1 : 0);
})();
