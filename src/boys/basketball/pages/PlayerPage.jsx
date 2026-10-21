import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ArticleFeatureList from "../../../components/ArticleFeatureList";
import PlayerHeadshot from "../../../components/PlayerHeadshot";
import {
  BOYS_BASKETBALL_ROSTERS_PATH,
  SCHOOLS_PATH,
  countsAsPlayerGame,
  hydrateGamesWithSchools,
} from "../dataUtils";

// These must match the *field names* in playergamestats.json
const statKeys = [
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

// Map data keys -> how we want them labeled in the tables
const statLabelMap = {
  Points: "PTS",
  Rebounds: "REB",
  Assists: "AST",
  Turnovers: "TO",
  Steals: "STL",
  Blocks: "BLK",
  ThreePM: "3PM",
  ThreePA: "3PA",
  TwoPM: "2PM",
  TwoPA: "2PA",
  FTM: "FTM",
  FTA: "FTA",
};

const parseDateFromGameID = (gameId) => {
  if (!gameId) return null;

  const s = String(gameId).trim();
  if (!/^\d{8}$/.test(s)) return null;

  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const day = Number(s.slice(6, 8));

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateFromGameID = (gameId) => {
  const d = parseDateFromGameID(gameId);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const calcPct = (made, att) => {
  const m = Number(made) || 0;
  const a = Number(att) || 0;
  if (!a) return "-";
  return ((m / a) * 100).toFixed(1);
};

const calcEFG = (twoPM, threePM, twoPA, threePA) => {
  const tpm = Number(twoPM) || 0;
  const thpm = Number(threePM) || 0;
  const tpa = Number(twoPA) || 0;
  const thpa = Number(threePA) || 0;
  const denom = tpa + thpa;
  if (!denom) return "-";
  const efg = ((tpm + thpm) + 0.5 * thpm) / denom;
  return (efg * 100).toFixed(1);
};

// Format season like 2024 -> "2024-25". If already "2024-25", leave it.
const formatSeasonLabel = (seasonKey) => {
  if (!seasonKey) return "Unknown";
  const s = String(seasonKey);
  if (s.includes("-")) return s;

  const yearNum = Number(s);
  if (Number.isNaN(yearNum)) return s;

  const next = (yearNum + 1).toString().slice(-2);
  return `${yearNum}-${next}`;
};

const round1 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return x.toFixed(1);
};

// Try to detect if a game is a region game based on common fields
const isRegionGame = (game) => {
  if (!game) return false;
  const val = (v) => (v == null ? "" : String(v).toLowerCase());
  if (val(game.GameType) === "region") return true;
  if (val(game.Type) === "region") return true;
  if (val(game.Region) === "yes") return true;
  return false;
};

const getBasketballProfileBlurbs = (player) => {
  return (player?.ProfileBlurbs || []).filter(
    (entry) => String(entry?.Sport || "").toLowerCase() === "boys basketball"
  );
};

function SocialIcon({ platform }) {
  if (platform === "instagram") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="4" y="4" width="16" height="16" rx="4.2" />
        <circle cx="12" cy="12" r="3.8" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="currentColor"
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.494h2.039L6.486 3.24H4.298L17.61 20.647Z" />
    </svg>
  );
}

function PlayerPage() {
  const { playerId } = useParams();

  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [seasonRosters, setSeasonRosters] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toggle: totals vs per game
  const [showPerGame, setShowPerGame] = useState(false);

  // Load all the data we need
  useEffect(() => {
    async function loadData() {
      try {
        const [
          playersRes,
          gamesRes,
          statsRes,
          rostersRes,
          schoolsRes,
          articlesRes,
          adjustmentsRes,
        ] = await Promise.all([
          fetch("/data/players.json"),
          fetch("/data/boys/basketball/games.json"),
          fetch("/data/boys/basketball/playergamestats.json"),
          fetch(BOYS_BASKETBALL_ROSTERS_PATH),
          fetch(SCHOOLS_PATH),
          fetch("/data/boys/basketball/articles.json").catch(() => null),
          fetch("/data/boys/basketball/adjustments.json").catch(() => null),
        ]);

        if (!playersRes.ok) throw new Error(`players.json ${playersRes.status}`);
        if (!gamesRes.ok) throw new Error(`games.json ${gamesRes.status}`);
        if (!statsRes.ok) throw new Error(`playergamestats.json ${statsRes.status}`);
        if (!rostersRes.ok) throw new Error(`seasonrosters.json ${rostersRes.status}`);
        if (!schoolsRes.ok) throw new Error(`schools.json ${schoolsRes.status}`);

        const [
          playersData,
          gamesDataRaw,
          statsData,
          rostersData,
          schoolsData,
          articlesData,
          adjustmentsData,
        ] = await Promise.all([
          playersRes.json(),
          gamesRes.json(),
          statsRes.json(),
          rostersRes.json(),
          schoolsRes.json(),
          articlesRes?.ok ? articlesRes.json() : Promise.resolve([]),
          adjustmentsRes?.ok ? adjustmentsRes.json() : Promise.resolve([]),
        ]);

        setPlayers(playersData);
        setGames(hydrateGamesWithSchools(gamesDataRaw, schoolsData));
        setSeasonRosters(Array.isArray(rostersData) ? rostersData : []);
        setPlayerStats(statsData);
        setAdjustments(Array.isArray(adjustmentsData) ? adjustmentsData : []);
        setArticles(Array.isArray(articlesData) ? articlesData : []);
      } catch (err) {
        console.error("Error loading player page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // ✅ ALWAYS-CALLED memos (no hooks after early returns)

  const player = useMemo(() => {
    const idNum = Number(playerId);
    if (!Number.isFinite(idNum)) return null;

    return (
      players.find((p) => Number(p.PlayerID) === idNum) ||
      players.find((p) => Number(p.PlayerId) === idNum) ||
      players.find((p) => Number(p.ID) === idNum) ||
      null
    );
  }, [players, playerId]);

  const statsWithGameInfo = useMemo(() => {
    const idNum = Number(playerId);
    if (!Number.isFinite(idNum)) return [];

    const statsForPlayer = playerStats.filter(
      (s) => Number(s.PlayerID) === idNum
    );

    return statsForPlayer
      .map((stat) => {
        const game = games.find((g) => String(g.GameID) === String(stat.GameID));
        const gameId = game?.GameID ?? stat.GameID; // always have one
        return {
          ...stat,
          gameId,
          gameDateObj: parseDateFromGameID(gameId),
          opponent: game?.Opponent || "",
          result: game?.Result || "",
          season: game?.Season || game?.Year || "",
          isRegion: isRegionGame(game),
        };
      })
      .sort((a, b) => {
        const da = a.gameDateObj;
        const db = b.gameDateObj;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
  }, [playerStats, games, playerId]);

  const seasonTotals = useMemo(() => {
    const seasonMap = {};

    statsWithGameInfo.forEach((stat) => {
      const seasonKey = stat.season || "Unknown";

      if (!seasonMap[seasonKey]) {
        seasonMap[seasonKey] = { season: seasonKey, gamesPlayed: 0 };
        statKeys.forEach((key) => (seasonMap[seasonKey][key] = 0));
      }

      if (countsAsPlayerGame(stat)) {
        seasonMap[seasonKey].gamesPlayed += 1;
      }
      statKeys.forEach((key) => {
        seasonMap[seasonKey][key] += Number(stat[key]) || 0;
      });
    });

    adjustments
      .filter((adjustment) => Number(adjustment?.PlayerID) === Number(playerId))
      .forEach((adjustment) => {
        const seasonKey = adjustment.SeasonID || adjustment.Season || "Unknown";

        if (!seasonMap[seasonKey]) {
          seasonMap[seasonKey] = { season: seasonKey, gamesPlayed: 0 };
          statKeys.forEach((key) => (seasonMap[seasonKey][key] = 0));
        }

        seasonMap[seasonKey].gamesPlayed += Number(adjustment.GamesPlayed) || 0;
        statKeys.forEach((key) => {
          seasonMap[seasonKey][key] += Number(adjustment[key]) || 0;
        });
      });

    return Object.values(seasonMap).sort((a, b) =>
      String(a.season).localeCompare(String(b.season))
    );
  }, [adjustments, playerId, statsWithGameInfo]);

  const careerTotals = useMemo(() => {
    const base = {
      season: "Career",
      gamesPlayed: seasonTotals.reduce((t, s) => t + (s.gamesPlayed || 0), 0),
    };

    statKeys.forEach((key) => {
      base[key] = seasonTotals.reduce((t, s) => t + (s[key] || 0), 0);
    });

    return base;
  }, [seasonTotals]);

  // 🔹 NEW: Region-only season & career totals
  const regionSeasonTotals = useMemo(() => {
    const seasonMap = {};

    statsWithGameInfo.forEach((stat) => {
      if (!stat.isRegion) return;

      const seasonKey = stat.season || "Unknown";

      if (!seasonMap[seasonKey]) {
        seasonMap[seasonKey] = { season: seasonKey, gamesPlayed: 0 };
        statKeys.forEach((key) => (seasonMap[seasonKey][key] = 0));
      }

      if (countsAsPlayerGame(stat)) {
        seasonMap[seasonKey].gamesPlayed += 1;
      }
      statKeys.forEach((key) => {
        seasonMap[seasonKey][key] += Number(stat[key]) || 0;
      });
    });

    return Object.values(seasonMap).sort((a, b) =>
      String(a.season).localeCompare(String(b.season))
    );
  }, [statsWithGameInfo]);

  const regionCareerTotals = useMemo(() => {
    const base = {
      season: "Region Career",
      gamesPlayed: regionSeasonTotals.reduce(
        (t, s) => t + (s.gamesPlayed || 0),
        0
      ),
    };

    statKeys.forEach((key) => {
      base[key] = regionSeasonTotals.reduce((t, s) => t + (s[key] || 0), 0);
    });

    return base;
  }, [regionSeasonTotals]);

  const profileBlurbs = useMemo(
    () => getBasketballProfileBlurbs(player),
    [player]
  );

  const relatedArticles = useMemo(() => {
    const idNum = Number(playerId);
    if (!Number.isFinite(idNum)) return [];

    return articles.filter((article) =>
      (article.PlayerIDs || []).some((articlePlayerId) => Number(articlePlayerId) === idNum)
    );
  }, [articles, playerId]);

  const gameLogsBySeason = useMemo(() => {
    return statsWithGameInfo.reduce((acc, row) => {
      const seasonKey = row.season || "Unknown";
      if (!acc[seasonKey]) acc[seasonKey] = [];
      acc[seasonKey].push(row);
      return acc;
    }, {});
  }, [statsWithGameInfo]);

  const orderedSeasonKeys = useMemo(() => {
    return Object.keys(gameLogsBySeason).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return String(b).localeCompare(String(a));
    });
  }, [gameLogsBySeason]);

  const displayStat = (row, key) => {
    const val = Number(row[key]) || 0;
    if (!showPerGame) return val;

    const gp = Number(row.gamesPlayed) || 0;
    if (!gp) return "-";
    return round1(val / gp);
  };

  // ✅ Now safe to early-return (all hooks already executed)

  if (!playerId) return <div className="p-6">Invalid player link.</div>;
  if (loading) return <div className="p-6">Loading player information...</div>;
  if (!player) return <div className="p-6">Player not found.</div>;

  const playerName =
    player.PlayerName ||
    player.Name ||
    (player.FirstName && player.LastName
      ? `${player.FirstName} ${player.LastName}`
      : `Player ${playerId}`);

  const jerseyNumber =
    [...seasonRosters]
      .reverse()
      .flatMap((roster) => roster.Players || [])
      .find((entry) => String(entry.PlayerID) === String(playerId))?.JerseyNumber ??
    player.JerseyNumber ??
    player.Number ??
    player.Jersey ??
    null;

  const gradYear =
    player.ClassOf ??
    player.GradYear ??
    player.GraduationYear ??
    player.Class ??
    null;

  const yearsWithTeam = player.YearsWithTeam || "";
  const height = player.HeightInches
    ? `${Math.floor(player.HeightInches / 12)}′${player.HeightInches % 12}″`
    : "";
  const playerDetails = [
    jerseyNumber != null ? `#${jerseyNumber}` : "",
    gradYear ? `Class of ${gradYear}` : "",
    height,
    player.WeightLbs ? `${player.WeightLbs} lb` : "",
  ].filter(Boolean);
  const socialLinks = [
    player.InstagramHandle && {
      label: "Instagram",
      platform: "instagram",
      handle: player.InstagramHandle,
      href: `https://www.instagram.com/${encodeURIComponent(player.InstagramHandle)}/`,
    },
    player.XHandle && {
      label: "X",
      platform: "x",
      handle: player.XHandle,
      href: `https://x.com/${encodeURIComponent(player.XHandle)}`,
    },
  ].filter(Boolean);

  return (
    <div className="player-page max-w-5xl mx-auto p-4 space-y-8">
      <header className="flex items-center gap-4 mb-4">
        <PlayerHeadshot
          playerId={playerId}
          sportKey="boys-basketball"
          gender="Boys"
          name={playerName}
          fallbackSrc="/images/common/logo.png"
          className="h-24 w-24 shrink-0 rounded-full border object-cover"
          fallbackClassName="h-24 w-24 shrink-0 rounded-full border bg-white object-contain p-3"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{playerName}</h1>

          {playerDetails.length > 0 && (
            <p className="text-gray-700 text-lg">
              {playerDetails.join(" • ")}
            </p>
          )}

          {socialLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${playerName} on ${social.label} (@${social.handle})`}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 no-underline transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <SocialIcon platform={social.platform} />
                  <span className="min-w-0 break-all">@{social.handle}</span>
                </a>
              ))}
            </div>
          )}

          {yearsWithTeam && (
            <p className="text-gray-600 text-lg">
              St. Andrew&apos;s Lions • {yearsWithTeam}
            </p>
          )}
        </div>
      </header>

      <ArticleFeatureList
        articles={relatedArticles}
        basePath="/athletics/boys/basketball"
        heading="Featured Articles"
      />

      {profileBlurbs.length > 0 && (
        <section className="space-y-4">
          {profileBlurbs.map((blurb, index) => (
            <article
              key={`${blurb.SourceDate || "source"}-${index}`}
              className="overflow-hidden rounded border border-blue-100 bg-blue-50 text-slate-800"
            >
              {blurb.Image && (
                <img
                  src={blurb.Image}
                  alt={blurb.ImageAlt || blurb.Headline || `${playerName} profile clipping`}
                  className="w-full border-b border-blue-100 object-contain"
                  loading="lazy"
                />
              )}
              <div className="px-4 py-4">
                {blurb.Headline && (
                  <h2 className="mb-2 text-lg font-bold text-slate-950">
                    {blurb.Headline}
                  </h2>
                )}
                {blurb.Text && <p className="text-base leading-7">{blurb.Text}</p>}
                {blurb.Quote && (
                  <blockquote className="mt-3 border-l-4 border-blue-700 pl-3 text-base italic leading-7 text-slate-700">
                    &ldquo;{blurb.Quote}&rdquo;
                  </blockquote>
                )}
                {[blurb.SourcePublication, blurb.SourceDate, blurb.SourceTitle]
                  .filter(Boolean)
                  .length > 0 && (
                  <div className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    Source: {[blurb.SourcePublication, blurb.SourceDate]
                      .filter(Boolean)
                      .join(", ")}
                    {blurb.SourceTitle ? `, "${blurb.SourceTitle}"` : ""}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Overall career totals */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold">Career Totals</h2>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Totals</span>

            <button
              type="button"
              onClick={() => setShowPerGame((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPerGame ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-pressed={showPerGame}
              aria-label="Toggle totals vs per-game"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  showPerGame ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>

            <span className="text-sm text-gray-600 whitespace-nowrap">
              Per Game
            </span>
          </div>
        </div>

        {seasonTotals.length === 0 ? (
          <p>No stats available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center">Season</th>
                  <th className="border px-2 py-1 text-center">GP</th>
                  {statKeys.map((key) => (
                    <React.Fragment key={key}>
                      <th className="border px-2 py-1 text-center">
                        {statLabelMap[key] || key}
                      </th>
                      {key === "ThreePA" && (
                        <th className="border px-2 py-1 text-center">3P%</th>
                      )}
                      {key === "TwoPA" && (
                        <>
                          <th className="border px-2 py-1 text-center">2P%</th>
                          <th className="border px-2 py-1 text-center">eFG%</th>
                        </>
                      )}
                      {key === "FTA" && (
                        <th className="border px-2 py-1 text-center">FT%</th>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {seasonTotals.map((row) => (
                  <tr key={row.season}>
                    <td className="border px-2 py-1 text-center">
                      {formatSeasonLabel(row.season)}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {row.gamesPlayed}
                    </td>

                    {statKeys.map((key) => (
                      <React.Fragment key={key}>
                        <td className="border px-2 py-1 text-center">
                          {displayStat(row, key)}
                        </td>

                        {key === "ThreePA" && (
                          <td className="border px-2 py-1 text-center">
                            {calcPct(row.ThreePM, row.ThreePA)}
                          </td>
                        )}
                        {key === "TwoPA" && (
                          <>
                            <td className="border px-2 py-1 text-center">
                              {calcPct(row.TwoPM, row.TwoPA)}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {calcEFG(
                                row.TwoPM,
                                row.ThreePM,
                                row.TwoPA,
                                row.ThreePA
                              )}
                            </td>
                          </>
                        )}
                        {key === "FTA" && (
                          <td className="border px-2 py-1 text-center">
                            {calcPct(row.FTM, row.FTA)}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}

                <tr className="bg-gray-50 font-semibold">
                  <td className="border px-2 py-1 text-center">
                    {careerTotals.season}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {careerTotals.gamesPlayed}
                  </td>

                  {statKeys.map((key) => (
                    <React.Fragment key={key}>
                      <td className="border px-2 py-1 text-center">
                        {(() => {
                          if (!showPerGame) return Number(careerTotals[key]) || 0;
                          const gp = Number(careerTotals.gamesPlayed) || 0;
                          if (!gp) return "-";
                          return round1(
                            (Number(careerTotals[key]) || 0) / gp
                          );
                        })()}
                      </td>

                      {key === "ThreePA" && (
                        <td className="border px-2 py-1 text-center">
                          {calcPct(careerTotals.ThreePM, careerTotals.ThreePA)}
                        </td>
                      )}
                      {key === "TwoPA" && (
                        <>
                          <td className="border px-2 py-1 text-center">
                            {calcPct(careerTotals.TwoPM, careerTotals.TwoPA)}
                          </td>
                          <td className="border px-2 py-1 text-center">
                            {calcEFG(
                              careerTotals.TwoPM,
                              careerTotals.ThreePM,
                              careerTotals.TwoPA,
                              careerTotals.ThreePA
                            )}
                          </td>
                        </>
                      )}
                      {key === "FTA" && (
                        <td className="border px-2 py-1 text-center">
                          {calcPct(careerTotals.FTM, careerTotals.FTA)}
                        </td>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* NEW: Region-only totals */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold">Region Game Totals</h2>

          {/* Reuse the same totals/per-game toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Totals</span>

            <button
              type="button"
              onClick={() => setShowPerGame((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPerGame ? "bg-blue-600" : "bg-gray-300"
              }`}
              aria-pressed={showPerGame}
              aria-label="Toggle totals vs per-game"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  showPerGame ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>

            <span className="text-sm text-gray-600 whitespace-nowrap">
              Per Game
            </span>
          </div>
        </div>

        {regionSeasonTotals.length === 0 ? (
          <p>No region game stats available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center">Season</th>
                  <th className="border px-2 py-1 text-center">GP</th>
                  {statKeys.map((key) => (
                    <React.Fragment key={key}>
                      <th className="border px-2 py-1 text-center">
                        {statLabelMap[key] || key}
                      </th>
                      {key === "ThreePA" && (
                        <th className="border px-2 py-1 text-center">3P%</th>
                      )}
                      {key === "TwoPA" && (
                        <>
                          <th className="border px-2 py-1 text-center">2P%</th>
                          <th className="border px-2 py-1 text-center">eFG%</th>
                        </>
                      )}
                      {key === "FTA" && (
                        <th className="border px-2 py-1 text-center">FT%</th>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {regionSeasonTotals.map((row) => (
                  <tr key={row.season}>
                    <td className="border px-2 py-1 text-center">
                      {formatSeasonLabel(row.season)}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {row.gamesPlayed}
                    </td>

                    {statKeys.map((key) => (
                      <React.Fragment key={key}>
                        <td className="border px-2 py-1 text-center">
                          {displayStat(row, key)}
                        </td>

                        {key === "ThreePA" && (
                          <td className="border px-2 py-1 text-center">
                            {calcPct(row.ThreePM, row.ThreePA)}
                          </td>
                        )}
                        {key === "TwoPA" && (
                          <>
                            <td className="border px-2 py-1 text-center">
                              {calcPct(row.TwoPM, row.TwoPA)}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {calcEFG(
                                row.TwoPM,
                                row.ThreePM,
                                row.TwoPA,
                                row.ThreePA
                              )}
                            </td>
                          </>
                        )}
                        {key === "FTA" && (
                          <td className="border px-2 py-1 text-center">
                            {calcPct(row.FTM, row.FTA)}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}

                <tr className="bg-gray-50 font-semibold">
                  <td className="border px-2 py-1 text-center">
                    {regionCareerTotals.season}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {regionCareerTotals.gamesPlayed}
                  </td>

                  {statKeys.map((key) => (
                    <React.Fragment key={key}>
                      <td className="border px-2 py-1 text-center">
                        {(() => {
                          if (!showPerGame)
                            return Number(regionCareerTotals[key]) || 0;
                          const gp =
                            Number(regionCareerTotals.gamesPlayed) || 0;
                          if (!gp) return "-";
                          return round1(
                            (Number(regionCareerTotals[key]) || 0) / gp
                          );
                        })()}
                      </td>

                      {key === "ThreePA" && (
                        <td className="border px-2 py-1 text-center">
                          {calcPct(
                            regionCareerTotals.ThreePM,
                            regionCareerTotals.ThreePA
                          )}
                        </td>
                      )}
                      {key === "TwoPA" && (
                        <>
                          <td className="border px-2 py-1 text-center">
                            {calcPct(
                              regionCareerTotals.TwoPM,
                              regionCareerTotals.TwoPA
                            )}
                          </td>
                          <td className="border px-2 py-1 text-center">
                            {calcEFG(
                              regionCareerTotals.TwoPM,
                              regionCareerTotals.ThreePM,
                              regionCareerTotals.TwoPA,
                              regionCareerTotals.ThreePA
                            )}
                          </td>
                        </>
                      )}
                      {key === "FTA" && (
                        <td className="border px-2 py-1 text-center">
                          {calcPct(
                            regionCareerTotals.FTM,
                            regionCareerTotals.FTA
                          )}
                        </td>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Game logs */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Game Logs</h2>
        {statsWithGameInfo.length === 0 ? (
          <p>No game logs available.</p>
        ) : (
          orderedSeasonKeys.map((seasonKey) => {
            const rows = gameLogsBySeason[seasonKey] || [];
            return (
              <div key={seasonKey} className="mb-6">
                <h3 className="text-xl font-semibold mb-1">
                  {seasonKey || "Unknown Season"}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1 text-center">Date</th>
                        <th className="border px-2 py-1 text-center">Opponent</th>
                        <th className="border px-2 py-1 text-center">Result</th>
                        {statKeys.map((key) => (
                          <React.Fragment key={key}>
                            <th className="border px-2 py-1 text-center">
                              {statLabelMap[key] || key}
                            </th>
                            {key === "ThreePA" && (
                              <th className="border px-2 py-1 text-center">
                                3P%
                              </th>
                            )}
                            {key === "TwoPA" && (
                              <>
                                <th className="border px-2 py-1 text-center">
                                  2P%
                                </th>
                                <th className="border px-2 py-1 text-center">
                                  eFG%
                                </th>
                              </>
                            )}
                            {key === "FTA" && (
                              <th className="border px-2 py-1 text-center">
                                FT%
                              </th>
                            )}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={`${row.GameID}-${idx}`}>
                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            {formatDateFromGameID(row.gameId)}
                          </td>
                          <td className="border px-2 py-1 text-center whitespace-nowrap">
                            <Link
                              to={`/athletics/boys/basketball/games/${row.GameID}`}
                              className="text-blue-600 hover:underline"
                            >
                              {row.opponent}
                            </Link>
                          </td>
                          <td className="border px-2 py-1 text-center">
                            {row.result}
                          </td>
                          {statKeys.map((key) => (
                            <React.Fragment key={key}>
                              <td className="border px-2 py-1 text-center">
                                {row[key]}
                              </td>
                              {key === "ThreePA" && (
                                <td className="border px-2 py-1 text-center">
                                  {calcPct(row.ThreePM, row.ThreePA)}
                                </td>
                              )}
                              {key === "TwoPA" && (
                                <>
                                  <td className="border px-2 py-1 text-center">
                                    {calcPct(row.TwoPM, row.TwoPA)}
                                  </td>
                                  <td className="border px-2 py-1 text-center">
                                    {calcEFG(
                                      row.TwoPM,
                                      row.ThreePM,
                                      row.TwoPA,
                                      row.ThreePA
                                    )}
                                  </td>
                                </>
                              )}
                              {key === "FTA" && (
                                <td className="border px-2 py-1 text-center">
                                  {calcPct(row.FTM, row.FTA)}
                                </td>
                              )}
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

export default PlayerPage;
