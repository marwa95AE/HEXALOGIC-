# HexaLogic Mars Analog Sites

## Requirements

- Node.js 22.13 or later (the backend uses Node's built-in SQLite support).
- Internet access for live weather updates from Open-Meteo.

No third-party npm packages are required.

## Run the website and backend

From the project directory, run:

```text
node backend/server.js
```

Open `http://localhost:3000`. The first run creates and seeds
`backend/storage/hexalogic.sqlite` with the six analog sites, six team members,
and five Earth/Mars characteristics.

You can also use `npm.cmd start` on Windows.
For a one-click launch on Windows, double-click `ابدأ-الموقع.bat`; it starts
the backend and opens the site in your browser.

The server binds to the local network so the site can also be opened on a phone
or tablet connected to the same Wi-Fi. Use the `Local network` address printed
when the server starts, for example `http://192.168.1.20:3000`. If Windows
Firewall asks, allow access only on private networks.

To restrict the server to this computer, run:

```text
node backend/server.js --local
```

## API

- `GET /api/health` — backend and database status.
- `GET /api/sites` and `GET /api/sites/:id` — analog-site records.
- `GET /api/team` — team directory.
- `GET /api/characteristics` — shared Earth/Mars characteristics.
- `GET /api/site-tests?target=mars|moon` — weighted rankings, explanations,
  and the three highest-scoring terrestrial sites.
- `GET /api/weather?site=:id` — current weather for a known site.

The site test uses manually assigned 1–5 ratings and transparent criterion
weights stored in SQLite. Its percentage is `sum(rating * weight) / 5`; the
weights for each target add up to 100. It is an educational estimate, not a
scientific measurement. The test UI opens on satellite imagery with place
labels and includes terrain, street-map, and optional relief-shading layers,
fullscreen, and a control to refit all selected sites. Selecting a site zooms
to its coordinates and provides a Google Maps link. Map tiles require an
internet connection; providers are credited on the map.

API endpoints are read-only. Live weather requests are validated against site
coordinates stored in SQLite and fetched server-side from Open-Meteo. The
database is not exposed as a static file.

Run the backend checks with:

```text
node --test
```
