export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=10"); // 10초 캐싱

  try {
    // ✅ 날짜 안정화 (버그 방지)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;

    // ✅ MLB API URL
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore,probablePitcher`;

    // ✅ fetch 안정성 (User-Agent 추가)
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const data = await r.json();

    // ✅ 데이터 가공
    const games = (data.dates?.[0]?.games || []).map(g => ({
      id: g.gamePk,
      status: g.status.detailedState,

      away: {
        name: g.teams.away.team.name,
        score: g.teams.away.score ?? "-",
        record: `${g.teams.away.leagueRecord.wins}-${g.teams.away.leagueRecord.losses}`,
        pitcher: g.teams.away.probablePitcher?.fullName ?? null,
      },

      home: {
        name: g.teams.home.team.name,
        score: g.teams.home.score ?? "-",
        record: `${g.teams.home.leagueRecord.wins}-${g.teams.home.leagueRecord.losses}`,
        pitcher: g.teams.home.probablePitcher?.fullName ?? null,
      },

      inning: g.linescore?.currentInning ?? null,
      inningHalf: g.linescore?.inningHalf ?? null,

      awayInnings: g.linescore?.innings?.map(i => i.away?.runs ?? null) ?? [],
      homeInnings: g.linescore?.innings?.map(i => i.home?.runs ?? null) ?? [],

      startTime: g.gameDate,
      venue: g.venue?.name ?? ""
    }));

    res.status(200).json({ date: today, games });

  } catch (e) {
    console.error("MLB API ERROR:", e); // 🔥 로그 찍기
    res.status(500).json({ error: e.message });
  }
}
