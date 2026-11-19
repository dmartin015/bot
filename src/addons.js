// Lista de addons que vigila el bot ("Neo").
// Cada manifest se comprobó el 2026-11-19: todos devuelven HTTP 200 con un
// JSON válido (id + name). Si un addon cambia de dominio, cambia solo su URL aquí.
module.exports = [
  { name: "Torrentio", url: "https://torrentio.strem.fun/manifest.json" },
  { name: "Peerflix", url: "https://addon.peerflix.mov/manifest.json" },
  { name: "PeLis", url: "https://pelis-addon.com/manifest.json" },
  { name: "Cometa", url: "https://cometa.stremx.net/manifest.json" },
  { name: "StreamThru Torz", url: "https://stremthru.13377001.xyz/stremio/torz/manifest.json" },
  { name: "AnimES", url: "https://pigamer37.alwaysdata.net/manifest.json" },
  { name: "MediaFusion", url: "https://mediafusion.elfhosted.com/manifest.json" },
  { name: "Meteor", url: "https://meteorfortheweebs.midnightignite.me/manifest.json" },
  { name: "Sootio", url: "https://sooti.info/manifest.json" },
  { name: "WebStreamrMBG", url: "https://87d6a6ef6b58-webstreamrmbg.baby-beamup.club/manifest.json" },
];
