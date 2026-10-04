import React, { useEffect, useState } from "react";
import { Route, Routes, useParams } from "react-router-dom";

import AthleticsProgramShell from "../../components/AthleticsProgramShell";
import ArticleDetailPage from "../../components/ArticleDetailPage";

import Home from "./pages/Home";
import FullCareerStats from "./pages/FullCareerStats";
import FullTeamStats from "./pages/FullTeamStats";
import SeasonRecords from "./pages/SeasonRecords";
import SingleGameRecords from "./pages/SingleGameRecords";
import CareerRecords from "./pages/CareerRecords";
import TeamSingleGameRecords from "./pages/TeamSingleGameRecords";
import TeamSeasonRecords from "./pages/TeamSeasonRecords";
import RecordsVsOpponents from "./pages/RecordsVsOpponents";
import YearlyResults from "./pages/YearlyResults";
import GameDetail from "./pages/GameDetail";
import GameDetailHistorical from "./pages/GameDetailHistorical";
import PlayerPage from "./pages/PlayerPage";

import Season1978_79 from "./seasons/Season1978_79";
import Season1979_80 from "./seasons/Season1979_80";
import Season1980_81 from "./seasons/Season1980_81";
import Season1981_82 from "./seasons/Season1981_82";
import Season1982_83 from "./seasons/Season1982_83";
import Season1983_84 from "./seasons/Season1983_84";
import Season1984_85 from "./seasons/Season1984_85";
import Season1985_86 from "./seasons/Season1985_86";
import Season1986_87 from "./seasons/Season1986_87";
import Season1987_88 from "./seasons/Season1987_88";
import Season1988_89 from "./seasons/Season1988_89";
import Season1989_90 from "./seasons/Season1989_90";
import Season1990_91 from "./seasons/Season1990_91";
import Season1991_92 from "./seasons/Season1991_92";
import Season1992_93 from "./seasons/Season1992_93";
import Season1993_94 from "./seasons/Season1993_94";
import Season1994_95 from "./seasons/Season1994_95";
import Season1995_96 from "./seasons/Season1995_96";
import Season1999_00 from "./seasons/Season1999_00";
import Season2000_01 from "./seasons/Season2000_01";
import Season2001_02 from "./seasons/Season2001_02";
import Season2002_03 from "./seasons/Season2002_03";
import Season2003_04 from "./seasons/Season2003_04";
import Season2004_05 from "./seasons/Season2004_05";
import Season2005_06 from "./seasons/Season2005_06";
import Season2006_07 from "./seasons/Season2006_07";
import Season2007_08 from "./seasons/Season2007_08";
import Season2008_09 from "./seasons/Season2008_09";
import Season2009_10 from "./seasons/Season2009_10";
import Season2010_11 from "./seasons/Season2010_11";
import Season2011_12 from "./seasons/Season2011_12";
import Season2012_13 from "./seasons/Season2012_13";
import Season2013_14 from "./seasons/Season2013_14";
import Season2014_15 from "./seasons/Season2014_15";
import Season2015_16 from "./seasons/Season2015_16";
import Season2016_17 from "./seasons/Season2016_17";
import Season2017_18 from "./seasons/Season2017_18";
import Season2018_19 from "./seasons/Season2018_19";
import Season2019_20 from "./seasons/Season2019_20";
import Season2020_21 from "./seasons/Season2020_21";
import Season2021_22 from "./seasons/Season2021_22";
import Season2022_23 from "./seasons/Season2022_23";
import Season2023_24 from "./seasons/Season2023_24";
import Season2024_25 from "./seasons/Season2024_25";
import Season2025_26 from "./seasons/Season2025_26";
import Season2026_27 from "./seasons/Season2026_27";
import SeasonPlaceholder from "./seasons/SeasonPlaceholder";

