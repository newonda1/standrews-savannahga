import React from "react";
import { Link } from "react-router-dom";

export default function PlayerLinkedText({ text, players, firstFullNameOnly = false, asParagraphs = false }) {
  const aliases = new Map();
  for (const player of players) {
    const fullName = player.Name;
    const surname = fullName.split(" ").at(-1);
    for (const name of firstFullNameOnly ? [fullName] : [fullName, surname]) {
      if (!aliases.has(name)) aliases.set(name, player.PlayerID);
      else if (aliases.get(name) !== player.PlayerID) aliases.set(name, null);
    }
  }

  const names = [...aliases.keys()]
    .filter((name) => aliases.get(name))
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const pattern = names.length ? new RegExp(`\\b(${names.join("|")})\\b`, "g") : null;
  const linkedPlayers = new Set();

  const renderText = (value) => {
    if (!pattern) return value;
    return value.split(pattern).map((part, index) => {
      const playerId = aliases.get(part);
      if (!playerId || (firstFullNameOnly && linkedPlayers.has(playerId))) return part;
      linkedPlayers.add(playerId);
      return (
        <Link
          key={index}
          to={`/athletics/boys/basketball/players/${playerId}`}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {part}
        </Link>
      );
    });
  };

  return asParagraphs
    ? text.split("\n\n").map((paragraph, index) => <p key={index}>{renderText(paragraph)}</p>)
    : renderText(text);
}
