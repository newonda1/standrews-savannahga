import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getPlayerName } from "../dataUtils";

export default function GameBoxScore({ playerStats, players, teamName }) {
  const playerName = (playerId) => getPlayerName(players, playerId);
  const getPlayerPhotoUrl = (playerId) => `/images/boys/basketball/players/${playerId}.jpg`;

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

  // Sum the same game records used by player and season pages.
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-xs sm:text-sm text-center">
        {teamName && <caption className="pb-2 text-left text-base font-semibold">{teamName}</caption>}
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
                      alt={playerName(s.PlayerID)}
                      onError={(e) => {
                        e.currentTarget.src = "/images/common/logo.png";
                      }}
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                    <Link
                      to={`/athletics/boys/basketball/players/${s.PlayerID}`}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {playerName(s.PlayerID)}
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
  );
}
