export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const r = await fetch(
      'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason'
    );
    const data = await r.json();

    const standings = [];
    for(const record of data.records || []) {
      const league = record.league.id === 103 ? "AL" : "NL";
      for(const t of record.teamRecords) {
        standings.push({
          league,
          name: t.team.name,
          wins: t.wins,
          losses: t.losses,
          pct: t.winningPercentage,
          gb: t.gamesBack === "-" ? "-" : t.gamesBack,
          division: record.division.name,
        });
      }
    }

    res.status(200).json({ standings });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
