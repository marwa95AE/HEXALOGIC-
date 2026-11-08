import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = 3100 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  server = spawn(process.execPath, ["backend/server.js", "--local"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  server.on("error", (error) => {
    throw error;
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before tests started (${server.exitCode})`);
    }
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Backend did not start before the test timeout");
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
});

test("serves website pages and static assets", async () => {
  for (const route of [
    "/",
    "/sites.html",
    "/test-sites.html",
    "/weather.html",
    "/team.html",
    "/app.js",
  ]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, `${route} should be served`);
  }
});

test("exposes the SQLite-backed site, team, and characteristic data", async () => {
  const [sitesResponse, teamResponse, characteristicResponse] = await Promise.all([
    fetch(`${origin}/api/sites`),
    fetch(`${origin}/api/team`),
    fetch(`${origin}/api/characteristics`),
  ]);
  const { sites } = await sitesResponse.json();
  const { team } = await teamResponse.json();
  const { characteristics } = await characteristicResponse.json();

  assert.equal(sites.length, 6);
  assert.equal(sites[0].id, "mcmurdo");
  assert.equal(team.length, 6);
  assert.equal(characteristics.length, 5);
});

test("ranks sites by the transparent manual score for Mars and the Moon", async () => {
  for (const target of ["mars", "moon"]) {
    const response = await fetch(`${origin}/api/site-tests?target=${target}`);
    assert.equal(response.status, 200);
    const { criteria, selectedSites, rankings } = await response.json();

    assert.equal(criteria.length, 5);
    assert.equal(criteria.reduce((total, item) => total + item.weight, 0), 100);
    assert.equal(rankings.length, 6);
    assert.equal(selectedSites.length, 3);
    assert.deepEqual(selectedSites.map((site) => site.id), rankings.slice(0, 3).map((site) => site.id));

    for (const [index, site] of rankings.entries()) {
      const expectedScore = Math.round(
        site.breakdown.reduce(
          (total, criterion) => total + criterion.score * criterion.weight,
          0,
        ) / 5,
      );
      assert.equal(site.similarity, expectedScore);
      assert.equal(site.rank, index + 1);
      assert.equal(site.selected, index < 3);
      assert.ok(site.rationale.length > 0);
    }

    assert.ok(rankings.every((site) => site.breakdown.every(
      (criterion) => Number.isInteger(criterion.score) && criterion.score >= 1 && criterion.score <= 5,
    )));
  }
});

test("rejects unknown analogy targets", async () => {
  const response = await fetch(`${origin}/api/site-tests?target=mars-like`);
  assert.equal(response.status, 400);
});

test("validates API paths and does not expose private project files", async () => {
  const [missingSite, missingWeatherSite, databaseFile, backendSource, packageManifest] =
    await Promise.all([
      fetch(`${origin}/api/sites/not-a-site`),
      fetch(`${origin}/api/weather?site=not-a-site`),
      fetch(`${origin}/backend/storage/hexalogic.sqlite`),
      fetch(`${origin}/backend/server.js`),
      fetch(`${origin}/package.json`),
    ]);

  assert.equal(missingSite.status, 404);
  assert.equal(missingWeatherSite.status, 404);
  assert.equal(databaseFile.status, 404);
  assert.equal(backendSource.status, 404);
  assert.equal(packageManifest.status, 404);
});
