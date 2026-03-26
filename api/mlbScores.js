export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
    const yesterdayDate = new Date(now - 24*60*60*1000);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA', {timeZone: 'America/New_York'});

    const [r1, r2] = await Promise.all([
      fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore,probablePitcher,decisions,lineups`),
      fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${yesterday}&hydrate=linescore,probablePitcher,decisions,lineups`)
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);

    const parseLineup = (players) => (players || []).map((p, i) => ({
      n: String(i + 1),
      name: p.fullName,
      p: p.primaryPosition?.abbreviation || "?"
    }));

    const parseGames = (data) => (data.dates?.[0]?.games || []).map(g => ({
      id: g.gamePk,
      status: g.status.detailedState,
      away: {
        name: g.teams.away.team.name,
        score: g.teams.away.score ?? '-',
        record: `${g.teams.away.leagueRecord.wins}-${g.teams.away.leagueRecord.losses}`,
        pitcher: g.teams.away.probablePitcher?.fullName ?? null,
      },
      home: {
        name: g.teams.home.team.name,
        score: g.teams.home.score ?? '-',
        record: `${g.teams.home.leagueRecord.wins}-${g.teams.home.leagueRecord.losses}`,
        pitcher: g.teams.home.probablePitcher?.fullName ?? null,
      },
      lineup: (g.lineups?.awayPlayers?.length || g.lineups?.homePlayers?.length) ? {
        away: parseLineup(g.lineups?.awayPlayers),
        home: parseLineup(g.lineups?.homePlayers),
      } : null,
      winner: g.decisions?.winner?.fullName ?? null,
      loser: g.decisions?.loser?.fullName ?? null,
      inning: g.linescore?.currentInning ?? null,
      inningHalf: g.linescore?.inningHalf ?? null,
      awayInnings: g.linescore?.innings?.map(i => i.away?.runs ?? null) ?? [],
      homeInnings: g.linescore?.innings?.map(i => i.home?.runs ?? null) ?? [],
      startTime: g.gameDate,
      venue: g.venue.name,
    }));

    const todayGames = parseGames(d1);
    const yesterdayGames = parseGames(d2).filter(g => g.status === "Final" || g.status === "Game Over");

    res.status(200).json({ date: today, games: [...todayGames, ...yesterdayGames] });
    
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
