import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const storageDirectory = path.join(backendDirectory, "storage");

mkdirSync(storageDirectory, { recursive: true });

export const databasePath = path.join(storageDirectory, "hexalogic.sqlite");
export const database = new DatabaseSync(databasePath);

database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    region TEXT NOT NULL,
    counterpart TEXT NOT NULL,
    coordinates TEXT NOT NULL,
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    summary TEXT NOT NULL,
    mars_summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    group_id TEXT NOT NULL CHECK (group_id IN ('leader', 'data', 'code')),
    avatar TEXT NOT NULL,
    sort_order INTEGER NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS characteristics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    earth TEXT NOT NULL,
    mars TEXT NOT NULL,
    sort_order INTEGER NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS test_criteria (
    target TEXT NOT NULL CHECK (target IN ('mars', 'moon')),
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    weight INTEGER NOT NULL CHECK (weight BETWEEN 0 AND 100),
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (target, id),
    UNIQUE (target, sort_order)
  );

  CREATE TABLE IF NOT EXISTS site_assessments (
    target TEXT NOT NULL CHECK (target IN ('mars', 'moon')),
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scores_json TEXT NOT NULL CHECK (json_valid(scores_json)),
    rationale TEXT NOT NULL,
    PRIMARY KEY (target, site_id)
  );
