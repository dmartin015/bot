// Bot de Telegram — comunidad Stremio & Nuvio.
// 1) Vigila los addons de src/addons.js y avisa en el canal cuando uno
//    se cae y cuando se recupera.
// 2) Responde en el grupo con los tutoriales de la GitBook.
//
// El token NUNCA va en el código: va en .env como BOT_TOKEN.
// El canal de avisos va en .env como ALERT_CHANNEL_ID.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const ADDONS = require("./addons");
const { checkAll } = require("./monitor");

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
    return {}; // nombre -> { up, fails, downSince }
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

async function sendAlert(text) {
  if (!ALERT_CHANNEL_ID) {
    console.warn("[alerta sin canal] ALERT_CHANNEL_ID no configurado:", text.replace(/\n/g, " | "));
    return;
  }
  await bot.telegram.sendMessage(ALERT_CHANNEL_ID, text);
}

// Una pasada de vigilancia. Solo avisa cuando cambia el estado:
// up -> down (tras FAILS_TO_ALERT fallos seguidos) o down -> up.
async function tick() {
  const { results, skipped } = await checkAll(ADDONS);
  let changed = false;
  for (const r of results) {
    const prev = state[r.name] || { up: true, fails: 0, downSince: null };
    if (r.up) {
      if (!prev.up) {
        await sendAlert(`🟢 ${r.name} vuelve a estar online\nRecuperado: ${now()}\nTiempo de respuesta: ${r.ms} ms`);
      }
      state[r.name] = { up: true, fails: 0, downSince: null };
    } else {
      const fails = (prev.up ? 0 : prev.fails) + 1;
      const downSince = prev.up ? now() : prev.downSince;
      state[r.name] = { up: prev.up, fails, downSince };
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
    console.log("Sin configurar (sin URL de manifest):", skipped.map((s) => s.name).join(", "));
  }
  if (changed) saveState(state);
  const down = results.filter((r) => !r.up).map((r) => r.name);
  console.log(`[${now()}] revisión hecha. Caídos ahora: ${down.length ? down.join(", ") : "ninguno"}`);
}

// --- Comandos ---
bot.start((ctx) =>
  ctx.reply(
    "Bienvenido a la comunidad de Stremio & Nuvio.\n\n" +
      "Tutoriales: " + TUTORIALES + "\n" +
      "Comandos: /tutoriales /sinopsis /addons /estado /ayuda"
  )
);
bot.help((ctx) =>
  ctx.reply(
    "/tutoriales - web con todas las guías\n" +
      "/sinopsis - cómo ver las sinopsis en español\n" +
      "/addons - lista de addons que vigilo\n" +
      "/estado - comprueba ahora mismo si los addons están online"
  )
);
bot.command("tutoriales", (ctx) => ctx.reply("Todas las guías están aquí:\n" + TUTORIALES));
bot.command("addons", (ctx) =>
  ctx.reply("Addons que vigilo:\n" + ADDONS.map((a) => `• ${a.name}${a.url ? "" : " (sin configurar)"}`).join("\n"))
);
bot.command("sinopsis", (ctx) =>
  ctx.reply(
    "Si las sinopsis te salen en inglés es por Cinemeta, que no deja elegir idioma.\n\n" +
      "1. Instala un addon de metadatos/catálogos: TMDB es el principal, también valen AIOMetadata o XPerience.\n" +
      "2. En su configuración pon el idioma en español y guarda. TMDB pide su clave gratuita.\n" +
      "3. Ponlo primero en la lista y deja Cinemeta abajo solo de respaldo.\n\n" +
      "Guía completa: " + TUTORIALES
  )
);
bot.command("estado", async (ctx) => {
  const msg = await ctx.reply("Comprobando los addons, un momento...");
  const { results, skipped } = await checkAll(ADDONS);
  const lines = results.map((r) => `${r.up ? "🟢" : "🔴"} ${r.name} — ${r.up ? `${r.ms} ms` : r.error}`);
  for (const s of skipped) lines.push(`⚪ ${s.name} — sin configurar`);
  await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, lines.join("\n"));
});

// Respuestas automáticas a las dudas que más se repiten en el grupo.
bot.hears(/sinopsis en ingl[eé]s/i, (ctx) =>
  ctx.reply("Eso es Cinemeta. Usa /sinopsis para arreglarlo, es el mismo paso sea cual sea el addon.")
);
bot.hears(/cinemeta/i, (ctx) =>
  ctx.reply("Cinemeta no deja elegir idioma. Instala TMDB (o AIOMetadata / XPerience), ponlo en español y déjalo primero. Más en /sinopsis.")
);

bot.launch().then(() => {
  console.log("Bot arrancado. Revisión cada", CHECK_INTERVAL_MIN, "minutos.");
  tick(); // primera revisión al arrancar
  setInterval(tick, CHECK_INTERVAL_MIN * 60 * 1000);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
