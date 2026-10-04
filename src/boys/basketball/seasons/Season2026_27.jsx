import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

    for (const stat of playerStats) {
      const playerId = stat.PlayerID;
      if (!totalsByPlayer.has(playerId)) {
        totalsByPlayer.set(playerId, {
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
        });
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
  }, [playerStats]);

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
            The standard surrounding St. Andrew’s boys basketball has never
            been higher, but the message guiding the Lions into 2026–27 is a
            reminder that past success guarantees nothing:{" "}
            <strong>“Nothing Just Happens.”</strong> A year after finishing{" "}
            <strong>20–8 overall</strong>, sweeping region play at 8–0, winning
            a <strong>fifth consecutive region championship</strong>, and
            advancing to the GIAA AAA state title game, St. Andrew’s begins a
            new season with both confidence in what the program has built and
            motivation from the championship that slipped away.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            That final loss to Brookwood sharpened the lesson this group will
            carry forward: <strong>the details matter</strong>. Daily
            preparation, consistent execution, and the ability to remain
            connected through adversity separated the Lions from most of their
            opponents last season. Turning another talented roster into a
            championship team will require the same habits with even greater
            focus, purpose, and player ownership.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The foundation begins with{" "}
            <strong>Page Getter, Chase Brown, and Pat Jackson</strong>, three
            returners whose varsity experience gives the Lions stability as
            new roles take shape. Getter returns after earning{" "}
            <strong>First Team All-Region and All-State</strong> honors and
            will be asked to expand his leadership while remaining one of the
            team’s central playmakers. Brown, a{" "}
            <strong>Second Team All-Region</strong> selection, brings shooting,
            reliable production, and a growing voice. Both put together
            impactful offseasons, and the Lions expect that work to show in
            greater confidence and responsibility. Jackson’s experience will
            also be essential as he provides dependable minutes, executes his
            role, and helps reinforce the program’s standards each day.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Around that returning core is an intriguing collection of new and
            younger talent. <strong>Jordan Walls</strong>, a 6-foot-9 forward
            in the Class of 2028, gives St. Andrew’s size and versatility. He
            can finish around the basket, attack the rim, step outside to
            shoot, protect the paint, and use his mobility to switch defensively.
            Walls plays on the club circuit with Redline Elite UA Rise and is
            already drawing statewide attention. Prep Hoops lists him No. 59
            among Georgia’s 2028 prospects and No. 11 among power forwards,
            while Sandy’s Spiel separately ranks him No. 8 among the class’s
            power forwards.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            <strong>Filip Sukilovic</strong> adds another dimension to the
            frontcourt. The 6-foot-8 member of the Class of 2027 comes to St.
            Andrew’s from Serbia, where he most recently played for KK Žitko
            Basket Beograd, bringing size and international basketball
            experience to Savannah. In the backcourt,{" "}
            <strong>Syre Hopkins</strong> is a 5-foot-10 left-handed point guard
            whose pass-first approach is built around creating opportunities
            for teammates. Together with other developing players, the
            newcomers give the Lions more options and a chance to build a
            different identity around a familiar standard.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Early glimpses of that potential appeared during June workouts,
            and the progress has continued through strength training, open
            gyms, and preseason preparation. The coaching staff has seen a
            group working with greater intention in its conditioning and skill
            development while also building the camaraderie required for a
            long season. That combination of purposeful work and growing trust
            is encouraging, but leadership remains a developing part of the
            team’s story. The next step is for players to become consistent
            voices who model accountability, communication, and a team-first
            mindset without waiting for the coaches to set every tone.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Offensively, St. Andrew’s wants to play with pace and purpose. The
            Lions will look to push when opportunities appear, then rely on
            spacing, ball movement, and disciplined decisions in the half
            court. Getter and Brown provide proven production, while the
            newcomers create different ways to attack. The objective is not
            simply to accumulate scorers, but to become a connected and
            unselfish group that consistently creates quality shots for the
            right player.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            The defensive identity will be built on{" "}
            <strong>effort, discipline, and communication</strong>. St.
            Andrew’s intends to pressure the basketball, remain connected away
            from it, help with purpose, and finish possessions on the glass.
            The challenge will be sustaining that standard when shots are not
            falling or momentum shifts. Physical toughness, emotional maturity,
            and the composure to respond to mistakes will be early measures of
            whether this team’s considerable potential is becoming dependable
            performance.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            A demanding non-region schedule should reveal those qualities
            quickly. November road trips to GHSA 6A programs South Effingham
            and Effingham County are joined by a matchup with 5A Winder-Barrow
            in the Winder Thanksgiving Classic and an appearance in the
            Starr’s Mill Classic. December brings return games with Effingham
            County and South Effingham, a trip to 2A Mount Vernon, a meeting
            with 7A Etowah in the Wood Elite Classic, and appearances in the
            SCCPSS Holiday Classic and Lemon Street Classic. January adds road
            tests at 2A Saint Francis and 7A Camden County, along with a matchup
            against 6A Chapel Hill in the Sewer South Classic. Each test is an
            opportunity to learn how this group handles pressure before the
            postseason arrives.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Region opponents will offer their own challenge. Five straight
            championships ensure that St. Andrew’s will receive everyone’s
            best effort, and the accomplishments of previous teams will not win
            a single game for this one. The Lions must earn their place through
            daily improvement, disciplined preparation, and the willingness to
            put team success ahead of individual comfort. Their identity will
            be shaped by how consistently they embrace those expectations and
            how quickly leadership emerges from within the locker room.
          </p>

          <p className="mb-3 leading-relaxed text-justify">
            Wins, banners, and another postseason run remain worthy goals, but
            the larger measure of 2026–27 will be the growth of the players as
            students, teammates, and young men. The season’s theme is reflected
            in the program’s <strong>DETAILS</strong> values —{" "}
            <strong>
              Discipline, Execution, Trust, Accountability, Integrity,
              Leadership, and Sacrifice
            </strong>. If the Lions learn to take ownership, respond to
            adversity with toughness and composure, and carry those habits
            beyond the court, their success will mean more than the final
            record. Nothing just happens, and this team now has the opportunity
            to prove what intentional work can build.
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
                          <img
                            src={`/images/boys/basketball/players/${player.PlayerID}.jpg`}
                            alt={name}
                            onError={(event) => {
                              event.currentTarget.src = "/images/common/logo.png";
                            }}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
                          <Link
                            to={`/athletics/boys/basketball/players/${player.PlayerID}`}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="border px-2 py-1">{getJerseyNumber(player.PlayerID)}</td>
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