`);

const sites = [
  {
    id: "mcmurdo",
    name: "McMurdo Dry Valleys",
    shortName: "McMurdo",
    region: "Antarctica",
    counterpart: "Mars South Pole",
    coordinates: "77.5°S, 162°E",
    latitude: -77.85,
    longitude: 166.66,
    summary: "Mean -20°C; extremes -65.7 to 12°C; perchlorate 49 μg/L; 58-sol Mars simulation.",
    marsSummary: "-60°C | 600 Pa | Extreme UV | Phoenix perchlorate reference",
    sortOrder: 1,
  },
  {
    id: "atacama",
    name: "Atacama Desert - Yungay",
    shortName: "Atacama",
    region: "Chile, Yungay",
    counterpart: "Valles Marineris",
    coordinates: "24.0578°S, 69.8258°W, 948 m elevation",
    latitude: -24.0578,
    longitude: -69.8258,
    summary: "Less than 2 mm/year precipitation; soil perchlorate 290–2,565 μg/kg; peak UV Index 20.",
    marsSummary: "-40°C | 700 Pa | Very high UV | Hyper-arid soil analog",
    sortOrder: 2,
  },
  {
    id: "haughton",
    name: "Haughton Crater",
    shortName: "Haughton",
    region: "Devon Island, Canada",
    counterpart: "Gale Crater",
    coordinates: "75.3667°N, 89.6833°W",
    latitude: 75.3667,
    longitude: -89.6833,
    summary: "Apparent diameter 23 km; age 31.04 ± 0.37 Ma; crater-fill thickness 125 m; volume 7 km³.",
    marsSummary: "-55°C | 650 Pa | Polar desert | Impact geology analog",
    sortOrder: 3,
  },
  {
    id: "riotinto",
    name: "Rio Tinto - Spain",
    shortName: "Rio Tinto",
    region: "Huelva, Spain",
    counterpart: "Meridiani Planum",
    coordinates: "37.7°N, 6.6°W",
    latitude: 37.7,
    longitude: -6.6,
    summary: "Acidic, iron-rich waters; pH varies by site and sampling; jarosite and sulfate minerals.",
    marsSummary: "Meridiani Planum | Jarosite and iron-sulfate mineral comparisons",
    sortOrder: 4,
  },
  {
    id: "danakil",
    name: "Danakil Depression - Ethiopia",
    shortName: "Danakil",
    region: "Dallol, Ethiopia",
    counterpart: "Columbia Hills, Gusev Crater",
    coordinates: "14.24°N, 40.30°E, approximately 155 m below sea level",
    latitude: 14.24,
    longitude: 40.3,
    summary: "Hypersaline, geothermally active environment; individual measurements vary by location.",
    marsSummary: "Gusev Crater | Silica-rich and hydrothermal mineral comparisons",
    sortOrder: 5,
  },
  {
    id: "iceland",
    name: "Askja & Vatnajökull - Iceland",
    shortName: "Askja",
    region: "Iceland",
    counterpart: "Acidalia and Arcadia Planitiae",
    coordinates: "Askja 65.03°N, 16.75°W; Vatnajökull 64.40°N, 16.80°W",
    latitude: 65.03,
    longitude: -16.75,
    summary: "Volcanic glass, glacial features, and ice-volcano interactions; Mars comparisons are orbital interpretations.",
    marsSummary: "Acidalia and Arcadia | Volcanic terrain and subsurface ice comparisons",
    sortOrder: 6,
  },
];

const teamMembers = [
  {
    id: "member-6",
    name: "محمود عصمت عز الدين",
    role: "Supervising Leader & Project Presenter",
    groupId: "leader",
    avatar: "🧑🏻‍🚀",
    sortOrder: 1,
  },
  {
    id: "member-1",
    name: "رشا محمود عويضه",
    role: "Data Analysis & Collection",
    groupId: "data",
    avatar: "👩🏻‍🚀",
    sortOrder: 2,
  },
  {
    id: "member-2",
    name: "مصطفى محمد صابر",
    role: "Data Comparison & Filtering",
    groupId: "data",
    avatar: "👨🏻‍🚀",
    sortOrder: 3,
  },
  {
    id: "member-3",
    name: "مروان إبراهيم سعدالدين",
    role: "Website Design",
    groupId: "code",
    avatar: "👨🏻‍🚀",
    sortOrder: 4,
  },
  {
    id: "member-4",
    name: "رحمة ابوبكر محمد",
    role: "Website Structure Design",
    groupId: "code",
    avatar: "👩🏻‍🚀",
    sortOrder: 5,
  },
  {
    id: "member-5",
    name: "مروة احمد عويضه",
    role: "Interactive Features Design",
    groupId: "code",
    avatar: "👩🏻‍🚀",
    sortOrder: 6,
  },
];

const characteristics = [
  {
    id: "geology",
    name: "1. Geology & Soil",
    earth: "Volcanic rocks and nutrient-poor soil.",
    mars: "High iron-oxide and silica content, similar to Martian regolith.",
    sortOrder: 1,
  },
  {
    id: "temperature",
    name: "2. Extreme Temperatures",
    earth: "Sharp temperature swings between day and night.",
    mars: "Tests equipment and space suits under sudden thermal changes.",
    sortOrder: 2,
  },
  {
    id: "radiation",
    name: "3. Radiation & Shielding",
    earth: "High levels of ultraviolet (UV) radiation.",
    mars: "Studies the effect of solar radiation on organic materials and electronics.",
    sortOrder: 3,
  },
  {
    id: "isolation",
    name: "4. Isolation & Psychological Stress",
    earth: "Geographic remoteness and difficult communication and rapid rescue.",
    mars: "Tests team readiness for long periods of isolation.",
    sortOrder: 4,
  },
  {
    id: "moisture",
    name: "5. Scarce Moisture",
    earth: "Scarce surface water and no vegetation.",
    mars: "Suitable for testing moisture-extraction and water-recycling systems (ISRU).",
    sortOrder: 5,
  },
];

const seedIfEmpty = (table, entries, columns) => {
  const count = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  if (count > 0) {
    return;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const insert = database.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );
  database.exec("BEGIN");
  try {
    for (const row of entries) {
      insert.run(...row);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
};

seedIfEmpty(
  "sites",
  sites.map((site) => [
    site.id,
    site.name,
    site.shortName,
    site.region,
    site.counterpart,
    site.coordinates,
    site.latitude,
    site.longitude,
    site.summary,
    site.marsSummary,
    site.sortOrder,
  ]),
  [
    "id",
    "name",
    "short_name",
    "region",
    "counterpart",
    "coordinates",
    "latitude",
    "longitude",
    "summary",
    "mars_summary",
    "sort_order",
  ],
);

seedIfEmpty(
  "team_members",
  teamMembers.map((member) => [
    member.id,
    member.name,
    member.role,
    member.groupId,
    member.avatar,
    member.sortOrder,
  ]),
  ["id", "name", "role", "group_id", "avatar", "sort_order"],
);

seedIfEmpty(
  "characteristics",
  characteristics.map((item) => [
    item.id,
    item.name,
    item.earth,
    item.mars,
    item.sortOrder,
  ]),
  ["id", "name", "earth", "mars", "sort_order"],
);

const testCriteria = [
  ["mars", "geology", "Geology & soil", 25, 1],
  ["mars", "dryness", "Dryness & water resources", 20, 2],
  ["mars", "temperature", "Cold & temperature extremes", 20, 3],
  ["mars", "radiation", "Radiation exposure", 15, 4],
  ["mars", "isolation", "Isolation & field operations", 20, 5],
  ["moon", "geology", "Geology & surface materials", 25, 1],
  ["moon", "dryness", "Dryness & local resources", 20, 2],
  ["moon", "temperature", "Temperature extremes", 20, 3],
  ["moon", "radiation", "Radiation & atmospheric shielding", 15, 4],
  ["moon", "isolation", "Isolation & field operations", 20, 5],
];

seedIfEmpty(
  "test_criteria",
  testCriteria,
  ["target", "id", "name", "weight", "sort_order"],
);

const rationale = {
  mars: {
    mcmurdo:
      "A cold, very dry polar desert supports cold-weather, soil, water-loss, and isolated-operations tests; its atmosphere and environment are not identical to Mars.",
    atacama:
      "Yungay provides a very dry, perchlorate-bearing soil environment and strong UV exposure for testing Mars instruments; terrestrial pressure and atmosphere differ substantially.",
    haughton:
      "An impact crater in a cold polar desert combines crater geology, shallow ground ice, and remote field operations; it does not reproduce Martian atmospheric pressure.",
    riotinto:
      "Iron- and sulfate-rich acidic waters offer a focused mineralogy and astrobiology comparison with selected Martian deposits, rather than a whole-environment match.",
    danakil:
      "Volcanic and hydrothermal terrain offers useful mineral and geochemistry comparisons; extreme heat and salinity are not typical Martian surface conditions.",
    iceland:
      "Volcanic glass, glaciers, and ice-volcano interactions help test selected geological hypotheses; Mars comparisons rely largely on orbital interpretations.",
  },
  moon: {
    mcmurdo:
      "Polar cold, dry ground, and remote operations are useful for partial lunar-polar field analogs; Antarctica cannot reproduce vacuum, lunar gravity, or lunar radiation.",
    atacama:
      "Extremely dry terrain, strong surface UV, and challenging field logistics support instrument and operations testing; the site does not simulate lunar vacuum or low gravity.",
    haughton:
      "Impact-crater geology, polar ground ice, and a remote field setting support selected lunar exploration tests; terrestrial air and gravity remain major differences.",
    riotinto:
      "Iron-rich minerals and a demanding field setting support instrument tests, but acidic liquid water is unlike the Moon's airless surface.",
    danakil:
      "Volcanic terrain, high temperatures, and mineral-rich deposits support equipment and geology comparisons; liquid brines and the atmosphere differ from lunar conditions.",
    iceland:
      "Volcanic landforms, lava, and ice create useful terrain and field-operation analogs; Iceland does not reproduce the Moon's vacuum or low gravity.",
  },
};

const assessmentScores = {
  mars: {
    mcmurdo: { geology: 4, dryness: 5, temperature: 5, radiation: 4, isolation: 5 },
    atacama: { geology: 5, dryness: 5, temperature: 4, radiation: 5, isolation: 4 },
    haughton: { geology: 5, dryness: 4, temperature: 5, radiation: 4, isolation: 5 },
    riotinto: { geology: 5, dryness: 3, temperature: 3, radiation: 4, isolation: 4 },
    danakil: { geology: 4, dryness: 3, temperature: 5, radiation: 5, isolation: 4 },
    iceland: { geology: 5, dryness: 4, temperature: 4, radiation: 3, isolation: 4 },
  },
  moon: {
    mcmurdo: { geology: 4, dryness: 4, temperature: 5, radiation: 4, isolation: 5 },
    atacama: { geology: 5, dryness: 5, temperature: 5, radiation: 5, isolation: 4 },
    haughton: { geology: 5, dryness: 4, temperature: 5, radiation: 4, isolation: 5 },
    riotinto: { geology: 4, dryness: 3, temperature: 3, radiation: 4, isolation: 4 },
    danakil: { geology: 4, dryness: 4, temperature: 5, radiation: 5, isolation: 4 },
    iceland: { geology: 5, dryness: 4, temperature: 5, radiation: 4, isolation: 4 },
  },
};

const assessmentRows = Object.entries(assessmentScores).flatMap(([target, scores]) =>
  Object.entries(scores).map(([siteId, factorScores]) => [
    target,
    siteId,
    JSON.stringify(factorScores),
    rationale[target][siteId],
  ]),
);

seedIfEmpty(
  "site_assessments",
  assessmentRows,
  ["target", "site_id", "scores_json", "rationale"],
);
