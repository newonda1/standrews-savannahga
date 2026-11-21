import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SCHOOLS_PATH, hydrateGamesWithSchools } from "../dataUtils";
import RecordedBoxScore from "../components/RecordedBoxScore";
import GameBoxScore from "../components/GameBoxScore";
import PlayerLinkedText from "../components/PlayerLinkedText";

function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // public/data/boys/basketball/...
  const DATA_BASE = "/data/boys/basketball/";

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

  // Build a season slug like "2025-26" from the start year in your games.json ("Season": 2025)
  const seasonSlugFromYearStart = (yearStart) => {
    const ys = Number(yearStart);
    if (!ys || isNaN(ys)) return null;
    const ye2 = String(ys + 1).slice(-2);
    return `${ys}-${ye2}`;
  };

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
  const recapPlayers = recordedTeams?.[0]?.Players.filter((player) => player.PlayerID) || [];

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
        <h2 className="text-xl font-semibold mb-2">
          <PlayerLinkedText text={recapTitle} players={recapPlayers} />
        </h2>
        {recordedTeams ? (
          <div className="space-y-3 leading-relaxed text-gray-700">
            {recapText.split("\n\n").map((paragraph) => <p key={paragraph}><PlayerLinkedText text={paragraph} players={recapPlayers} /></p>)}
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
          <RecordedBoxScore
            teams={recordedTeams}
            playerBoxScore={
              <GameBoxScore
                playerStats={playerStats}
                players={players}
                teamName={recordedTeams[0].Name}
              />
            }
          />
        ) : playerStats.length === 0 ? (
          <p className="text-gray-600">No player statistics recorded for this game yet.</p>
        ) : (
          <GameBoxScore playerStats={playerStats} players={players} />
        )}
      </section>
    </div>
  );
}

export default GameDetail;