const seasonPages = [
  { slug: "1978-79", Component: Season1978_79 },
  { slug: "1979-80", Component: Season1979_80 },
  { slug: "1980-81", Component: Season1980_81 },
  { slug: "1981-82", Component: Season1981_82 },
  { slug: "1982-83", Component: Season1982_83 },
  { slug: "1983-84", Component: Season1983_84 },
  { slug: "1984-85", Component: Season1984_85 },
  { slug: "1985-86", Component: Season1985_86 },
  { slug: "1986-87", Component: Season1986_87 },
  { slug: "1987-88", Component: Season1987_88 },
  { slug: "1988-89", Component: Season1988_89 },
  { slug: "1989-90", Component: Season1989_90 },
  { slug: "1990-91", Component: Season1990_91 },
  { slug: "1991-92", Component: Season1991_92 },
  { slug: "1992-93", Component: Season1992_93 },
  { slug: "1993-94", Component: Season1993_94 },
  { slug: "1994-95", Component: Season1994_95 },
  { slug: "1995-96", Component: Season1995_96 },
  { slug: "1999-00", Component: Season1999_00 },
  { slug: "2000-01", Component: Season2000_01 },
  { slug: "2001-02", Component: Season2001_02 },
  { slug: "2002-03", Component: Season2002_03 },
  { slug: "2003-04", Component: Season2003_04 },
  { slug: "2004-05", Component: Season2004_05 },
  { slug: "2005-06", Component: Season2005_06 },
  { slug: "2006-07", Component: Season2006_07 },
  { slug: "2007-08", Component: Season2007_08 },
  { slug: "2008-09", Component: Season2008_09 },
  { slug: "2009-10", Component: Season2009_10 },
  { slug: "2010-11", Component: Season2010_11 },
  { slug: "2011-12", Component: Season2011_12 },
  { slug: "2012-13", Component: Season2012_13 },
  { slug: "2013-14", Component: Season2013_14 },
  { slug: "2014-15", Component: Season2014_15 },
  { slug: "2015-16", Component: Season2015_16 },
  { slug: "2016-17", Component: Season2016_17 },
  { slug: "2017-18", Component: Season2017_18 },
  { slug: "2018-19", Component: Season2018_19 },
  { slug: "2019-20", Component: Season2019_20 },
  { slug: "2020-21", Component: Season2020_21 },
  { slug: "2021-22", Component: Season2021_22 },
  { slug: "2022-23", Component: Season2022_23 },
  { slug: "2023-24", Component: Season2023_24 },
  { slug: "2024-25", Component: Season2024_25 },
  { slug: "2025-26", Component: Season2025_26 },
  { slug: "2026-27", Component: Season2026_27 },
];

const menuSections = [
  {
    title: "Results",
    links: [
      {
        to: "/athletics/boys/basketball/yearly-results",
        label: "Full Year-by-Year Results",
      },
      {
        to: "/athletics/boys/basketball/records/opponents",
        label: "Opponent Game History",
      },
    ],
  },
  {
    title: "Team Stats",
    links: [
      {
        to: "/athletics/boys/basketball/team/full",
        label: "Full Team Stats",
      },
      {
        to: "/athletics/boys/basketball/records/team",
        label: "Team Single Game Records",
      },
      {
        to: "/athletics/boys/basketball/team/season-records",
        label: "Team Season Records",
      },
    ],
  },
  {
    title: "Individual Stats",
    links: [
      {
        to: "/athletics/boys/basketball/records/career",
        label: "Full Career Stats",
      },
      {
        to: "/athletics/boys/basketball/records/single-game",
        label: "Single Game Records",
      },
      {
        to: "/athletics/boys/basketball/records/season",
        label: "Season Records",
      },
      {
        to: "/athletics/boys/basketball/records/career-records",
        label: "Career Records",
      },
    ],
  },
];

function GameDetailRouter() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      try {
        const res = await fetch("/data/boys/basketball/games.json");
        const gamesData = await res.json();
        const matchedGame = gamesData.find(
          (entry) => Number(entry.GameID) === Number(gameId)
        );

        if (!cancelled) {
          setGame(matchedGame || null);
        }
      } catch (error) {
        console.error("Failed to load game for router:", error);
        if (!cancelled) {
          setGame(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGame();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  if (!game) {
    return <div className="p-4">Game not found.</div>;
  }

  const isHistorical = Number(game.Season) <= 2011;

  return isHistorical ? <GameDetailHistorical /> : <GameDetail />;
}

export default function BoysBasketballApp() {
  return (
    <AthleticsProgramShell
      title="Boys' Basketball"
      menuTitle="Boys' Basketball"
      menuSections={menuSections}
      athleticsHomePath="/athletics"
      headerHomePath="/athletics/boys/basketball"
    >
      <div className="pb-12 lg:pb-24">
        <Routes>
          <Route index element={<Home />} />

          <Route path="team/full" element={<FullTeamStats />} />
          <Route path="team/season-records" element={<TeamSeasonRecords />} />
          <Route path="records/career" element={<FullCareerStats />} />
          <Route path="records/season" element={<SeasonRecords />} />
          <Route path="records/single-game" element={<SingleGameRecords />} />
          <Route path="records/career-records" element={<CareerRecords />} />
          <Route path="records/team" element={<TeamSingleGameRecords />} />
          <Route path="records/opponents" element={<RecordsVsOpponents />} />

          {seasonPages.map(({ slug, Component }) => (
            <Route key={slug} path={`seasons/${slug}`} element={<Component />} />
          ))}
          <Route path="seasons/:seasonId" element={<SeasonPlaceholder />} />

          <Route path="yearly-results" element={<YearlyResults />} />
          <Route
            path="articles/:articleId"
            element={
              <ArticleDetailPage
                articlesPath="/data/boys/basketball/articles.json"
                basePath="/athletics/boys/basketball"
                backLabel="boys' basketball"
                backPath="/athletics/boys/basketball/seasons/1992-93"
              />
            }
          />
          <Route path="games/:gameId" element={<GameDetailRouter />} />
          <Route path="players/:playerId" element={<PlayerPage />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </AthleticsProgramShell>
  );
}
