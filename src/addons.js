// Lista de addons que vigila el bot ("Neo").
// Cada manifest se comprobó el 2026-11-19: todos devuelven HTTP 200 con un
// JSON válido (id + name). Si un addon cambia de dominio, cambia solo su URL aquí.
module.exports = [
  { name: "Torrentio", url: "https://torrentio.strem.fun/manifest.json" },
  { name: "Peerflix", url: "https://addon.peerflix.mov/manifest.json" },
  // OJO: peerflix.mov/manifest.json existe pero es una versión vieja (2.7.4
  // frente a 2.33.0 en addon.peerflix.mov). No usarla.
  // PeLis v3.0.0 (community.pelis.spanish). Su manifest base tiene
  // configurationRequired: true y recursos vacíos hasta configurarlo,
  // pero responde 200 con id + name, así que sirve para detectar caídas.
  { name: "PeLis", url: "https://pelis-addon.com/manifest.json" },
  { name: "Cometa", url: "https://comet.elfhosted.com/manifest.json" },
  // OJO: cometa.stremx.net/configure y /manifest.json dan 404 (comprobado
  // el 2026-11-19). Esa instancia no existe, se sigue usando ElfHosted.
  { name: "StreamThru Torz", url: "https://stremthru.13377001.xyz/stremio/torz/manifest.json" },
  { name: "AnimES", url: "https://pigamer37.alwaysdata.net/manifest.json" },
  { name: "MediaFusion", url: "https://mediafusion.elfhosted.com/manifest.json" },
  { name: "Meteor", url: "https://meteorfortheweebs.midnightignite.me/manifest.json" },
  { name: "Sootio", url: "https://sooti.info/manifest.json" },
  { name: "WebStreamrMBG", url: "https://87d6a6ef6b58-webstreamrmbg.baby-beamup.club/manifest.json" },
];
