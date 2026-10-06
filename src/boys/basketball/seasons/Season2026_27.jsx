import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PlayerHeadshot from "../../../components/PlayerHeadshot";
import {
  RegionBracket5GameSVG,
  StateBracket12GameSVG,
} from "../components/GameCardBracketsSVG";
import {
  BOYS_BASKETBALL_ROSTERS_PATH,
  SCHOOLS_PATH,
  countsAsPlayerGame,
  getRosterEntriesForSeason,
  getRosterJerseyNumber,
  hydrateGamesWithSchools,
} from "../dataUtils";

const SEASON_ID = 2026;
const SEASON_LABEL = "2026–27";

function PlayerLink({ playerId, children }) {
  return (
    <Link
      to={"/athletics/boys/basketball/players/" + playerId}
      className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
    >
      {children}
    </Link>
  );
}

const countingStatKeys = new Set([
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
]);

const playerStatColumns = [
  { key: "Points", label: "PTS" },
  { key: "Rebounds", label: "REB" },
  { key: "Assists", label: "AST" },
  { key: "Turnovers", label: "TO" },
  { key: "AST_TO", label: "A/T", average: false },
  { key: "Steals", label: "STL" },
  { key: "Blocks", label: "BLK" },
  { key: "ThreePM", label: "3PM" },
  { key: "ThreePA", label: "3PA" },
  { key: "ThreePct", label: "3P%", average: false },
  { key: "TwoPM", label: "2PM" },
  { key: "TwoPA", label: "2PA" },
  { key: "TwoPct", label: "2P%", average: false },
  { key: "eFG", label: "eFG%", average: false },
  { key: "FTM", label: "FTM" },
  { key: "FTA", label: "FTA" },
  { key: "FTPct", label: "FT%", average: false },
];

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function createEmptyPlayerTotal(playerId) {
  return {
    PlayerID: playerId,
    GamesPlayedSet: new Set(),
    Points: 0,
    Rebounds: 0,
    Assists: 0,
    Turnovers: 0,
    Steals: 0,
    Blocks: 0,
    ThreePM: 0,
    ThreePA: 0,
    TwoPM: 0,
    TwoPA: 0,
    FTM: 0,
    FTA: 0,
  };
}

function rawPct(made, attempted) {
  const attempts = safeNumber(attempted);
  return attempts > 0 ? (safeNumber(made) / attempts) * 100 : 0;
}

function formatPct(made, attempted) {
  return safeNumber(attempted) > 0 ? rawPct(made, attempted).toFixed(1) : "-";
}

function rawEFG(player) {
  const made = safeNumber(player.TwoPM) + safeNumber(player.ThreePM);
  const attempted = safeNumber(player.TwoPA) + safeNumber(player.ThreePA);
  return attempted > 0
    ? ((made + 0.5 * safeNumber(player.ThreePM)) / attempted) * 100
    : 0;
}

function formatEFG(player) {
  const attempted = safeNumber(player.TwoPA) + safeNumber(player.ThreePA);
  return attempted > 0 ? rawEFG(player).toFixed(1) : "-";
}

function formatAssistToTurnover(player) {
  const turnovers = safeNumber(player.Turnovers);
  return turnovers > 0
    ? (safeNumber(player.Assists) / turnovers).toFixed(2)
    : "-";
}

