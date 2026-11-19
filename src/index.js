// Bot de Telegram — comunidad Stremio & Nuvio.
// Vigila los addons de src/addons.js y avisa en el canal cuando uno
// se cae, cuando se recupera y cuando saca una versión nueva.
//
// El token NUNCA va en el código: va en .env como BOT_TOKEN.
// El canal de avisos va en .env como ALERT_CHANNEL_ID.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const ADDONS = require("./addons");
const { checkAddon, checkAll } = require("./monitor");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID; // ej. -1001234567890 o @canal
const CHECK_INTERVAL_MIN = Number(process.env.CHECK_INTERVAL_MINUTES || 5);
const FAILS_TO_ALERT = Number(process.env.FAILS_TO_ALERT || 2); // fallos seguidos para avisar
const TUTORIALES = "https://stremio-and-nuvio-esp.gitbook.io/";

if (!BOT_TOKEN) {
  console.error("Falta BOT_TOKEN en .env. Copia .env.example a .env y rellénalo.");
  process.exit(1);
}

const STATE_FILE = path.join(__dirname, "..", "data", "state.json");

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {}; // nombre -> { up, fails, downSince, downSinceTs, version, lastDown }
  }
}
function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const bot = new Telegraf(BOT_TOKEN);
const state = loadState();

function now() {
  return new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
}

// Log síncrono: console.log en Windows guarda la salida en un buffer
// y no se ve hasta salir con CTRL+C. Escribiendo directo a stdout
// con fs.writeSync, cada línea sale en vivo nada más escribirse.
function log(...args) {
  try {
    fs.writeSync(1, args.map((a) => String(a)).join(" ") + "\n");
  } catch {
    console.log(...args);
  }
}

function formatDuration(min) {
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

async function sendAlert(text) {
  if (!ALERT_CHANNEL_ID) {
    console.warn("[alerta sin canal] ALERT_CHANNEL_ID no configurado:", text.replace(/\n/g, " | "));
    return;
  }
  await bot.telegram.sendMessage(ALERT_CHANNEL_ID, text);
}

// Argumento de un comando: todo lo que va después de "/comando".
// Quita también el "@nombrebot" si viene pegado al comando.
function getArg(ctx) {
  const parts = ctx.message.text.trim().split(/\s+/);
  return parts.slice(1).join(" ").trim();
}

// Busca un addon por nombre (no hace falta escribirlo exacto).
function findAddon(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return (
    ADDONS.find((a) => a.name.toLowerCase() === q) ||
    ADDONS.find((a) => a.name.toLowerCase().startsWith(q)) ||
    ADDONS.find((a) => a.name.toLowerCase().includes(q)) ||
    null
  );
}

function addonNames() {
  return ADDONS.map((a) => a.name).join(", ");
}

// Una pasada de vigilancia. Solo avisa cuando cambia el estado:
// up -> down (tras FAILS_TO_ALERT fallos seguidos), down -> up,
// o cuando un addon cambia de versión.
// Si una revisión se queda colgada, la siguiente no se apila encima:
// se salta y se deja constancia en la consola.
let tickRunning = false;
async function tick() {
  if (tickRunning) {
    log(`[${now()}] revisión anterior todavía en curso, salto esta.`);
    return;
  }
  tickRunning = true;
  log(`[${now()}] comprobando addons...`);
  try {
  const { results, skipped } = await checkAll(ADDONS);
  for (const r of results) {
    log(`  ${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms${r.version ? ` (v${r.version})` : ""}` : r.error}`);
  }
  let changed = false;
  for (const r of results) {
    const prev = state[r.name] || { up: true, fails: 0, downSince: null, downSinceTs: null, version: null, lastDown: null };
    if (r.up) {
      if (!prev.up) {
        // Recuperación: guarda la caída en el historial.
        const durationMin = prev.downSinceTs ? Math.max(0, Math.round((Date.now() - prev.downSinceTs) / 60000)) : null;
        state[r.name] = {
          up: true,
          fails: 0,
          downSince: null,
          downSinceTs: null,
          version: r.version || prev.version || null,
          lastDown: prev.downSince
            ? { since: prev.downSince, until: now(), durationMin }
            : prev.lastDown || null,
        };
        await sendAlert(`🟢 ${r.name} vuelve a estar online\nRecuperado: ${now()}\nTiempo de respuesta: ${r.ms} ms`);
      } else {
        // Sigue online: avisa solo si ha cambiado de versión.
        if (prev.version && r.version && prev.version !== r.version) {
          await sendAlert(`🆕 ${r.name} nueva versión\nAntes: v${prev.version}\nAhora: v${r.version}`);
        }
        state[r.name] = { ...prev, up: true, fails: 0, downSince: null, downSinceTs: null, version: r.version || prev.version || null };
      }
    } else {
      const fails = (prev.up ? 0 : prev.fails) + 1;
      const downSince = prev.up ? now() : prev.downSince;
      const downSinceTs = prev.up ? Date.now() : prev.downSinceTs;
      state[r.name] = { ...prev, up: prev.up, fails, downSince, downSinceTs };
      if (prev.up && fails >= FAILS_TO_ALERT) {
        state[r.name].up = false;
        await sendAlert(
          `🔴 ${r.name} caído\nDesde: ${downSince}\nError: ${r.error}\nSi te falla solo a ti, revisa tu addon; si falla aquí, es el servidor del addon.`
        );
      }
    }
    if (JSON.stringify(state[r.name]) !== JSON.stringify(prev)) changed = true;
  }
  if (skipped.length) {
    log("Sin configurar (sin URL de manifest):", skipped.map((s) => s.name).join(", "));
  }
  if (changed) saveState(state);
  const down = results.filter((r) => !r.up).map((r) => r.name);
  log(`[${now()}] revisión hecha. Caídos ahora: ${down.length ? down.join(", ") : "ninguno"}`);
  } catch (err) {
    console.error(`[${now()}] error en la revisión:`, err && err.message ? err.message : err);
  } finally {
    tickRunning = false;
  }
}

// --- Comandos ---
const HELP_TEXT =
  "/estado [addon] - comprueba ahora mismo si los addons están online (o solo uno)\n" +
  "/reportar <addon> - avisa de que un addon te falla y lo compruebo al momento\n" +
  "/comprobar <enlace> - dice si un manifest funciona o no\n" +
  "/historial - última caída de cada addon y cuánto duró";

bot.start((ctx) =>
  ctx.reply("Bienvenido a la comunidad de Stremio & Nuvio.\n\nTutoriales: " + TUTORIALES + "\nComandos:\n" + HELP_TEXT)
);
bot.help((ctx) => ctx.reply(HELP_TEXT));

bot.command("estado", async (ctx) => {
  const arg = getArg(ctx);
  if (arg) {
    const addon = findAddon(arg);
    if (!addon) return ctx.reply(`No conozco ese addon. Los que vigilo son: ${addonNames()}`);
    const msg = await ctx.reply(`Comprobando ${addon.name}, un momento...`);
    const r = await checkAddon(addon);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      undefined,
      r.up
        ? `🟢 ${r.name} — ${r.ms} ms${r.version ? ` (v${r.version})` : ""}`
        : `🔴 ${r.name} — ${r.error}`
    );
    return;
  }
  const msg = await ctx.reply("Comprobando los addons, un momento...");
  const { results, skipped } = await checkAll(ADDONS);
  const lines = results.map((r) => `${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms${r.version ? ` (v${r.version})` : ""}` : r.error}`);
  for (const s of skipped) lines.push(`⚪ ${s.name} — sin configurar`);
  await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, lines.join("\n"));
});

bot.command("reportar", async (ctx) => {
  const arg = getArg(ctx);
  if (!arg) {
    return ctx.reply(`¿Qué addon te falla? Usa /reportar <nombre>, por ejemplo /reportar Torrentio.\nLos que vigilo son: ${addonNames()}`);
  }
  const addon = findAddon(arg);
  if (!addon) return ctx.reply(`No conozco ese addon. Los que vigilo son: ${addonNames()}`);
  const msg = await ctx.reply(`Comprobando ${addon.name}, un momento...`);
  const r = await checkAddon(addon);
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    msg.message_id,
    undefined,
    r.up
      ? `🟢 ${r.name} está online ahora mismo (${r.ms} ms). Si a ti te falla, revisa tu configuración del addon o tu conexión.`
      : `🔴 Confirmado: ${r.name} está caído ahora mismo (${r.error}). Lo sigo vigilando y aviso en el canal cuando vuelva.`
  );
});

