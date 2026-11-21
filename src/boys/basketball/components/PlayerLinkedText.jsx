import React from "react";
import { Link } from "react-router-dom";

export default function PlayerLinkedText({ text, players }) {
  const aliases = new Map();
  for (const player of players) {
    const fullName = player.Name;
    const surname = fullName.split(" ").at(-1);
    for (const name of [fullName, surname]) {
      if (!aliases.has(name)) aliases.set(name, player.PlayerID);
      else if (aliases.get(name) !== player.PlayerID) aliases.set(name, null);
    }
  }

  const names = [...aliases.keys()]
    .filter((name) => aliases.get(name))
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (names.length === 0) return text;

  const pattern = new RegExp(`\\b(${names.join("|")})\\b`, "g");
  return text.split(pattern).map((part, index) => (
    aliases.get(part) ? (
      <Link
        key={index}
        to={`/athletics/boys/basketball/players/${aliases.get(part)}`}
        className="text-blue-600 underline hover:text-blue-800"
      >
        {part}
      </Link>
    ) : part
  ));
}
