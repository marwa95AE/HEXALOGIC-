import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { database, databasePath } from "./database.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3000);
const host = process.argv.includes("--local") ? "127.0.0.1" : (process.env.HOST || "0.0.0.0");
const weatherTimeoutMs = 10_000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
};

const siteColumns = `
  id, name, short_name AS shortName, region, counterpart, coordinates,
  latitude, longitude, summary, mars_summary AS marsSummary
`;
const listSites = database.prepare(`SELECT ${siteColumns} FROM sites ORDER BY sort_order`);
const getSite = database.prepare(`SELECT ${siteColumns} FROM sites WHERE id = ?`);
const listTeam = database.prepare(`
  SELECT id, name, role, group_id AS groupId, avatar
  FROM team_members
  ORDER BY sort_order
`);
const listCharacteristics = database.prepare(`
  SELECT id, name, earth, mars
  FROM characteristics
  ORDER BY sort_order
`);
const listTestCriteria = database.prepare(`
  SELECT id, name, weight
  FROM test_criteria
  WHERE target = ?
  ORDER BY sort_order
`);
const listSiteAssessments = database.prepare(`
  SELECT
    sites.id, sites.name, sites.short_name AS shortName, sites.region,
    sites.counterpart, sites.coordinates, sites.latitude, sites.longitude,
    sites.summary, sites.mars_summary AS marsSummary,
    site_assessments.scores_json AS scoresJson,
    site_assessments.rationale
  FROM site_assessments
  JOIN sites ON sites.id = site_assessments.site_id
  WHERE site_assessments.target = ?
  ORDER BY sites.sort_order
`);

const getWeather = async (site) => {
  const query = new URLSearchParams({
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    current: "temperature_2m,relative_humidity_2m,surface_pressure",
    temperature_unit: "celsius",
    timezone: "auto",
  });
  const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
    signal: AbortSignal.timeout(weatherTimeoutMs),
  });

  if (!upstream.ok) {
    throw new Error(`Open-Meteo returned HTTP ${upstream.status}`);
  }

  const payload = await upstream.json();
  const current = payload.current;
  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.surface_pressure)
  ) {
    throw new Error("Open-Meteo returned incomplete current weather data");
  }

  return {
    siteId: site.id,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    pressure: current.surface_pressure,
    unit: payload.current_units || {},
    observedAt: current.time || null,
  };
};

const serveStaticFile = async (pathname, response, method) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid URL path" });
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(projectDirectory, relativePath);
  const storageDirectory = path.resolve(projectDirectory, "backend", "storage");
  const relativeFilePath = path.relative(projectDirectory, filePath);
  const pathSegments = relativeFilePath.split(path.sep);

  if (
    relativeFilePath.startsWith("..") ||
    path.isAbsolute(relativeFilePath) ||
    pathSegments.some((segment) => segment.startsWith(".")) ||
    pathSegments[0] === "backend" ||
    pathSegments[0] === "README.md" ||
    pathSegments[0] === "package.json" ||
    filePath === storageDirectory ||
    filePath.startsWith(`${storageDirectory}${path.sep}`) ||
    path.extname(filePath) === ".sqlite"
  ) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  let contents;
  try {
    contents = await readFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    throw error;
  }

  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Length": contents.length,
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : contents);
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const { pathname, searchParams } = requestUrl;

  try {
    if (pathname.startsWith("/api/")) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      if (pathname === "/api/health") {
        sendJson(response, 200, { status: "ok", database: "connected" });
        return;
      }

      if (pathname === "/api/sites") {
        sendJson(response, 200, { sites: listSites.all() });
        return;
      }

      if (pathname.startsWith("/api/sites/")) {
        const id = decodeURIComponent(pathname.slice("/api/sites/".length));
        const site = getSite.get(id);
        sendJson(response, site ? 200 : 404, site ? { site } : { error: "Site not found" });
        return;
      }

      if (pathname === "/api/team") {
        sendJson(response, 200, { team: listTeam.all() });
        return;
      }

      if (pathname === "/api/characteristics") {
        sendJson(response, 200, { characteristics: listCharacteristics.all() });
        return;
      }

      if (pathname === "/api/site-tests") {
        const target = searchParams.get("target");
        if (target !== "mars" && target !== "moon") {
          sendJson(response, 400, { error: "Target must be mars or moon" });
          return;
        }

        const criteria = listTestCriteria.all(target);
        const totalWeight = criteria.reduce((total, criterion) => total + criterion.weight, 0);
        if (criteria.length === 0 || totalWeight !== 100) {
          throw new Error(`Scoring criteria for ${target} must add up to 100`);
        }

        const rankedSites = listSiteAssessments.all(target).map((site) => {
          const scores = JSON.parse(site.scoresJson);
          const breakdown = criteria.map((criterion) => {
            const score = scores[criterion.id];
            if (!Number.isInteger(score) || score < 1 || score > 5) {
              throw new Error(`Invalid ${criterion.id} score for ${target}/${site.id}`);
            }
            return { ...criterion, score };
          });
          const similarity = Math.round(
            breakdown.reduce(
              (total, criterion) => total + criterion.score * criterion.weight,
              0,
            ) / 5,
          );

          return {
            id: site.id,
            name: site.name,
            shortName: site.shortName,
            region: site.region,
            counterpart: site.counterpart,
            coordinates: site.coordinates,
            latitude: site.latitude,
            longitude: site.longitude,
            summary: site.summary,
            marsSummary: site.marsSummary,
            similarity,
            rationale: site.rationale,
            breakdown,
          };
        });

        rankedSites.sort(
          (left, right) => right.similarity - left.similarity || left.name.localeCompare(right.name),
        );
        rankedSites.forEach((site, index) => {
          site.rank = index + 1;
          site.selected = index < 3;
        });

        sendJson(response, 200, {
          target,
          method: "Manual weighted scoring; category ratings are 1-5 and weights total 100%.",
          criteria,
          selectedSites: rankedSites.slice(0, 3),
          rankings: rankedSites,
        });
        return;
      }

      if (pathname === "/api/weather") {
        const siteId = searchParams.get("site");
        if (!siteId) {
          sendJson(response, 400, { error: "A site ID is required" });
          return;
        }

        const site = getSite.get(siteId);
        if (!site) {
          sendJson(response, 404, { error: "Site not found" });
          return;
        }

        try {
          sendJson(response, 200, { weather: await getWeather(site) });
        } catch (error) {
          console.error(`Weather request failed for ${site.id}:`, error);
          sendJson(response, 502, { error: "Current weather is unavailable" });
        }
        return;
      }

      sendJson(response, 404, { error: "API endpoint not found" });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    await serveStaticFile(pathname, response, request.method);
  } catch (error) {
    console.error("Request failed:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "Internal server error" });
    } else {
      response.destroy(error);
    }
  }
});

server.listen(port, host, () => {
  console.log(`HexaLogic backend ready at http://localhost:${port}`);
  console.log(`Database: ${databasePath}`);
  if (host === "0.0.0.0") {
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses || []) {
        if (address.family === "IPv4" && !address.internal) {
          console.log(`Local network: http://${address.address}:${port}`);
        }
      }
    }
  }
});