function formatDateFromGameID(gameId) {
  const number = Number(gameId);
  if (!Number.isFinite(number)) return "";

  const year = Math.floor(number / 10000);
  const month = Math.floor(number / 100) % 100;
  const day = number % 100;

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Season2026_27() {
  const [games, setGames] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [rosterEntries, setRosterEntries] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);
  const [bracketsData, setBracketsData] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "jersey",
    direction: "asc",
  });
  const [showPerGame, setShowPerGame] = useState(false);
  const [showTeamTotals, setShowTeamTotals] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [gamesRes, statsRes, playersRes, bracketsRes, rostersRes, schoolsRes] =
          await Promise.all([
            fetch("/data/boys/basketball/games.json"),
            fetch("/data/boys/basketball/playergamestats.json"),
            fetch("/data/players.json"),
            fetch("/data/boys/basketball/brackets.json"),
            fetch(BOYS_BASKETBALL_ROSTERS_PATH),
            fetch(SCHOOLS_PATH),
          ]);

        const [
          gamesDataRaw,
          statsData,
          playersData,
          bracketsJson,
          rostersData,
          schoolsJson,
        ] = await Promise.all([
          gamesRes.json(),
          statsRes.json(),
          playersRes.json(),
          bracketsRes.json(),
          rostersRes.json(),
          schoolsRes.json(),
        ]);

        if (cancelled) return;

        const seasonGames = hydrateGamesWithSchools(gamesDataRaw, schoolsJson)
          .filter((game) => Number(game.Season) === SEASON_ID)
          .sort((a, b) => safeNumber(a.GameID) - safeNumber(b.GameID));
        const seasonGameIds = new Set(
          seasonGames.map((game) => Number(game.GameID))
        );

        setGames(seasonGames);
        setPlayerStats(
          statsData.filter((stat) => seasonGameIds.has(Number(stat.GameID)))
        );
        setPlayers(playersData);
        setRosterEntries(getRosterEntriesForSeason(rostersData, SEASON_ID));
        setSchoolsData(schoolsJson);
        setBracketsData(bracketsJson);
      } catch (error) {
        console.error(`Failed to load the ${SEASON_LABEL} season data:`, error);
        if (!cancelled) setBracketsData({});
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const playersById = useMemo(
    () => new Map(players.map((player) => [String(player.PlayerID), player])),
    [players]
  );

  const seasonTotals = useMemo(() => {
    const totalsByPlayer = new Map();

    for (const rosterEntry of rosterEntries) {
      const playerId = String(rosterEntry.PlayerID);
      totalsByPlayer.set(
        playerId,
        createEmptyPlayerTotal(rosterEntry.PlayerID)
      );
    }

    for (const stat of playerStats) {
      const playerId = String(stat.PlayerID);
      if (!totalsByPlayer.has(playerId)) {
        totalsByPlayer.set(playerId, createEmptyPlayerTotal(stat.PlayerID));
      }

      const total = totalsByPlayer.get(playerId);
      for (const key of countingStatKeys) {
        total[key] += safeNumber(stat[key]);
      }
      if (stat.GameID != null && countsAsPlayerGame(stat)) {
        total.GamesPlayedSet.add(Number(stat.GameID));
      }
    }

    return Array.from(totalsByPlayer.values()).map((total) => ({
      ...total,
      GamesPlayed: total.GamesPlayedSet.size,
    }));
  }, [playerStats, rosterEntries]);

  const teamGamesPlayed = useMemo(
    () => new Set(playerStats.map((stat) => Number(stat.GameID))).size,
    [playerStats]
  );

  const teamTotalsRow = useMemo(() => {
    const total = {
      PlayerID: "TEAM_TOTALS",
      GamesPlayed: teamGamesPlayed,
    };
    for (const key of countingStatKeys) total[key] = 0;

    for (const player of seasonTotals) {
      for (const key of countingStatKeys) {
        total[key] += safeNumber(player[key]);
      }
    }
    return total;
  }, [seasonTotals, teamGamesPlayed]);

  const getPlayerName = (playerId) => {
    const player = playersById.get(String(playerId));
    return player
      ? [player.FirstName, player.LastName].filter(Boolean).join(" ")
      : "Unknown Player";
  };

  const getJerseyNumber = (playerId) =>
    getRosterJerseyNumber(rosterEntries, playerId);

  const getSortValue = (player, key) => {
    if (key === "name") return getPlayerName(player.PlayerID).toLowerCase();
    if (key === "jersey") return safeNumber(getJerseyNumber(player.PlayerID));
    if (key === "ThreePct") return rawPct(player.ThreePM, player.ThreePA);
    if (key === "TwoPct") return rawPct(player.TwoPM, player.TwoPA);
    if (key === "FTPct") return rawPct(player.FTM, player.FTA);
    if (key === "eFG") return rawEFG(player);
    if (key === "AST_TO") {
      return safeNumber(player.Turnovers) > 0
        ? safeNumber(player.Assists) / safeNumber(player.Turnovers)
        : 0;
    }
    return safeNumber(player[key]);
  };

  const sortedSeasonTotals = useMemo(
    () =>
      [...seasonTotals].sort((a, b) => {
        const aValue = getSortValue(a, sortConfig.key);
        const bValue = getSortValue(b, sortConfig.key);
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }),
    [seasonTotals, sortConfig, rosterEntries, playersById]
  );

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const sortArrow = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "desc" ? " ↓" : " ↑";
  };

  const formatPerGame = (player, key) => {
    const gamesPlayed = safeNumber(player.GamesPlayed);
    return gamesPlayed > 0
      ? (safeNumber(player[key]) / gamesPlayed).toFixed(1)
      : "0.0";
  };

  const formatStatValue = (player, column) => {
    if (column.key === "AST_TO") return formatAssistToTurnover(player);
    if (column.key === "ThreePct") {
      return formatPct(player.ThreePM, player.ThreePA);
    }
    if (column.key === "TwoPct") return formatPct(player.TwoPM, player.TwoPA);
    if (column.key === "FTPct") return formatPct(player.FTM, player.FTA);
    if (column.key === "eFG") return formatEFG(player);
    if (showPerGame && column.average !== false) {
      return formatPerGame(player, column.key);
    }
    return safeNumber(player[column.key]);
  };

  const teamTotalsByGameId = useMemo(() => {
    const totalsByGame = new Map();
    for (const game of games) {
      totalsByGame.set(Number(game.GameID), {
        Rebounds: 0,
        Assists: 0,
        Turnovers: 0,
        Steals: 0,
        Blocks: 0,
        ThreePM: 0,
        ThreePA: 0,
        TwoPM: 0,
        TwoPA: 0,
        FTM: 0,
        FTA: 0,
      });
    }

    for (const stat of playerStats) {
      const total = totalsByGame.get(Number(stat.GameID));
      if (!total) continue;
      for (const key of Object.keys(total)) total[key] += safeNumber(stat[key]);
    }
    return totalsByGame;
  }, [games, playerStats]);

  return (
    <div className="pt-2 pb-4 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">{SEASON_LABEL} Season</h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold mt-4 mb-3">Season Preview</h2>

        <div className="text-gray-800 leading-relaxed">
          <p className="mb-4 leading-relaxed text-justify">
            St. Andrew’s enters the 2026–27 season coming off a 20–8 campaign that included another unbeaten region record and a run to the GIAA AAA state championship game. The Lions fell one game short of the state title, giving this year’s team both experience to build on and areas to improve.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The loss to Brookwood reinforced an important lesson. Small details can determine the outcome of close games. This season, St. Andrew’s will look to turn last year’s experience into better execution, greater consistency, and more ownership from its players.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <PlayerLink playerId={202405}>Page Getter</PlayerLink> returns after earning First Team All-Region and All-State honors last season. A 4.0 student, <PlayerLink playerId={202405}>Getter</PlayerLink> had a strong spring and summer competing with Redline Elite UA Rise and will take on an expanded role as a playmaker and leader. Sandy’s Spiel currently ranks him No. 52 among Georgia’s Class of 2028 prospects, and Prep Hoops also lists him among the class’s top players.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <PlayerLink playerId={202402}>Chase Brown</PlayerLink> returns as a proven shooter after earning Second Team All-Region honors last season. He continued to develop during a productive and impactful AAU season with Redline Elite UA Rise. Sandy’s Spiel currently ranks <PlayerLink playerId={202402}>Brown</PlayerLink> No. 25 among Georgia’s Class of 2028 prospects and No. 8 among shooting guards in the class. Prep Hoops also lists him among the top players in the 2028 class.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <PlayerLink playerId={202407}>Pat Jackson</PlayerLink> will also provide veteran experience and leadership.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The Lions also add several players who will bring new dimensions to the roster.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <PlayerLink playerId={202601}>Jordan Walls</PlayerLink> is the most notable newcomer. The 6-foot-9 Class of 2028 forward gives St. Andrew’s size and versatility on both ends of the floor. He can score around the basket, stretch the floor with his outside shooting, and provide a defensive presence in the paint. <PlayerLink playerId={202601}>Walls</PlayerLink> also brings club experience with Redline Elite UA Rise. Prep Hoops currently ranks him No. 58 among Georgia’s Class of 2028 prospects and No. 11 among power forwards, while Sandy’s Spiel ranks him No. 8 among the class’s power forwards.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <PlayerLink playerId={202602}>Filip Sukilovic</PlayerLink> adds more size to the frontcourt. The 6-foot-8 Class of 2027 player comes to Savannah from Serbia, where he played with KK Žitko Basket Beograd. His international experience gives the Lions another option in the frontcourt as he adjusts to a new program and level of competition.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            In the backcourt, <PlayerLink playerId={202603}>Syre Hopkins</PlayerLink> brings a different style of play. The 5-foot-10 left-handed point guard looks to create opportunities for his teammates and keep the ball moving. His ability to facilitate could become an important part of the Lions' rotation.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The coaching staff got an early look at the group during June workouts. Since then, the players have continued to build chemistry and establish expectations for the season. A key part of that process will be developing a team identity driven by the players themselves.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Offensively, St. Andrew’s plans to play with pace and purpose. The Lions will look to take advantage of transition opportunities while remaining disciplined in the half court. Defensively, the expectations remain consistent. St. Andrew’s wants to pressure the basketball, make opponents work for quality shots, and finish possessions with strong rebounding.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The team will also face a schedule designed to provide plenty of early tests. St. Andrew’s travels to South Effingham and Effingham County in November before facing GHSA 5A Winder-Barrow in the Winder Thanksgiving Classic. December includes a road matchup with Mount Vernon and a game against GHSA 7A Etowah in the Wood Elite Classic, along with holiday tournament competition.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            January begins with Saint Francis before the Lions face GHSA 7A Camden County and GHSA 6A Chapel Hill in the Sewer South Classic. Those games will provide additional opportunities to test the team before region play and the postseason.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Region play will bring its own set of challenges. St. Andrew’s enters the season with 50 consecutive region wins and five straight region championships. Those results have raised the expectations surrounding the program, while also giving every opponent additional motivation.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Savannah Country Day joins the GIAA this season and becomes part of the region, adding a new crosstown matchup to the schedule. The addition creates another important game in a region where every result will matter.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            For St. Andrew’s, the focus will be on continued development throughout the season. The Lions have experienced players returning, new contributors stepping into the program, and a schedule that will provide opportunities to grow.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The goal is to become a team that plays with consistency, responds well to adversity, and takes ownership of the details that can decide games. How well the Lions accomplish those things will shape the 2026–27 season.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4 mt-8 mb-4">
          <h2 className="text-2xl font-semibold">Schedule &amp; Results</h2>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span
              className={showTeamTotals ? "text-gray-400" : "text-gray-900 font-semibold"}
            >
              Game Result
            </span>
            <button
              type="button"
              onClick={() => setShowTeamTotals((current) => !current)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                showTeamTotals ? "bg-green-500" : "bg-gray-300"
              }`}
              aria-label="Toggle Game Result / Team Totals"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showTeamTotals ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={showTeamTotals ? "text-gray-900 font-semibold" : "text-gray-400"}
            >
              Team Totals
            </span>
          </div>
        </div>

        {games.length === 0 ? (
          <p className="text-gray-600">Schedule information will be added when available.</p>
        ) : (
          <div className="overflow-x-auto">
            {!showTeamTotals ? (
              <table className="min-w-full border text-xs sm:text-sm text-center">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Opponent</th>
                    <th className="border px-2 py-1">Result</th>
                    <th className="border px-2 py-1">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game, index) => {
                    const hasResult = game.Result === "W" || game.Result === "L";
                    return (
                      <tr
                        key={game.GameID || index}
                        className={index % 2 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="border px-2 py-1">
                          {formatDateFromGameID(game.GameID)}
                        </td>
                        <td className="border px-2 py-1">
                          {hasResult ? (
                            <Link
                              to={`/athletics/boys/basketball/games/${game.GameID}`}
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              {game.Opponent}
                            </Link>
                          ) : (
                            game.Opponent
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {game.IsComplete === "Yes" ? game.Result : ""}
                        </td>
                        <td className="border px-2 py-1 whitespace-nowrap">
                          {game.IsComplete === "Yes" && game.TeamScore != null
                            ? `${game.TeamScore} - ${game.OpponentScore}`
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full border text-xs sm:text-sm text-center whitespace-nowrap">
                <thead className="bg-gray-100">
                  <tr>
                    {[
                      "Date",
                      "Opponent",
                      "REB",
                      "AST",
                      "TO",
                      "A/T",
                      "STL",
                      "BLK",
                      "3PM",
                      "3PA",
                      "3P%",
                      "2PM",
                      "2PA",
                      "2P%",
                      "FTM",
                      "FTA",
                      "FT%",
                    ].map((label) => (
                      <th key={label} className="border px-2 py-1">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {games.map((game, index) => {
                    const total = teamTotalsByGameId.get(Number(game.GameID));
                    const values = total
                      ? [
                          total.Rebounds,
                          total.Assists,
                          total.Turnovers,
                          formatAssistToTurnover(total),
                          total.Steals,
                          total.Blocks,
                          total.ThreePM,
                          total.ThreePA,
                          formatPct(total.ThreePM, total.ThreePA),
                          total.TwoPM,
                          total.TwoPA,
                          formatPct(total.TwoPM, total.TwoPA),
                          total.FTM,
                          total.FTA,
                          formatPct(total.FTM, total.FTA),
                        ]
                      : Array(15).fill("—");

                    return (
                      <tr
                        key={game.GameID || index}
                        className={index % 2 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="border px-2 py-1">
                          {formatDateFromGameID(game.GameID)}
                        </td>
                        <td className="border px-2 py-1">{game.Opponent}</td>
                        {values.map((value, valueIndex) => (
                          <td key={valueIndex} className="border px-2 py-1">
                            {value}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Region Tournament Bracket</h2>
        {bracketsData === null ? (
          <p className="text-gray-600">Loading region bracket…</p>
        ) : bracketsData?.[String(SEASON_ID)]?.region ? (
          <RegionBracket5GameSVG
            bracket={bracketsData[String(SEASON_ID)].region}
            schools={schoolsData}
          />
        ) : (
          <p className="text-gray-600">
            Region tournament information will be added when available.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">State Tournament Bracket</h2>
        {bracketsData === null ? (
          <p className="text-gray-600">Loading state bracket…</p>
        ) : bracketsData?.[String(SEASON_ID)]?.state ? (
          <StateBracket12GameSVG
            bracket={bracketsData[String(SEASON_ID)].state}
            schools={schoolsData}
          />
        ) : (
          <p className="text-gray-600">
            State tournament information will be added when available.
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4 mt-8 mb-4">
          <h2 className="text-2xl font-semibold">Player Statistics for the Season</h2>

          <div className="flex items-center space-x-2 text-xs sm:text-sm">
            <span className={showPerGame ? "text-gray-400" : "text-gray-900 font-semibold"}>
              Season totals
            </span>
            <button
              type="button"
              onClick={() => setShowPerGame((current) => !current)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                showPerGame ? "bg-green-500" : "bg-gray-300"
              }`}
              aria-label="Toggle season totals / per game averages"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showPerGame ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <span className={showPerGame ? "text-gray-900 font-semibold" : "text-gray-400"}>
              Per game averages
            </span>
          </div>
        </div>

        {seasonTotals.length === 0 ? (
          <p className="text-gray-600">
            No player statistics are available yet for this season.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs sm:text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="border px-2 py-1 cursor-pointer sticky left-0 z-40 bg-gray-100 border-r text-center min-w-[200px]"
                    onClick={() => handleSort("name")}
                  >
                    Player{sortArrow("name")}
                  </th>
                  <th
                    className="border px-2 py-1 cursor-pointer"
                    onClick={() => handleSort("jersey")}
                  >
                    #{sortArrow("jersey")}
                  </th>
                  <th
                    className="border px-2 py-1 cursor-pointer"
                    onClick={() => handleSort("GamesPlayed")}
                  >
                    GP{sortArrow("GamesPlayed")}
                  </th>
                  {playerStatColumns.map((column) => (
                    <th
                      key={column.key}
                      className="border px-2 py-1 cursor-pointer"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      {sortArrow(column.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSeasonTotals.map((player, index) => {
                  const name = getPlayerName(player.PlayerID);
                  const rowBackground = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                  return (
                    <tr key={player.PlayerID} className={rowBackground}>
                      <td
                        className={`border px-2 py-1 text-left align-middle sticky left-0 z-20 ${rowBackground} border-r min-w-[200px]`}
                      >
                        <div className="flex items-center justify-start gap-2">
                          <PlayerHeadshot
                            playerId={player.PlayerID}
                            sportKey="boys-basketball"
                            gender="Boys"
                            name={name}
                            fallbackSrc="/images/common/logo.png"
                            className="h-8 w-8 shrink-0 rounded-full border object-cover"
                          />
                          <Link
                            to={`/athletics/boys/basketball/players/${player.PlayerID}`}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="border px-2 py-1">
                        {getJerseyNumber(player.PlayerID) || "—"}
                      </td>
                      <td className="border px-2 py-1">{player.GamesPlayed}</td>
                      {playerStatColumns.map((column) => (
                        <td key={column.key} className="border px-2 py-1">
                          {formatStatValue(player, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-1 sticky left-0 z-30 bg-gray-100 border-r text-center min-w-[200px]">
                    Team Totals
                  </td>
                  <td className="border px-2 py-1" />
                  <td className="border px-2 py-1">{teamTotalsRow.GamesPlayed}</td>
                  {playerStatColumns.map((column) => (
                    <td key={column.key} className="border px-2 py-1">
                      {formatStatValue(teamTotalsRow, column)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Season2026_27;
