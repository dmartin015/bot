// Servicios que vigila el bot, además de los addons.
// Por API siempre que se pueda, si no por la web.
// Un servicio está "up" si su API/web responde 200, no hace falta
// que devuelva un manifest (eso solo lo tienen los addons).
// section: "Servicios" para los Debrid, "Aplicaciones" para Stremio y Nuvio.
module.exports = [
  { name: "Real-Debrid", url: "https://api.real-debrid.com/rest/1.0/time", via: "API", section: "Servicios" },
  { name: "AllDebrid", url: "https://api.alldebrid.com/v4/ping", via: "API", section: "Servicios" },
  { name: "TorBox", url: "https://api.torbox.app/v1/api/stats", via: "API", section: "Servicios" },
  { name: "Stremio", url: "https://www.stremio.com/", via: "web", section: "Aplicaciones" },
  { name: "Nuvio", url: "https://nuvio.io/", via: "web", section: "Aplicaciones" },
];
