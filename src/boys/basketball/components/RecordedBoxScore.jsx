import React from "react";

const columns = [
  ["PTS", "Points", (row) => row.PTS],
  ["FG", "Field goals made–attempted", (row) => `${row.FGM}–${row.FGA}`],
  ["3PT", "Three-pointers made–attempted", (row) => `${row.ThreePM}–${row.ThreePA}`],
  ["FT", "Free throws made–attempted", (row) => `${row.FTM}–${row.FTA}`],
  ["OREB", "Offensive rebounds", (row) => row.OREB],
  ["DREB", "Defensive rebounds", (row) => row.DREB],
  ["REB", "Total rebounds", (row) => row.REB],
  ["AST", "Assists", (row) => row.AST],
  ["STL", "Steals", (row) => row.STL],
  ["BLK", "Blocks", (row) => row.BLK],
  ["TO", "Turnovers", (row) => row.TO],
  ["PF", "Personal fouls", (row) => row.PF],
];

const cell = "border px-2 py-1";

function StatsRow({ row, total = false }) {
  return (
    <tr className={total ? "bg-gray-100 font-semibold" : "even:bg-gray-50"}>
      <th scope="row" className={`${cell} whitespace-nowrap text-left ${total ? "font-semibold" : "font-normal"}`}>
        {total ? "Team totals" : row.Name}
      </th>
      <td className={cell}>{row.Number ?? "—"}</td>
      {columns.map(([key, , value]) => (
        <td key={key} className={cell}>{value(row)}</td>
      ))}
    </tr>
  );
}

export default function RecordedBoxScore({ teams, playerBoxScore }) {
  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="overflow-x-auto">
        <table className="text-center tabular-nums">
          <caption className="pb-2 text-left font-semibold">Scoring by quarter</caption>
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className={`${cell} text-left`}>Team</th>
              {teams[0].Quarters.map((_, index) => (
                <th key={index} scope="col" className={cell}>Q{index + 1}</th>
              ))}
              <th scope="col" className={cell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.Name} className="even:bg-gray-50">
                <th scope="row" className={`${cell} text-left font-normal`}>{team.Name}</th>
                {team.Quarters.map((points, index) => (
                  <td key={index} className={cell}>{points}</td>
                ))}
                <td className={`${cell} font-semibold`}>{team.Totals.PTS}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-gray-600">
        Shooting splits show makes and attempts. Team / unassigned entries are included in the totals.
      </p>
      {teams.map((team, index) => (
        index === 0 && playerBoxScore ? (
          <React.Fragment key={team.Name}>{playerBoxScore}</React.Fragment>
        ) : (
          <div key={team.Name} className="overflow-x-auto">
            <table className="min-w-full text-center tabular-nums">
              <caption className="pb-2 text-left text-base font-semibold">{team.Name}</caption>
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className={`${cell} text-left`}>Player</th>
                  <th scope="col" className={cell} aria-label="Jersey number">#</th>
                  {columns.map(([key, label]) => (
                    <th key={key} scope="col" className={cell} title={label} aria-label={label}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.Players.map((row) => <StatsRow key={row.Name} row={row} />)}
              </tbody>
              <tfoot>
                <StatsRow row={team.Totals} total />
              </tfoot>
            </table>
          </div>
        )
      ))}
    </div>
  );
}