bot.command("comprobar", async (ctx) => {
  const arg = getArg(ctx);
  if (!arg) {
    return ctx.reply("Pásame el enlace del manifest, por ejemplo:\n/comprobar https://ejemplo.com/manifest.json");
  }
  let url = arg.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return ctx.reply("Ese enlace no vale, revisa que sea una URL con http:// o https://");
  }
  // Si es la web del addon o el /configure, busca el manifest.
  let manifestUrl = parsed.href.replace(/\/+$/, "");
  if (manifestUrl.endsWith("/configure")) manifestUrl = manifestUrl.slice(0, -"/configure".length);
  if (!manifestUrl.endsWith("/manifest.json")) manifestUrl += "/manifest.json";

  const msg = await ctx.reply("Comprobando ese manifest, un momento...");
  const r = await checkAddon({ name: parsed.host, url: manifestUrl });
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    msg.message_id,
    undefined,
    r.up
      ? `🟢 El manifest funciona\nNombre: ${r.manifestName}\nID: ${r.manifestId}\nVersión: ${r.version || "sin versión"}\nTiempo: ${r.ms} ms\nURL: ${manifestUrl}`
      : `🔴 Ese manifest no funciona\nURL: ${manifestUrl}\nError: ${r.error}`
  );
});

bot.command("historial", (ctx) => {
  const lines = ADDONS.map((a) => {
    const s = state[a.name];
    if (!s) return `⚪ ${a.name} — sin datos todavía`;
    if (!s.up && s.downSince) return `🔴 ${a.name} — caído desde ${s.downSince}`;
    if (s.lastDown) {
      return `• ${a.name} — última caída: ${s.lastDown.since} → ${s.lastDown.until}, duró ${formatDuration(s.lastDown.durationMin ?? 0)}`;
    }
    return `• ${a.name} — sin caídas registradas`;
  });
  ctx.reply("Historial de caídas:\n" + lines.join("\n"));
});

bot.launch().then(() => {
  log("Bot arrancado. Revisión cada", CHECK_INTERVAL_MIN, "minutos.");
  tick(); // primera revisión al arrancar
  setInterval(tick, CHECK_INTERVAL_MIN * 60 * 1000);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
