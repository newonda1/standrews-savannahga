export const BOYS_PLAYERS_PATH = "/data/players.json";
export const SCHOOLS_PATH = "/data/schools.json";
export const BOYS_BASKETBALL_DATA_BASE = "/data/boys/basketball/";
export const BOYS_BASKETBALL_ROSTERS_PATH = `${BOYS_BASKETBALL_DATA_BASE}seasonrosters.json`;

export const PLAYER_GAME_STAT_FIELDS = [
  "Minutes",
  "Points",
  "Rebounds",
  "Assists",
  "Turnovers",
  "Steals",
  "Blocks",
  "ThreePM",
  "ThreePA",
  "TwoPM",
  "TwoPA",
  "FTM",
  "FTA",
];

export function buildIdMap(items, key) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const value = item?.[key];
    if (value == null || value === "") continue;
    map.set(String(value), item);
  }
  return map;
}

export function countsAsPlayerGame(stat) {
  if (typeof stat?.Played === "boolean") return stat.Played;
  return PLAYER_GAME_STAT_FIELDS.some((field) => {
    const value = Number(stat?.[field]);
    return Number.isFinite(value) && value !== 0;
  });
}

export function getPlayerName(playersOrMap, playerId) {
  const player =
    playersOrMap instanceof Map
      ? playersOrMap.get(String(playerId))
      : (Array.isArray(playersOrMap) ? playersOrMap : []).find(
          (entry) => String(entry.PlayerID) === String(playerId)
        );

  if (!player) return `Player ${playerId}`;
  return (
    player.PlayerName ||
    player.Name ||
    [player.FirstName, player.LastName].filter(Boolean).join(" ") ||
    `Player ${playerId}`
  );
}

export function seasonSlugFromYear(yearStart) {
  const year = Number(yearStart);
  if (!Number.isFinite(year)) return null;
  return `${year}-${String(year + 1).slice(-2)}`;
}

export function findSeasonRoster(seasonRosters, season) {
  const seasonText = String(season ?? "").trim();
  const seasonYear = Number(seasonText.slice(0, 4));

  return (
    (Array.isArray(seasonRosters) ? seasonRosters : []).find((roster) => {
      const rosterId = String(roster?.SeasonID ?? "").trim();
      if (rosterId === seasonText) return true;
      if (Number.isFinite(seasonYear) && rosterId.startsWith(String(seasonYear))) {
        return true;
      }
      return Number(rosterId) === Number(seasonText);
    }) || null
  );
}

export function getRosterEntriesForSeason(seasonRosters, season) {
  const roster = findSeasonRoster(seasonRosters, season);
  return Array.isArray(roster?.Players) ? roster.Players : [];
}

export function getRosterJerseyNumber(rosterEntries, playerId) {
  const entry = (Array.isArray(rosterEntries) ? rosterEntries : []).find(
    (rosterEntry) => String(rosterEntry.PlayerID) === String(playerId)
  );
  return entry?.JerseyNumber ?? "";
}

export function getSchoolName(schoolsOrMap, schoolId) {
  const school =
    schoolsOrMap instanceof Map
      ? schoolsOrMap.get(String(schoolId))
      : (Array.isArray(schoolsOrMap) ? schoolsOrMap : []).find(
          (entry) => String(entry.SchoolID) === String(schoolId)
        );

  return school?.Name || "";
}

export function getSchool(schoolsOrMap, schoolId) {
  if (!schoolId) return null;
  return schoolsOrMap instanceof Map
    ? schoolsOrMap.get(String(schoolId)) || null
    : (Array.isArray(schoolsOrMap) ? schoolsOrMap : []).find(
        (entry) => String(entry.SchoolID) === String(schoolId)
      ) || null;
}

export function getOpponentName(game, schoolsOrMap) {
  const fromSchool = getSchoolName(schoolsOrMap, game?.OpponentID);
  return fromSchool || game?.Opponent || "Unknown";
}

export function hydrateGamesWithSchools(games, schools) {
  const schoolMap = buildIdMap(schools, "SchoolID");
  return (Array.isArray(games) ? games : []).map((game) => {
    const opponentSchool = getSchool(schoolMap, game?.OpponentID);
    const opponentLocation = [opponentSchool?.City, opponentSchool?.State]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");

    return {
      ...game,
      Opponent: getOpponentName(game, schoolMap),
      OpponentLocation: opponentLocation || game.OpponentLocation,
      OpponentSchool: opponentSchool || game.OpponentSchool,
    };
  });
}
