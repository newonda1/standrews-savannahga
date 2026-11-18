import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SCHOOLS_PATH, hydrateGamesWithSchools } from "../dataUtils";
import RecordedBoxScore from "../components/RecordedBoxScore";

function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // public/data/boys/basketball/...
  const DATA_BASE = "/data/boys/basketball/";
  const PLAYER_IMG_BASE = "/images/boys/basketball/players/";

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      try {
        const [gamesRes, statsRes, playersRes, schoolsRes] = await Promise.all([
          fetch(`${DATA_BASE}games.json`),
          fetch(`${DATA_BASE}playergamestats.json`),
          fetch("/data/players.json"),
          fetch(SCHOOLS_PATH),
        ]);

        if (!gamesRes.ok || !statsRes.ok || !playersRes.ok || !schoolsRes.ok) {
          throw new Error(
            `Fetch failed: games(${gamesRes.status}) stats(${statsRes.status}) players(${playersRes.status}) schools(${schoolsRes.status})`
          );
        }

        const [gamesDataRaw, statsData, playersData, schoolsData] = await Promise.all([
          gamesRes.json(),
          statsRes.json(),
          playersRes.json(),
          schoolsRes.json(),
        ]);

        const gamesData = hydrateGamesWithSchools(gamesDataRaw, schoolsData);

        const idNum = Number(gameId);

        const thisGame = gamesData.find((g) => Number(g.GameID) === idNum);
        const thisStats = statsData.filter((s) => Number(s.GameID) === idNum);

        if (!cancelled) {
          setGame(thisGame || null);
          setPlayerStats(thisStats || []);
          setPlayers(playersData || []);
        }
      } catch (err) {
        console.error("Failed to load game detail data:", err);
        if (!cancelled) {
          setGame(null);
          setPlayerStats([]);
          setPlayers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const getPlayerName = (playerId) => {
    const idNum = Number(playerId);

    const p =
      players.find((pl) => Number(pl.PlayerID) === idNum) ||
      players.find((pl) => Number(pl.PlayerId) === idNum) ||
      players.find((pl) => Number(pl.ID) === idNum);

    if (!p) return `Player ${playerId}`;

    const fullName =
      p.PlayerName ||
      p.Name ||
      (p.FirstName && p.LastName ? `${p.FirstName} ${p.LastName}` : null);

    return fullName || `Player ${playerId}`;
  };

  const getPlayerPhotoUrl = (playerId) => `${PLAYER_IMG_BASE}${playerId}.jpg`;

  const formatDate = (gameId) => {
    if (!gameId) return "";

    const n = Number(gameId);
    if (!Number.isFinite(n)) return "";

    const year = Math.floor(n / 10000);
    const month = Math.floor(n / 100) % 100;
    const day = n % 100;

    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      return "";
    }

    const d = new Date(Date.UTC(year, month - 1, day));

    return d.toLocaleDateString(undefined, {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPct = (made, att) => {
    const m = Number(made);
    const a = Number(att);
    if (!a || a <= 0 || isNaN(m) || isNaN(a)) return "-";
    return ((m / a) * 100).toFixed(1);
  };

  const calcEFG = (twoPM, threePM, twoPA, threePA) => {
    const tpm = Number(twoPM) || 0;
    const thpm = Number(threePM) || 0;
    const tpa = Number(twoPA) || 0;
    const thpa = Number(threePA) || 0;

    const fgm = tpm + thpm;
    const fga = tpa + thpa;
    if (!fga || fga <= 0) return "-";

    return (((fgm + 0.5 * thpm) / fga) * 100).toFixed(1);
  };

  // Build a season slug like "2025-26" from the start year in your games.json ("Season": 2025)
  const seasonSlugFromYearStart = (yearStart) => {
    const ys = Number(yearStart);
    if (!ys || isNaN(ys)) return null;
    const ye2 = String(ys + 1).slice(-2);
    return `${ys}-${ye2}`;
  };

  // ✅ Team totals row (sums across playerStats)
  const teamTotals = useMemo(() => {
    const sum = (key) =>
      playerStats.reduce((acc, s) => acc + (Number(s?.[key]) || 0), 0);

    const totals = {
      Points: sum("Points"),
      Rebounds: sum("Rebounds"),
      Assists: sum("Assists"),
      Turnovers: sum("Turnovers"),
      Steals: sum("Steals"),
      Blocks: sum("Blocks"),
      ThreePM: sum("ThreePM"),
      ThreePA: sum("ThreePA"),
      TwoPM: sum("TwoPM"),
      TwoPA: sum("TwoPA"),
      FTM: sum("FTM"),
      FTA: sum("FTA"),
    };

    return {
      ...totals,
      ThreePct: formatPct(totals.ThreePM, totals.ThreePA),
      TwoPct: formatPct(totals.TwoPM, totals.TwoPA),
      EfgPct: calcEFG(totals.TwoPM, totals.ThreePM, totals.TwoPA, totals.ThreePA),
      FtPct: formatPct(totals.FTM, totals.FTA),
    };
  }, [playerStats]);

  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  if (!game) {
    return <div className="p-4">Game not found.</div>;
  }

  const resultText =
    game.Result === "W" ? "Win" : game.Result === "L" ? "Loss" : "Result pending";

  const showScore = game.Result === "W" || game.Result === "L";
  const recordedTeams = game.BoxScore?.Teams;
  const reportedScore = recordedTeams?.map((team) => team.Totals.PTS).join("–");

  // ✅ Dynamic “Back to Season” link + label (no hard-coded season)
  const seasonSlug = seasonSlugFromYearStart(game.Season);
  const seasonPath = seasonSlug
    ? `/athletics/boys/basketball/seasons/${seasonSlug}`
    : "/athletics/boys/basketball/seasons";

  // ✅ Recap title from games.json
  const recapTitle =
    game.RecapTitle && String(game.RecapTitle).trim().length > 0
      ? game.RecapTitle
      : "Game Recap";

  const recapText =
    game.Recap && String(game.Recap).trim().length > 0 ? game.Recap : "Recap coming soon.";

  const recapImages = Array.isArray(game.RecapImages) ? game.RecapImages : [];

  return (
    <div className="p-4 space-y-6">
      <Link to={seasonPath} className="text-sm text-blue-600 hover:underline">
        {seasonSlug ? `← Back to the ${seasonSlug} Season` : "← Back to Seasons"}
      </Link>

      <header>
        <h1 className="text-2xl font-bold mb-2">
          {formatDate(game.GameID)} vs {game.Opponent}
        </h1>
        <p className="text-lg">
          {showScore
            ? `${resultText} — ${game.TeamScore}–${game.OpponentScore}`
            : reportedScore ? `Reported score — ${reportedScore}` : resultText}
        </p>
        <p className="text-sm text-gray-600">
          {game.LocationType} • {game.GameType}
        </p>
      </header>

      <section className={recordedTeams ? "max-w-3xl" : undefined}>
        <h2 className="text-xl font-semibold mb-2">{recapTitle}</h2>
        {recordedTeams ? (
          <div className="space-y-3 leading-relaxed text-gray-700">
            {recapText.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {game.PreviousMeetingGameID && (
              <Link
                to={`/athletics/boys/basketball/games/${game.PreviousMeetingGameID}`}
                className="inline-block text-sm text-blue-600 underline hover:text-blue-800"
              >
                View the previous meeting
              </Link>
            )}
          </div>
        ) : (
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{recapText}</p>
        )}
        {recapImages.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {recapImages.map((image, index) => {
              const imageSrc = typeof image === "string" ? image : image.src;
              const imageAlt =
                typeof image === "string"
                  ? `${recapTitle} clipping ${index + 1}`
                  : image.alt || `${recapTitle} clipping ${index + 1}`;
              const imageCaption = typeof image === "string" ? "" : image.caption;

              if (!imageSrc) return null;

              return (
                <figure key={imageSrc} className="w-full max-w-sm space-y-2">
                  <img
                    src={imageSrc}
                    alt={imageAlt}
                    className="max-h-[560px] w-full rounded border border-gray-200 object-contain"
                  />
                  {imageCaption && (
                    <figcaption className="text-sm text-gray-600">{imageCaption}</figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Box Score</h2>
        {recordedTeams ? (
          <RecordedBoxScore teams={recordedTeams} />
        ) : playerStats.length === 0 ? (
          <p className="text-gray-600">No player statistics recorded for this game yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs sm:text-sm text-center">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Player</th>
                  <th className="border px-2 py-1">PTS</th>
                  <th className="border px-2 py-1">REB</th>
                  <th className="border px-2 py-1">AST</th>
                  <th className="border px-2 py-1">TO</th>
                  <th className="border px-2 py-1">STL</th>
                  <th className="border px-2 py-1">BLK</th>
                  <th className="border px-2 py-1">3PM</th>
                  <th className="border px-2 py-1">3PA</th>
                  <th className="border px-2 py-1">3P%</th>
                  <th className="border px-2 py-1">2PM</th>
                  <th className="border px-2 py-1">2PA</th>
                  <th className="border px-2 py-1">2P%</th>
                  <th className="border px-2 py-1">eFG%</th>
                  <th className="border px-2 py-1">FTM</th>
                  <th className="border px-2 py-1">FTA</th>
                  <th className="border px-2 py-1">FT%</th>
                </tr>
              </thead>

              <tbody>
                {playerStats.map((s) => {
                  const threePct = formatPct(s.ThreePM, s.ThreePA);
                  const twoPct = formatPct(s.TwoPM, s.TwoPA);
                  const efgPct = calcEFG(s.TwoPM, s.ThreePM, s.TwoPA, s.ThreePA);
                  const ftPct = formatPct(s.FTM, s.FTA);

                  return (
                    <tr key={s.PlayerGameStatsID ?? `${s.GameID}-${s.PlayerID}`}>
                      <td className="border px-2 py-1 align-middle text-left">
                        <div className="flex items-center justify-start gap-2">
                          <img
                            src={getPlayerPhotoUrl(s.PlayerID)}
                            alt={getPlayerName(s.PlayerID)}
                            onError={(e) => {
                              e.currentTarget.src = "/images/common/logo.png";
                            }}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
                          <Link
                            to={`/athletics/boys/basketball/players/${s.PlayerID}`}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {getPlayerName(s.PlayerID)}
                          </Link>
                        </div>
                      </td>

                      <td className="border px-2 py-1 align-middle">{s.Points}</td>
                      <td className="border px-2 py-1 align-middle">{s.Rebounds}</td>
                      <td className="border px-2 py-1 align-middle">{s.Assists}</td>
                      <td className="border px-2 py-1 align-middle">{s.Turnovers}</td>
                      <td className="border px-2 py-1 align-middle">{s.Steals}</td>
                      <td className="border px-2 py-1 align-middle">{s.Blocks}</td>
                      <td className="border px-2 py-1 align-middle">{s.ThreePM}</td>
                      <td className="border px-2 py-1 align-middle">{s.ThreePA}</td>
                      <td className="border px-2 py-1 align-middle">{threePct}</td>
                      <td className="border px-2 py-1 align-middle">{s.TwoPM}</td>
                      <td className="border px-2 py-1 align-middle">{s.TwoPA}</td>
                      <td className="border px-2 py-1 align-middle">{twoPct}</td>
                      <td className="border px-2 py-1 align-middle">{efgPct}</td>
                      <td className="border px-2 py-1 align-middle">{s.FTM}</td>
                      <td className="border px-2 py-1 align-middle">{s.FTA}</td>
                      <td className="border px-2 py-1 align-middle">{ftPct}</td>
                    </tr>
                  );
                })}

                {/* ✅ Team Totals row styled like header row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-1 text-center">Team Totals</td>
                  <td className="border px-2 py-1">{teamTotals.Points}</td>
                  <td className="border px-2 py-1">{teamTotals.Rebounds}</td>
                  <td className="border px-2 py-1">{teamTotals.Assists}</td>
                  <td className="border px-2 py-1">{teamTotals.Turnovers}</td>
                  <td className="border px-2 py-1">{teamTotals.Steals}</td>
                  <td className="border px-2 py-1">{teamTotals.Blocks}</td>
                  <td className="border px-2 py-1">{teamTotals.ThreePM}</td>
                  <td className="border px-2 py-1">{teamTotals.ThreePA}</td>
                  <td className="border px-2 py-1">{teamTotals.ThreePct}</td>
                  <td className="border px-2 py-1">{teamTotals.TwoPM}</td>
                  <td className="border px-2 py-1">{teamTotals.TwoPA}</td>
                  <td className="border px-2 py-1">{teamTotals.TwoPct}</td>
                  <td className="border px-2 py-1">{teamTotals.EfgPct}</td>
                  <td className="border px-2 py-1">{teamTotals.FTM}</td>
                  <td className="border px-2 py-1">{teamTotals.FTA}</td>
                  <td className="border px-2 py-1">{teamTotals.FtPct}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default GameDetail;
