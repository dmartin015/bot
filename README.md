# Bot de Telegram — Stremio & Nuvio ("Neo")

Bot para la comunidad de Stremio & Nuvio. Hace dos cosas:

1. **Vigila 10 addons** y avisa en un canal cuando uno se cae y cuando se recupera.
2. **Responde dudas frecuentes** en el grupo (`/tutoriales`, `/sinopsis`, `/addons`, `/estado`) con enlaces a la web de tutoriales: https://stremio-and-nuvio-esp.gitbook.io/

## Addons vigilados

Se comprueba el `manifest.json` de cada uno. Comprobados el 2026-11-19, todos con HTTP 200.

| Addon | Manifest |
|---|---|
| Torrentio | torrentio.strem.fun/manifest.json |
| Peerflix | addon.peerflix.mov/manifest.json |
| PeLis | pelis-addon.com/manifest.json |
| Cometa | comet.elfhosted.com/manifest.json |
| StreamThru Torz | stremthru.13377001.xyz/stremio/torz/manifest.json |
| AnimES | pigamer37.alwaysdata.net/manifest.json |
| MediaFusion | mediafusion.elfhosted.com/manifest.json |
| Meteor | meteorfortheweebs.midnightignite.me/manifest.json |
| Sootio | sooti.info/manifest.json |
| WebStreamrMBG | 87d6a6ef6b58-webstreamrmbg.baby-beamup.club/manifest.json |

## Qué cuenta como caída

- Pide el `manifest.json` cada 5 minutos (cambiable con `CHECK_INTERVAL_MINUTES`), con 10 s de espera.
- Un addon está bien solo si responde 200 con un JSON válido que tenga `id` y `name`.
- Avisa de caída solo tras **2 fallos seguidos** (anti falsos positivos) y solo una vez por caída. Cuando vuelve, avisa de la recuperación.
- El estado se guarda en `data/state.json`, así que un reinicio no vuelve a avisar de lo mismo.

## Puesta en marcha

```bash
npm install
cp .env.example .env
# rellena .env con el token NUEVO y el canal
npm run check   # comprueba los 10 addons una vez, sin arrancar el bot
npm start
```