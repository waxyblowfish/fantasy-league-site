import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, History, Users, Calendar, BarChart3, Info, Moon, Sun, ChevronDown, ChevronUp, Crown, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// ⚠️ IMPORTANT: Sleeper creates a BRAND NEW league_id every season for the
// same league (it links seasons together internally via "previous_league_id").
// That means this ID will need to be updated once a year, right after your
// commissioner rolls the league over to the new season on Sleeper.
// If you're not sure this is still correct, the app will try to auto-detect
// a newer season below and show a banner with the new ID to paste in here.
const LEAGUE_ID = '1257085009114697728';
const API_BASE = 'https://api.sleeper.app/v1';

// Notice Board - Edit this text to update the default notice on the home page
const INITIAL_NOTICE = `🏈 Welcome to the 2026-2027 season! If you have any questions or see any errors let Noah know!
Have fun and good luck to everyone!`;   

// Roughly determines the "label year" of the current/upcoming NFL season.
// NFL seasons are labeled by the year they start (e.g. games played in
// Jan/Feb 2027 still belong to the "2026" season), so Jan/Feb counts as
// still being the previous label year.
const getCurrentNFLSeasonLabel = () => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan
  const year = now.getFullYear();
  return (month <= 1 ? year - 1 : year).toString();
};

export default function FantasyLeagueSite() {
  const [activeTab, setActiveTab] = useState('home');
  const [leagueData, setLeagueData] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState({});
  const [currentMatchups, setCurrentMatchups] = useState([]);
  const [previousMatchups, setPreviousMatchups] = useState([]);
  const [allMatchups, setAllMatchups] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);
  const [winnersBracket, setWinnersBracket] = useState([]);
  const [trendingPlayers, setTrendingPlayers] = useState({ add: [], drop: [] });
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [newSeasonLeagueId, setNewSeasonLeagueId] = useState(null);

  // Initialize dark mode based on system preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    fetchLeagueData();
  }, []);

  const fetchLeagueData = async () => {
    try {
      setLoading(true);
      
      // Fetch essential data first (fast load)
      const [leagueRes, rostersRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/league/${LEAGUE_ID}`),
        fetch(`${API_BASE}/league/${LEAGUE_ID}/rosters`),
        fetch(`${API_BASE}/league/${LEAGUE_ID}/users`)
      ]);

      const league = await leagueRes.json();
      const rostersData = await rostersRes.json();
      const usersData = await usersRes.json();

      setLeagueData(league);
      setRosters(rostersData);
      setUsers(usersData);

      // Check whether this hardcoded LEAGUE_ID is stale (last season is over
      // and Sleeper has already rolled the league forward to a new ID).
      // We only bother checking when it looks like it might be out of date,
      // to avoid extra API calls during a normal live season.
      const targetSeasonLabel = getCurrentNFLSeasonLabel();
      if (league.status === 'complete' && league.season !== targetSeasonLabel) {
        try {
          const ownerId = usersData?.[0]?.user_id;
          if (ownerId) {
            const futureLeaguesRes = await fetch(`${API_BASE}/user/${ownerId}/leagues/nfl/${targetSeasonLabel}`);
            const futureLeagues = await futureLeaguesRes.json();
            const match = Array.isArray(futureLeagues)
              ? futureLeagues.find(l => l.previous_league_id === LEAGUE_ID) ||
                futureLeagues.find(l => l.name === league.name)
              : null;
            if (match) setNewSeasonLeagueId(match.league_id);
          }
        } catch (err) {
          console.error('Error checking for newer season league:', err);
        }
      }

      // Only treat the league as having an active "week" once the draft is
      // done and games are actually being played. Before that (pre_draft /
      // drafting), league.settings.leg is meaningless (often 0 or stale from
      // last look) and would otherwise make the UI show a fake "Week 1".
      const seasonHasStarted = league.status === 'in_season' || league.status === 'post_season' || league.status === 'complete';
      const week = seasonHasStarted ? (league.settings.leg || 1) : 0;
      setCurrentWeek(week);

      // Fetch current and previous week matchups (only if season has started)
      const matchupPromises = [];
      if (week >= 1 && week <= 18) {
        matchupPromises.push(
          fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week}`)
            .then(res => res.json())
            .then(data => setCurrentMatchups(data || []))
            .catch(() => setCurrentMatchups([]))
        );
      }
      if (week > 1) {
        matchupPromises.push(
          fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week - 1}`)
            .then(res => res.json())
            .then(data => setPreviousMatchups(data || []))
            .catch(() => setPreviousMatchups([]))
        );
      }
      await Promise.all(matchupPromises);

      // Stop loading here - user can see main content now
      setLoading(false);

      // Fetch heavy data in background (non-blocking)
      // All matchups for history - limit to current season only
      const matchupsPromises = [];
      for (let w = 1; w <= Math.min(week, 18) && week >= 1; w++) {
        matchupsPromises.push(
          fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${w}`)
            .then(res => res.json())
            .then(data => ({ week: w, matchups: data }))
            .catch(() => ({ week: w, matchups: [] }))
        );
      }
      
      Promise.all(matchupsPromises).then(allMatchupsData => {
        const matchupsObj = {};
        allMatchupsData.forEach(({ week, matchups }) => {
          matchupsObj[week] = matchups;
        });
        setAllMatchups(matchupsObj);
      });

      // Fetch recent transactions (last 2 weeks only - reduced from 3)
      const transPromises = [];
      for (let w = Math.max(1, week - 1); w <= week && week >= 1; w++) {
        transPromises.push(
          fetch(`${API_BASE}/league/${LEAGUE_ID}/transactions/${w}`)
            .then(res => res.json())
            .catch(() => [])
        );
      }
      
      Promise.all(transPromises).then((transResponses) => {
        const allTrans = transResponses.flat().filter(Boolean);
        setTransactions(allTrans);
      });

      // Trending adds/drops: use Sleeper's own global trending endpoint,
      // which reflects add/drop activity across ALL Sleeper leagues (not
      // just this one) over the last 24 hours. This is the same data
      // Sleeper's own app shows. Note: ESPN and Yahoo don't expose a public,
      // key-free trending API the way Sleeper does, so this covers Sleeper's
      // platform-wide activity rather than a true cross-platform blend.
      Promise.all([
        fetch(`${API_BASE}/players/nfl/trending/add?lookback_hours=24&limit=25`).then(res => res.json()).catch(() => []),
        fetch(`${API_BASE}/players/nfl/trending/drop?lookback_hours=24&limit=25`).then(res => res.json()).catch(() => [])
      ]).then(([addData, dropData]) => {
        const trendingAdds = (addData || []).map(({ player_id, count }) => ({ playerId: player_id, count }));
        const trendingDrops = (dropData || []).map(({ player_id, count }) => ({ playerId: player_id, count }));
        setTrendingPlayers({ add: trendingAdds, drop: trendingDrops });
      }).catch(err => console.error('Error fetching global trending players:', err));

      // Fetch draft data - prefer league.draft_id (this season's draft) and
      // only fall back to the drafts list if that's missing, since a league
      // can have more than one draft object and [0] isn't guaranteed to be
      // the current season's draft.
      const draftIdPromise = league.draft_id
        ? Promise.resolve(league.draft_id)
        : fetch(`${API_BASE}/league/${LEAGUE_ID}/drafts`)
            .then(res => res.json())
            .then(drafts => (drafts && drafts.length > 0 ? drafts[0].draft_id : null));

      draftIdPromise
        .then(draftId => (draftId ? fetch(`${API_BASE}/draft/${draftId}/picks`) : null))
        .then(res => (res ? res.json() : []))
        .then(picks => setDraftPicks(picks || []))
        .catch(err => console.error('Error fetching draft data:', err));

      // Fetch playoff bracket to determine the actual champion. Only
      // meaningful once playoffs have started, but it's harmless to fetch
      // any time - it'll just come back without a decided final yet.
      if (seasonHasStarted) {
        fetch(`${API_BASE}/league/${LEAGUE_ID}/winners_bracket`)
          .then(res => res.json())
          .then(bracket => setWinnersBracket(Array.isArray(bracket) ? bracket : []))
          .catch(err => console.error('Error fetching winners bracket:', err));
      }

      // Fetch players LAST and in background - this is the heavy one (5MB)
      // Only fetch if we actually need it (optimization)
      fetch(`${API_BASE}/players/nfl`)
        .then(res => res.json())
        .then(playersData => setPlayers(playersData))
        .catch(err => console.error('Error fetching players:', err));
      
    } catch (error) {
      console.error('Error fetching league data:', error);
      setLoading(false);
    }
  };

  const getUserByRosterId = (rosterId) => {
    const roster = rosters.find(r => r.roster_id === rosterId);
    if (!roster) return null;
    return users.find(u => u.user_id === roster.owner_id);
  };

  const getTeamName = (rosterId) => {
    const user = getUserByRosterId(rosterId);
    return user?.metadata?.team_name || user?.display_name || 'Team ' + rosterId;
  };

  const getAvatar = (rosterId) => {
    const user = getUserByRosterId(rosterId);
    const avatarId = user?.avatar;
    return avatarId ? `https://sleepercdn.com/avatars/thumbs/${avatarId}` : null;
  };

  const getPlayerName = (playerId) => {
    return players[playerId]?.full_name || playerId;
  };

  const getPlayerPosition = (playerId) => {
    return players[playerId]?.position || 'N/A';
  };

  const getPlayerTeam = (playerId) => {
    return players[playerId]?.team || 'FA';
  };

  const isPlayerRostered = (playerId) => {
    return rosters.some(roster => roster.players && roster.players.includes(playerId));
  };

  // The championship match in Sleeper's bracket format is the one row with
  // p === 1 ("place 1"); its "w" field is the winning roster_id once the
  // final has been played. (roster.settings.division_winner is a different
  // thing entirely - regular-season division winner - and was never the
  // right field to check here.)
  const championRosterId = (() => {
    const finalMatch = winnersBracket.find(m => m.p === 1);
    return finalMatch && finalMatch.w != null ? finalMatch.w : null;
  })();
  const championName = championRosterId != null ? getTeamName(championRosterId) : null;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className={`mt-4 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading league data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <SpeedInsights />
      <Analytics />
      
      {/* Navigation */}
      <nav className={`${darkMode ? 'bg-gray-800 shadow-xl' : 'bg-white shadow-lg'} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <span className="font-bold text-base sm:text-xl hidden sm:inline">League Hub</span>
            </div>
            
            {/* Mobile menu */}
            <div className="flex gap-1 overflow-x-auto md:hidden">
              {[
                { id: 'home', icon: Trophy },
                { id: 'info', icon: Info },
                { id: 'current', icon: TrendingUp },
                { id: 'waivers', icon: Users },
                { id: 'draft', icon: Calendar },
                { id: 'standings', icon: BarChart3 },
                { id: 'history', icon: History }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2 rounded-lg transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                </button>
              ))}
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex gap-2">
              {[
                { id: 'home', label: 'Home', icon: Trophy },
                { id: 'info', label: 'Info', icon: Info },
                { id: 'current', label: 'Current', icon: TrendingUp },
                { id: 'waivers', label: 'Waivers', icon: Users },
                { id: 'draft', label: 'Draft', icon: Calendar },
                { id: 'standings', label: 'Standings', icon: BarChart3 },
                { id: 'history', label: 'History', icon: History }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      {newSeasonLeagueId && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-4">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm sm:text-base">
              <p className="font-bold">A newer season was found for this league!</p>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                This site is still pointed at last season's League ID. Update the{' '}
                <code className="px-1 rounded bg-black/10 dark:bg-white/10">LEAGUE_ID</code> constant near the
                top of <code className="px-1 rounded bg-black/10 dark:bg-white/10">src/App.jsx</code> to:
              </p>
              <p className="font-mono text-xs sm:text-sm mt-1 p-2 rounded bg-black/10 dark:bg-white/10 break-all">
                {newSeasonLeagueId}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {activeTab === 'home' && <HomePage darkMode={darkMode} leagueData={leagueData} rosters={rosters} currentWeek={currentWeek} setActiveTab={setActiveTab} />}
        {activeTab === 'info' && <LeagueInfoPage darkMode={darkMode} leagueData={leagueData} rosters={rosters} users={users} championName={championName} />}
        {activeTab === 'current' && <CurrentPage darkMode={darkMode} currentWeek={currentWeek} currentMatchups={currentMatchups} previousMatchups={previousMatchups} rosters={rosters} leagueData={leagueData} getTeamName={getTeamName} getAvatar={getAvatar} />}
        {activeTab === 'waivers' && <WaiversPage darkMode={darkMode} transactions={transactions} trendingPlayers={trendingPlayers} players={players} rosters={rosters} getTeamName={getTeamName} getPlayerName={getPlayerName} getPlayerPosition={getPlayerPosition} getPlayerTeam={getPlayerTeam} isPlayerRostered={isPlayerRostered} />}
        {activeTab === 'draft' && <DraftPage darkMode={darkMode} draftPicks={draftPicks} rosters={rosters} users={users} getTeamName={getTeamName} getPlayerName={getPlayerName} players={players} />}
        {activeTab === 'standings' && <StandingsPage darkMode={darkMode} rosters={rosters} getTeamName={getTeamName} currentWeek={currentWeek} leagueData={leagueData} allMatchups={allMatchups} players={players} />}
        {activeTab === 'history' && <HistoryPage darkMode={darkMode} rosters={rosters} users={users} allMatchups={allMatchups} leagueData={leagueData} championName={championName} getTeamName={getTeamName} getAvatar={getAvatar} />}
      </div>
    </div>
  );
}

// Home Page Component
// Notice Board Component  
function NoticeBoard({ darkMode }) {
  const [notice, setNotice] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('leagueNotice');
    setNotice(saved || INITIAL_NOTICE);
  }, []);

  const handleSave = () => {
    localStorage.setItem('leagueNotice', editText);
    setNotice(editText);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setEditText(notice);
    setIsEditing(true);
  };

  return (
    <div className={`${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border-2 rounded-lg p-4 sm:p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">📢 League Notice Board</h3>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'} text-sm sm:text-base`}
                rows={3}
                placeholder="Enter your notice here..."
              />
            ) : (
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-base whitespace-pre-wrap`}>{notice}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={handleEdit} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs mt-2 text-gray-500">Click the edit button to update this notice. Changes are saved locally in your browser.</p>
    </div>
  );
}

// Home Page Component
function HomePage({ darkMode, leagueData, rosters, currentWeek, setActiveTab }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className={`bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 sm:p-8 text-white`}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
          <h1 className="text-2xl sm:text-4xl font-bold">{leagueData?.name || 'Fantasy Football League'}</h1>
        </div>
        <p className="text-lg sm:text-xl opacity-90">Season {leagueData?.season || '2024'} • {rosters.length} Teams</p>
      </div>

      <NoticeBoard darkMode={darkMode} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <QuickLinkCard title="League Info" icon={Info} tab="info" setActiveTab={setActiveTab} darkMode={darkMode} color="blue" />
        <QuickLinkCard title="Current Season" icon={TrendingUp} tab="current" setActiveTab={setActiveTab} darkMode={darkMode} color="green" />
        <QuickLinkCard title="Waivers/FA" icon={Users} tab="waivers" setActiveTab={setActiveTab} darkMode={darkMode} color="purple" />
        <QuickLinkCard title="Draft" icon={Calendar} tab="draft" setActiveTab={setActiveTab} darkMode={darkMode} color="orange" />
        <QuickLinkCard title="Standings & Projections" icon={BarChart3} tab="standings" setActiveTab={setActiveTab} darkMode={darkMode} color="indigo" />
        <QuickLinkCard title="History" icon={History} tab="history" setActiveTab={setActiveTab} darkMode={darkMode} color="red" />
      </div>
    </div>
  );
}

function QuickLinkCard({ title, icon: Icon, tab, setActiveTab, darkMode, color }) {
  const colors = {
    blue: 'border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900',
    green: 'border-green-500 hover:bg-green-50 dark:hover:bg-green-900',
    purple: 'border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900',
    orange: 'border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900',
    indigo: 'border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900',
    red: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-900'
  };

  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 border-l-4 ${colors[color]} transition-all hover:shadow-lg`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-8 h-8 text-${color}-600`} />
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
    </button>
  );
}

// League Info Page Component
function LeagueInfoPage({ darkMode, leagueData, rosters, users, championName }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">League Information</h1>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">About This League</h2>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
          Welcome to {leagueData?.name}! We're a competitive keeper league where strategy meets friendship. 
          Each season brings new challenges, epic comebacks, and unforgettable moments. Whether you're chasing 
          your first championship or defending your crown, this is where legends are made.
        </p>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Scoring Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Passing</h3>
            <ul className={`space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Pass TD: {leagueData?.scoring_settings?.pass_td || 4} pts</li>
              <li>Pass Yard: {leagueData?.scoring_settings?.pass_yd || 0.04} pts</li>
              <li>Pass INT: {leagueData?.scoring_settings?.pass_int || -2} pts</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Rushing</h3>
            <ul className={`space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Rush TD: {leagueData?.scoring_settings?.rush_td || 6} pts</li>
              <li>Rush Yard: {leagueData?.scoring_settings?.rush_yd || 0.1} pts</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Receiving</h3>
            <ul className={`space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Rec TD: {leagueData?.scoring_settings?.rec_td || 6} pts</li>
              <li>Rec Yard: {leagueData?.scoring_settings?.rec_yd || 0.1} pts</li>
              <li>Reception: {leagueData?.scoring_settings?.rec || 1} pts</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">League Format</h3>
            <ul className={`space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Type: Keeper League</li>
              <li>Teams: {rosters.length}</li>
              <li>Playoff Teams: {leagueData?.settings?.playoff_teams || 6}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">League Champions</h2>
        <div className="space-y-2">
          {championName ? (
            <div className="flex items-center gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-bold">{leagueData?.season} Champion</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{championName}</p>
              </div>
            </div>
          ) : leagueData?.status === 'complete' ? (
            <div className="flex items-center gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-bold">{leagueData?.season} Season Complete</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Championship result isn't available from the API for this league yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
              <Trophy className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-bold">{leagueData?.season} Season</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {leagueData?.status === 'in_season' ? 'Season in progress...' : 
                   leagueData?.status === 'post_season' ? 'Playoffs in progress...' :
                   leagueData?.status === 'drafting' ? 'Draft in progress...' :
                   leagueData?.status === 'pre_draft' ? 'Pre-draft' : 'Season status: ' + leagueData?.status}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Current Page Component
function CurrentPage({ darkMode, currentWeek, currentMatchups, previousMatchups, rosters, leagueData, getTeamName, getAvatar }) {
  const playoffTeams = leagueData?.settings?.playoff_teams || 6;

  // Season hasn't started yet (pre-draft or drafting) - show a friendly
  // placeholder instead of a misleading "Week 0" / empty matchup boxes.
  if (currentWeek < 1) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Current Season</h1>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center`}>
          <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">
            {leagueData?.status === 'drafting' ? 'Draft is underway!' : 'Season hasn\'t started yet'}
          </h2>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Matchups and recaps will show up here once Week 1 games are underway.
          </p>
        </div>
        <StandingsTable rosters={rosters} getTeamName={getTeamName} darkMode={darkMode} showPlayoffLine={true} playoffTeams={playoffTeams} />
      </div>
    );
  }

  const groupedCurrent = currentMatchups.reduce((acc, m) => {
    if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
    acc[m.matchup_id].push(m);
    return acc;
  }, {});

  const groupedPrevious = previousMatchups.reduce((acc, m) => {
    if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
    acc[m.matchup_id].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Current Season - Week {currentWeek}</h1>
      
      <AIWeeklyRecap darkMode={darkMode} matchups={groupedPrevious} getTeamName={getTeamName} week={currentWeek} />

      <MatchupsSection title={`Week ${currentWeek} Matchups`} matchups={groupedCurrent} getTeamName={getTeamName} getAvatar={getAvatar} darkMode={darkMode} isCurrent={true} />
      
      {currentWeek > 1 && (
        <MatchupsSection title={`Week ${currentWeek - 1} Results`} matchups={groupedPrevious} getTeamName={getTeamName} getAvatar={getAvatar} darkMode={darkMode} isCurrent={false} />
      )}

      <StandingsTable rosters={rosters} getTeamName={getTeamName} darkMode={darkMode} showPlayoffLine={true} playoffTeams={playoffTeams} />
    </div>
  );
}

function MatchupsSection({ title, matchups, getTeamName, getAvatar, darkMode, isCurrent }) {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">{title}</h2>
      <div className="space-y-4">
        {Object.values(matchups).map((matchup, idx) => {
          if (matchup.length !== 2) return null;
          const [team1, team2] = matchup;
          const team1Favored = team1.points > team2.points;
          const team1Won = team1.points > team2.points;
          
          return (
            <div key={idx} className={`border rounded-lg p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <TeamDisplay 
                  name={getTeamName(team1.roster_id)} 
                  avatar={getAvatar(team1.roster_id)}
                  score={team1.points?.toFixed(2)} 
                  favored={isCurrent && team1Favored}
                  won={!isCurrent && team1Won}
                  darkMode={darkMode}
                />
                <div className="text-center text-xl sm:text-2xl font-bold text-gray-400">VS</div>
                <TeamDisplay 
                  name={getTeamName(team2.roster_id)} 
                  avatar={getAvatar(team2.roster_id)}
                  score={team2.points?.toFixed(2)} 
                  favored={isCurrent && !team1Favored}
                  won={!isCurrent && !team1Won}
                  darkMode={darkMode}
                  reverse={true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamDisplay({ name, avatar, score, favored, won, darkMode, reverse }) {
  const bgColor = won ? (darkMode ? 'bg-green-900/40' : 'bg-green-100') : 
                  favored ? (darkMode ? 'bg-green-900/20' : 'bg-green-50') : 
                  won === false ? (darkMode ? 'bg-red-900/40' : 'bg-red-100') : '';
  
  return (
    <div className={`flex-1 ${bgColor} p-3 rounded ${reverse ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-3 ${reverse ? 'flex-row-reverse' : ''}`}>
        {avatar && <img src={avatar} alt={name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />}
        <div className="flex-1">
          <p className="font-bold text-base sm:text-lg">{name}</p>
          <p className="text-xl sm:text-2xl font-bold">{score}</p>
          {won && <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-semibold">WINNER</p>}
        </div>
      </div>
    </div>
  );
}

function StandingsTable({ rosters, getTeamName, darkMode, showPlayoffLine, playoffTeams = 6 }) {
  const sortedRosters = [...rosters].sort((a, b) => {
    if ((b.settings.wins || 0) !== (a.settings.wins || 0)) {
      return (b.settings.wins || 0) - (a.settings.wins || 0);
    }
    return (b.settings.fpts || 0) - (a.settings.fpts || 0);
  });

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto`}>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Current Standings</h2>
      <table className="w-full">
        <thead>
          <tr className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <th className="text-left p-2 text-sm sm:text-base">Rank</th>
            <th className="text-left p-2 text-sm sm:text-base">Team</th>
            <th className="text-center p-2 text-sm sm:text-base">W</th>
            <th className="text-center p-2 text-sm sm:text-base">L</th>
            <th className="text-center p-2 text-sm sm:text-base">PF</th>
          </tr>
        </thead>
        <tbody>
          {sortedRosters.map((roster, idx) => (
            <tr 
              key={roster.roster_id} 
              className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} ${
                showPlayoffLine && idx === playoffTeams - 1 ? 'border-b-4 border-red-500' : ''
              }`}
            >
              <td className="p-2 font-bold text-sm sm:text-base">{idx + 1}</td>
              <td className="p-2 text-sm sm:text-base">{getTeamName(roster.roster_id)}</td>
              <td className="text-center p-2 text-sm sm:text-base">{roster.settings.wins || 0}</td>
              <td className="text-center p-2 text-sm sm:text-base">{roster.settings.losses || 0}</td>
              <td className="text-center p-2 text-sm sm:text-base">{(roster.settings.fpts || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showPlayoffLine && (
        <p className={`text-xs sm:text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Red line indicates playoff cutoff
        </p>
      )}
    </div>
  );
}

// AI Recap Component
function AIWeeklyRecap({ darkMode, matchups, getTeamName, week }) {
  const [recap, setRecap] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const cacheKey = `recap_week_${week}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { text, timestamp } = JSON.parse(cached);
        const cacheDate = new Date(timestamp);
        const now = new Date();
        const nextTuesday = getNextTuesday(cacheDate);
        
        if (now < nextTuesday) {
          setRecap(text);
          setGenerated(true);
          return;
        }
      } catch (e) {}
    }
  }, [week]);

  const getNextTuesday = (fromDate) => {
    const date = new Date(fromDate);
    const day = date.getDay();
    const daysUntilTuesday = day <= 2 ? 2 - day : 9 - day;
    date.setDate(date.getDate() + daysUntilTuesday);
    date.setHours(12, 0, 0, 0);
    return date;
  };

  const generateRecap = async () => {
    setLoading(true);
    try {
      const matchupData = Object.values(matchups).map(matchup => {
        if (matchup.length !== 2) return null;
        const [team1, team2] = matchup;
        return {
          team1: getTeamName(team1.roster_id),
          team1Score: team1.points?.toFixed(2),
          team2: getTeamName(team2.roster_id),
          team2Score: team2.points?.toFixed(2),
          winner: team1.points > team2.points ? getTeamName(team1.roster_id) : getTeamName(team2.roster_id),
          margin: Math.abs(team1.points - team2.points).toFixed(2)
        };
      }).filter(Boolean);

      const response = await fetch('/api/generate-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchupData, week })
      });

      const data = await response.json();
      const recapText = data.recap || 'Unable to generate recap.';
      setRecap(recapText);
      setGenerated(true);
      
      const cacheKey = `recap_week_${week}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        text: recapText,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error generating recap:', error);
      setRecap('Unable to generate AI recap. Please try again later.');
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  if (!generated) {
    return (
      <div className={`${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border-2 rounded-lg p-4 sm:p-6 text-center`}>
        <h3 className="font-bold text-lg mb-2">Weekly Recap</h3>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm sm:text-base`}>Get a recap of what happened last week and what to watch this week!</p>
        <button
          onClick={generateRecap}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Weekly Recap'}
        </button>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border-2 rounded-lg p-4 sm:p-6`}>
      <h3 className="font-bold text-lg mb-3">🤖 Week {week} Recap & Preview</h3>
      <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-line text-sm sm:text-base`}>
        {recap}
      </div>
      <button onClick={generateRecap} disabled={loading} className="mt-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium text-sm">
        {loading ? 'Regenerating...' : 'Regenerate Recap'}
      </button>
    </div>
  );
}

// Waivers Page - Placeholder (needs more API integration)
function WaiversPage({ darkMode, transactions, trendingPlayers, players, rosters, getTeamName, getPlayerName, getPlayerPosition, getPlayerTeam, isPlayerRostered }) {
  const [positionFilter, setPositionFilter] = useState('ALL');
  
  // Memoize expensive player filtering computation
  const getTopAvailablePlayers = React.useMemo(() => {
    return (position = 'ALL', limit = 10) => {
      // Only process if we have players data
      if (!players || Object.keys(players).length === 0) return [];
      
      return Object.entries(players)
        .filter(([playerId, player]) => {
          if (isPlayerRostered(playerId)) return false;
          if (position !== 'ALL' && player.position !== position) return false;
          if (!player.fantasy_positions || player.fantasy_positions.length === 0) return false;
          return true;
        })
        .sort((a, b) => {
          const aPoints = a[1].stats?.pts_ppr || 0;
          const bPoints = b[1].stats?.pts_ppr || 0;
          return bPoints - aPoints;
        })
        .slice(0, limit)
        .map(([playerId]) => playerId);
    };
  }, [players, rosters]); // Only recalculate when players or rosters change

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const availablePlayers = getTopAvailablePlayers(positionFilter, 10);

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Waivers & Free Agents</h1>
      
      {/* Trending Players - Sleeper-wide, not just this league */}
      <div>
        <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Trending adds/drops below reflect activity across <strong>all of Sleeper</strong> in the last 24
          hours (via Sleeper's trending API), not just this league — so you can catch waiver-wire buzz
          early. ESPN and Yahoo don't offer a public trending feed like this, so this is Sleeper-platform
          data specifically. "In league" tags show players already on a roster here.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
            <h2 className="text-xl font-bold mb-4 text-green-600">📈 Trending Adds (Sleeper-wide)</h2>
            <div className="space-y-2">
              {trendingPlayers.add.slice(0, 5).map(({ playerId, count }) => (
                <div key={playerId} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div>
                    <p className="font-semibold">
                      {getPlayerName(playerId)}
                      {isPlayerRostered(playerId) && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">in league</span>}
                    </p>
                    <p className="text-sm text-gray-500">{getPlayerPosition(playerId)} - {getPlayerTeam(playerId)}</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">{count.toLocaleString()} adds</span>
                </div>
              ))}
              {trendingPlayers.add.length === 0 && (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No trending adds right now</p>
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
            <h2 className="text-xl font-bold mb-4 text-red-600">📉 Trending Drops (Sleeper-wide)</h2>
            <div className="space-y-2">
              {trendingPlayers.drop.slice(0, 5).map(({ playerId, count }) => (
                <div key={playerId} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div>
                    <p className="font-semibold">
                      {getPlayerName(playerId)}
                      {isPlayerRostered(playerId) && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">in league</span>}
                    </p>
                    <p className="text-sm text-gray-500">{getPlayerPosition(playerId)} - {getPlayerTeam(playerId)}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">{count.toLocaleString()} drops</span>
                </div>
              ))}
              {trendingPlayers.drop.length === 0 && (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No trending drops right now</p>
              )}
            </div>
          </div>
        </div>
        <p className={`text-[11px] mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Trending data courtesy of Sleeper.</p>
      </div>

      {/* Top Available Players */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold">Top Available Players</h2>
          <div className="flex gap-2 flex-wrap">
            {positions.map(pos => (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  positionFilter === pos
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          {availablePlayers.map(playerId => (
            <div key={playerId} className={`flex items-center justify-between p-3 rounded border ${darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <p className="font-semibold">{getPlayerName(playerId)}</p>
                <p className="text-sm text-gray-500">{getPlayerPosition(playerId)} - {getPlayerTeam(playerId)}</p>
              </div>
            </div>
          ))}
          {availablePlayers.length === 0 && (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No available players in this category</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {transactions.slice(0, 20).map((trans, idx) => (
            <div key={idx} className={`p-3 rounded border-l-4 ${
              trans.type === 'waiver' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
              trans.type === 'free_agent' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
              trans.type === 'trade' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' :
              'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize">{trans.type.replace('_', ' ')}</p>
                  <div className="text-sm mt-1">
                    {trans.adds && Object.keys(trans.adds).length > 0 && (
                      <p className="text-green-600 dark:text-green-400">
                        + Added: {Object.keys(trans.adds).map(pid => getPlayerName(pid)).join(', ')}
                      </p>
                    )}
                    {trans.drops && Object.keys(trans.drops).length > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        - Dropped: {Object.keys(trans.drops).map(pid => getPlayerName(pid)).join(', ')}
                      </p>
                    )}
                  </div>
                  {trans.roster_ids && trans.roster_ids.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      By: {trans.roster_ids.map(rid => getTeamName(rid)).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(trans.created).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No recent transactions</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Draft Page with full functionality
function DraftPage({ darkMode, draftPicks, rosters, users, getTeamName, getPlayerName, players }) {
  const [expandedTeam, setExpandedTeam] = useState(null);
  
  // Keeper cost calculator function
  const calculateKeeperCost = (draftRound, yearsKept) => {
    if (!draftRound || draftRound === 0) {
      // Undrafted/FA player - starts at 15th round
      const rounds = [15, 12, 9, 6, 4, 2, 1];
      return rounds[Math.min(yearsKept, rounds.length - 1)];
    }
    
    // Drafted player
    let cost = draftRound;
    for (let i = 0; i < yearsKept; i++) {
      if (cost > 5) {
        // Rounds 6+ decrease by 3 each year
        cost = Math.max(1, cost - 3);
      } else {
        // Rounds 1-5 decrease by 2 each year
        cost = Math.max(1, cost - 2);
      }
      if (cost === 1) break;
    }
    return cost;
  };

  // Organize draft picks by round and pick
  const draftBoard = draftPicks.reduce((board, pick) => {
    if (!board[pick.round]) board[pick.round] = [];
    board[pick.round][pick.draft_slot - 1] = pick;
    return board;
  }, {});

  const rounds = Object.keys(draftBoard).sort((a, b) => a - b);
  const numTeams = rosters.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Draft & Keepers</h1>
      
      {/* Keeper Rules */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Keeper Rules</h2>
        <div className={`space-y-2 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <p><strong>• Keep up to 2 players</strong></p>
          <p><strong>• First year:</strong> Same round as drafted</p>
          <p><strong>• Rounds 6-15:</strong> Cost increases by 3 rounds per year (10th → 7th → 4th → 2nd → 1st)</p>
          <p><strong>• Rounds 1-5:</strong> Cost increases by 2 rounds per year (5th → 3rd → 1st)</p>
          <p><strong>• Undrafted/FA:</strong> Start at 15th round, then 12th → 9th → 6th → 4th → 2nd → 1st</p>
          <p><strong>• Maximum:</strong> Once at 1st round cost for one year, then must release</p>
          <p><strong>• Tie-breaker:</strong> If two players cost same pick, lower ADP costs +1 round</p>
        </div>
      </div>

      {/* Draft Board */}
      {draftPicks.length > 0 ? (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Draft Board</h2>
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <th className="p-2 text-left">Rd</th>
                {Array.from({ length: numTeams }, (_, i) => (
                  <th key={i} className="p-2 text-center">Pick {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map(round => (
                <tr key={round} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className="p-2 font-bold">{round}</td>
                  {Array.from({ length: numTeams }, (_, i) => {
                    const pick = draftBoard[round][i];
                    return (
                      <td key={i} className="p-2 text-center">
                        {pick ? (
                          <div className="text-xs">
                            <div className="font-semibold truncate">{getPlayerName(pick.player_id)}</div>
                            <div className="text-gray-500">{players[pick.player_id]?.position || ''}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Draft Board</h2>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Draft data not yet available for this season.</p>
        </div>
      )}

      {/* Team Rosters with Keeper Costs */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Team Rosters & Keeper Costs</h2>
        <div className="space-y-2">
          {rosters.map(roster => {
            const isExpanded = expandedTeam === roster.roster_id;
            return (
              <div key={roster.roster_id} className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : roster.roster_id)}
                  className={`w-full flex items-center justify-between p-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}
                >
                  <span className="font-bold">{getTeamName(roster.roster_id)}</span>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {isExpanded && (
                  <div className="p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'}">
                    <div className="space-y-2">
                      {roster.players && roster.players.map(playerId => {
                        const player = players[playerId];
                        const draftPick = draftPicks.find(p => p.player_id === playerId);
                        const draftRound = draftPick?.round || 0;
                        
                        return (
                          <div key={playerId} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <div>
                              <p className="font-semibold">{getPlayerName(playerId)}</p>
                              <p className="text-sm text-gray-500">{player?.position || 'N/A'} - {player?.team || 'FA'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Keeper Cost (Year 1):</p>
                              <p className="font-bold">
                                {draftRound === 0 ? '15th round' : `${draftRound}${draftRound === 1 ? 'st' : draftRound === 2 ? 'nd' : draftRound === 3 ? 'rd' : 'th'} round`}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Year 2: {calculateKeeperCost(draftRound, 1)}th, 
                                Year 3: {calculateKeeperCost(draftRound, 2)}th
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keeper Cost Calculator */}
      <KeeperCalculator darkMode={darkMode} calculateKeeperCost={calculateKeeperCost} />
    </div>
  );
}

// Keeper Calculator Component
function KeeperCalculator({ darkMode, calculateKeeperCost }) {
  const [draftRound, setDraftRound] = useState(10);
  const [isUndrafted, setIsUndrafted] = useState(false);
  
  const years = [0, 1, 2, 3, 4, 5, 6];
  
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Keeper Cost Calculator</h2>
      
      <div className="mb-6 space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={isUndrafted}
              onChange={(e) => setIsUndrafted(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-medium">Undrafted / Free Agent</span>
          </label>
        </div>
        
        {!isUndrafted && (
          <div>
            <label className="block font-medium mb-2">Original Draft Round:</label>
            <input
              type="number"
              min="1"
              max="15"
              value={draftRound}
              onChange={(e) => setDraftRound(parseInt(e.target.value))}
              className={`border rounded px-3 py-2 w-32 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
        )}
      </div>

      <div className={`${darkMode ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30' : 'bg-gradient-to-r from-blue-50 to-purple-50'} rounded-lg p-6 mb-6`}>
        <h3 className="font-bold text-lg mb-4 text-center">Keeper Cost Over Time</h3>
        <div className="grid grid-cols-7 gap-2">
          {years.map(year => {
            const cost = calculateKeeperCost(isUndrafted ? 0 : draftRound, year);
            const canKeep = !(draftRound > 0 && cost === 1 && year > 0);
            
            return (
              <div key={year} className="text-center">
                <div className={`rounded-lg p-3 sm:p-4 ${canKeep ? darkMode ? 'bg-gray-800 shadow-lg' : 'bg-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 opacity-50'}`}>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Year {year + 1}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${canKeep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    {canKeep ? (cost === 1 ? '1st' : `${cost}th`) : 'N/A'}
                  </p>
                  {!canKeep && year > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">Can't keep</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <h3 className="font-bold mb-2">How It Works:</h3>
        <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <p><strong>Drafted Players (Rounds 6-15):</strong> Start at draft round, decrease by 3 rounds/year until reaching rounds 1-5.</p>
          <p><strong>Drafted Players (Rounds 1-5):</strong> Decrease by 2 rounds/year until reaching 1st round.</p>
          <p><strong>Free Agents:</strong> Start at 15th, decrease by 3 until round 6, then by 2.</p>
          <p><strong>Final Year:</strong> Once at 1st round cost for one year, cannot be kept anymore.</p>
          <p className="text-xs italic mt-3">Example: 10th round pick → 10th → 7th → 4th → 2nd → 1st (final year)</p>
        </div>
      </div>
    </div>
  );
}

// Standings Page with projections
// --- Lineup-optimization helpers (used for the Most Efficient Manager stat) ---

// Maps flex-style slot codes to the set of positions eligible to fill them.
// Any slot code not listed here (QB, RB, WR, TE, K, DEF, DL, LB, DB, ...) is
// treated as requiring an exact position match.
const FLEX_ELIGIBILITY = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  WRRB_FLEX: ['WR', 'RB'],
  REC_FLEX: ['WR', 'TE'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
};
const NON_STARTING_SLOTS = new Set(['BN', 'IR', 'TAXI']);

function getStartingSlots(rosterPositions) {
  return (rosterPositions || []).filter(slot => !NON_STARTING_SLOTS.has(slot));
}

function getSlotEligiblePositions(slotCode) {
  return FLEX_ELIGIBILITY[slotCode] || [slotCode];
}

// Greedy-optimal lineup solver: fills the most restrictive slots (single
// exact position) first, then flex-type slots (which are supersets of
// exact positions) with whoever's left. This ordering is optimal here
// because a flex slot's eligible set is always a superset of the exact
// slots it competes with, so there's never a reason to "save" a player
// for a flex slot at the expense of a required exact slot.
function computeBestLineupPoints(playerIds, playerPoints, playerMeta, startingSlots) {
  const pool = (playerIds || [])
    .map(id => {
      const meta = playerMeta[id];
      const positions = (meta?.fantasy_positions && meta.fantasy_positions.length > 0)
        ? meta.fantasy_positions
        : (meta?.position ? [meta.position] : []);
      const pts = playerPoints && playerPoints[id] != null ? Number(playerPoints[id]) : 0;
      return { id, positions, pts };
    })
    .filter(p => p.positions.length > 0);

  const slotsBySpecificity = [...startingSlots].sort(
    (a, b) => getSlotEligiblePositions(a).length - getSlotEligiblePositions(b).length
  );

  const available = [...pool];
  let total = 0;
  slotsBySpecificity.forEach(slot => {
    const eligible = getSlotEligiblePositions(slot);
    let bestIdx = -1;
    let bestPts = -Infinity;
    available.forEach((p, idx) => {
      if (p.positions.some(pos => eligible.includes(pos)) && p.pts > bestPts) {
        bestPts = p.pts;
        bestIdx = idx;
      }
    });
    if (bestIdx !== -1) {
      total += available[bestIdx].pts;
      available.splice(bestIdx, 1);
    }
  });
  return total;
}

function StandingsPage({ darkMode, rosters, getTeamName, currentWeek, leagueData, allMatchups = {}, players = {} }) {
  const regularSeasonWeeks = leagueData?.settings?.playoff_week_start ? leagueData.settings.playoff_week_start - 1 : 14;
  const weeksRemaining = Math.max(0, regularSeasonWeeks - currentWeek);
  
  // Calculate projected final records
  const projectionsData = rosters.map(roster => {
    const wins = roster.settings.wins || 0;
    const losses = roster.settings.losses || 0;
    const ties = roster.settings.ties || 0;
    const gamesPlayed = wins + losses + ties;
    const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    
    // Project remaining games at current win percentage
    const projectedWins = Math.round(wins + (weeksRemaining * winPct));
    const projectedLosses = Math.round(losses + (weeksRemaining * (1 - winPct)));
    
    return {
      rosterId: roster.roster_id,
      currentWins: wins,
      currentLosses: losses,
      projectedWins,
      projectedLosses,
      pointsFor: roster.settings.fpts || 0,
      pointsAgainst: roster.settings.fpts_against || 0
    };
  });

  const sortedProjections = [...projectionsData].sort((a, b) => {
    if (b.projectedWins !== a.projectedWins) return b.projectedWins - a.projectedWins;
    return b.pointsFor - a.pointsFor;
  });

  const playoffTeams = leagueData?.settings?.playoff_teams || 6;

  // Only use weeks that have actually finished. The "current" week can still
  // be live (some teams played Thursday, others haven't played yet), and
  // including it here would badly skew both Expected Wins and the lineup
  // efficiency stat below - so both use this same completed-weeks slice.
  const completedWeekMatchups = Object.entries(allMatchups)
    .filter(([wk]) => parseInt(wk, 10) < currentWeek)
    .map(([, matchups]) => matchups);

  const startingSlots = getStartingSlots(leagueData?.roster_positions);
  const hasPlayerData = players && Object.keys(players).length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Standings & Projections</h1>
      
      <StandingsTable rosters={rosters} getTeamName={getTeamName} darkMode={darkMode} showPlayoffLine={true} playoffTeams={playoffTeams} />

      {weeksRemaining > 0 && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Projected Final Standings</h2>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Based on current win percentage with {weeksRemaining} weeks remaining
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-center p-2">Current</th>
                  <th className="text-center p-2">Projected</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjections.map((proj, idx) => (
                  <tr key={proj.rosterId} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${idx === playoffTeams - 1 ? 'border-b-4 border-red-500' : ''}`}>
                    <td className="p-2 font-bold">{idx + 1}</td>
                    <td className="p-2">{getTeamName(proj.rosterId)}</td>
                    <td className="text-center p-2">{proj.currentWins}-{proj.currentLosses}</td>
                    <td className="text-center p-2 font-bold">{proj.projectedWins}-{proj.projectedLosses}</td>
                    <td className="text-center p-2">
                      {idx < playoffTeams ? (
                        <span className="text-green-600 dark:text-green-400 font-semibold">Playoffs</span>
                      ) : (
                        <span className="text-gray-500">Eliminated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">League Analytics</h2>
        
        {/* Expected Wins vs Actual - fixed version */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">Expected Wins vs Actual Wins</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            For each completed week, we compare a team's score against every other team that week
            (not just their actual opponent) to see how many "all-play" wins their scoring
            deserved, then sum that across the season. Only finished weeks count — the current,
            possibly still-live week is excluded so partial scores can't skew this.
          </p>
          <div className="space-y-2">
            {rosters
              .map(roster => {
                const actualWins = roster.settings.wins || 0;

                let expectedWins = 0;
                completedWeekMatchups.forEach(weekMatchups => {
                  const teamMatchup = weekMatchups?.find(m => m.roster_id === roster.roster_id);
                  if (teamMatchup && teamMatchup.points != null && weekMatchups.length > 1) {
                    const beaten = weekMatchups.filter(m =>
                      m.roster_id !== roster.roster_id && m.points < teamMatchup.points
                    ).length;
                    const tied = weekMatchups.filter(m =>
                      m.roster_id !== roster.roster_id && m.points === teamMatchup.points
                    ).length;
                    expectedWins += (beaten + tied * 0.5) / (weekMatchups.length - 1);
                  }
                });
                
                const difference = actualWins - expectedWins;
                const isLucky = difference > 0.5;
                const isUnlucky = difference < -0.5;
                
                return {
                  rosterId: roster.roster_id,
                  actualWins,
                  expectedWins: expectedWins.toFixed(1),
                  difference: difference.toFixed(1),
                  isLucky,
                  isUnlucky
                };
              })
              .sort((a, b) => parseFloat(b.difference) - parseFloat(a.difference))
              .map(team => (
                <div key={team.rosterId} className={`flex items-center justify-between p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex-1">
                    <p className="font-semibold">{getTeamName(team.rosterId)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Actual</p>
                      <p className="font-bold">{team.actualWins}W</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Expected</p>
                      <p className="font-bold">{team.expectedWins}W</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className={`font-bold ${team.isLucky ? 'text-green-600 dark:text-green-400' : team.isUnlucky ? 'text-red-600 dark:text-red-400' : 'text-gray-600'}`}>
                        {parseFloat(team.difference) > 0 ? '+' : ''}{team.difference}
                      </p>
                      <p className="text-xs">
                        {team.isLucky ? '🍀 Lucky' : team.isUnlucky ? '😢 Unlucky' : '😐 Fair'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Other Analytics - You can swap these out for different stats */}
        <h3 className="font-bold text-lg mb-3">Season Leaders</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Option 1: Highest Scorer */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className="font-semibold mb-2">Highest Scorer</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {getTeamName(rosters.reduce((max, r) => (r.settings.fpts || 0) > (max.settings.fpts || 0) ? r : max, rosters[0]).roster_id)}
            </p>
            <p className="text-sm text-gray-500">{Math.max(...rosters.map(r => r.settings.fpts || 0)).toFixed(2)} pts</p>
          </div>

          {/* Option 2: Most Efficient Manager (lineup optimization) */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className="font-semibold mb-2">Most Efficient Manager</h3>
            {!hasPlayerData ? (
              <p className="text-sm text-gray-500">Loading player data...</p>
            ) : completedWeekMatchups.length === 0 ? (
              <p className="text-sm text-gray-500">Not enough completed weeks yet</p>
            ) : (() => {
              const efficiencyByTeam = rosters.map(r => {
                let actualSum = 0;
                let bestSum = 0;
                completedWeekMatchups.forEach(weekMatchups => {
                  const m = weekMatchups?.find(wm => wm.roster_id === r.roster_id);
                  if (!m || m.points == null) return;
                  actualSum += m.points;
                  bestSum += computeBestLineupPoints(m.players, m.players_points, players, startingSlots);
                });
                const efficiency = bestSum > 0 ? (actualSum / bestSum) * 100 : 0;
                return { rosterId: r.roster_id, efficiency, benchPtsLeft: bestSum - actualSum };
              }).filter(t => t.efficiency > 0);

              if (efficiencyByTeam.length === 0) {
                return <p className="text-sm text-gray-500">Not enough data yet</p>;
              }
              const best = efficiencyByTeam.reduce((max, t) => t.efficiency > max.efficiency ? t : max, efficiencyByTeam[0]);
              return (
                <>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {getTeamName(best.rosterId)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {best.efficiency.toFixed(1)}% of best possible lineup started
                  </p>
                </>
              );
            })()}
          </div>

          {/* Option 3: Most Unlucky (Highest PA) */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className="font-semibold mb-2">Most Unlucky (Highest PA)</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {getTeamName(rosters.reduce((max, r) => (r.settings.fpts_against || 0) > (max.settings.fpts_against || 0) ? r : max, rosters[0]).roster_id)}
            </p>
            <p className="text-sm text-gray-500">{Math.max(...rosters.map(r => r.settings.fpts_against || 0)).toFixed(2)} PA</p>
          </div>

          {/* ALTERNATIVE OPTIONS YOU CAN USE INSTEAD:
          
          Option 4: Point Differential
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className="font-semibold mb-2">Best Point Differential</h3>
            {(() => {
              const teamDiff = rosters.map(r => ({
                rosterId: r.roster_id,
                diff: (r.settings.fpts || 0) - (r.settings.fpts_against || 0)
              }));
              const best = teamDiff.reduce((max, r) => r.diff > max.diff ? r : max, teamDiff[0]);
              return (
                <>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {getTeamName(best.rosterId)}
                  </p>
                  <p className="text-sm text-gray-500">+{best.diff.toFixed(2)} differential</p>
                </>
              );
            })()}
          </div>
          
          Option 5: Close Game Record
          Option 6: Blowout Wins/Losses
          Option 7: Consistency (Lowest Standard Deviation)
          Option 8: Highest Single Week Score
          
          Just uncomment and swap in above! */}
        </div>
      </div>
    </div>
  );
}

// History Page with records and season archives
function HistoryPage({ darkMode, rosters, users, allMatchups, leagueData, championName, getTeamName, getAvatar }) {
  const [expandedSeason, setExpandedSeason] = useState(null);

  // Calculate highest score from all matchups
  const calculateHighestScore = () => {
    let highest = { score: 0, team: null, week: 0 };
    Object.entries(allMatchups).forEach(([week, matchups]) => {
      matchups?.forEach(matchup => {
        if (matchup.points > highest.score) {
          highest = { score: matchup.points, team: matchup.roster_id, week: parseInt(week) };
        }
      });
    });
    return highest;
  };

  // Calculate longest win streak
  const calculateLongestStreak = () => {
    const teamStreaks = {};
    rosters.forEach(roster => teamStreaks[roster.roster_id] = { current: 0, longest: 0 });

    const weeks = Object.keys(allMatchups).sort((a, b) => a - b);
    weeks.forEach(week => {
      const matchups = allMatchups[week] || [];
      const grouped = matchups.reduce((acc, m) => {
        if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
        acc[m.matchup_id].push(m);
        return acc;
      }, {});

      Object.values(grouped).forEach(pair => {
        if (pair.length === 2) {
          const [team1, team2] = pair;
          const winner = team1.points > team2.points ? team1.roster_id : team2.roster_id;
          const loser = team1.points > team2.points ? team2.roster_id : team1.roster_id;

          if (teamStreaks[winner]) {
            teamStreaks[winner].current++;
            teamStreaks[winner].longest = Math.max(teamStreaks[winner].longest, teamStreaks[winner].current);
          }
          if (teamStreaks[loser]) {
            teamStreaks[loser].current = 0;
          }
        }
      });
    });

    let longestStreak = { team: null, streak: 0 };
    Object.entries(teamStreaks).forEach(([rosterId, data]) => {
      if (data.longest > longestStreak.streak) {
        longestStreak = { team: parseInt(rosterId), streak: data.longest };
      }
    });

    return longestStreak;
  };

  const highestScore = calculateHighestScore();
  const longestStreak = calculateLongestStreak();

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">League History</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center border-2 border-yellow-500`}>
          <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg mb-2">League Champion 👑</h3>
          {championName ? (
            <>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{championName}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{leagueData?.season} Season</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{leagueData?.season || 'This'} Season</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                {leagueData?.status === 'complete' ? "Season complete - championship result not available from the API" :
                 leagueData?.status === 'post_season' ? 'Playoffs in progress!' :
                 leagueData?.status === 'in_season' ? 'Regular season in progress...' :
                 leagueData?.status === 'drafting' ? 'Draft in progress...' :
                 'Season not started'}
              </p>
            </>
          )}
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center border-2 border-blue-500`}>
          <Trophy className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg mb-2">Highest Score</h3>
          {highestScore.team ? (
            <>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{highestScore.score.toFixed(2)} pts</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                {getTeamName(highestScore.team)}
              </p>
              <p className="text-xs text-gray-500">Week {highestScore.week}</p>
            </>
          ) : (
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>No data yet</p>
          )}
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center border-2 border-green-500`}>
          <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg mb-2">Longest Win Streak</h3>
          {longestStreak.team ? (
            <>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{longestStreak.streak} games</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                {getTeamName(longestStreak.team)}
              </p>
            </>
          ) : (
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>No data yet</p>
          )}
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{leagueData?.season || 'This Season'} Week-by-Week</h2>
        {Object.keys(allMatchups).length === 0 && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No games played yet this season - check back after Week 1!
          </p>
        )}
        <div className="space-y-2">
          {Object.keys(allMatchups)
            .sort((a, b) => b - a)
            .map(week => {
              const isExpanded = expandedSeason === week;
              const matchups = allMatchups[week] || [];
              const grouped = matchups.reduce((acc, m) => {
                if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
                acc[m.matchup_id].push(m);
                return acc;
              }, {});

              return (
                <div key={week} className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  <button
                    onClick={() => setExpandedSeason(isExpanded ? null : week)}
                    className={`w-full flex items-center justify-between p-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}
                  >
                    <span className="font-bold">Week {week}</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {isExpanded && (
                    <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="space-y-3">
                        {Object.values(grouped).map((pair, idx) => {
                          if (pair.length !== 2) return null;
                          const [team1, team2] = pair;
                          const team1Won = team1.points > team2.points;

                          return (
                            <div key={idx} className={`p-3 rounded border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between">
                                <div className={`flex-1 p-2 rounded ${team1Won ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                  <p className="font-semibold">{getTeamName(team1.roster_id)}</p>
                                  <p className="text-xl font-bold">{team1.points.toFixed(2)}</p>
                                </div>
                                <span className="px-4 text-gray-400">VS</span>
                                <div className={`flex-1 p-2 rounded text-right ${!team1Won ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                  <p className="font-semibold">{getTeamName(team2.roster_id)}</p>
                                  <p className="text-xl font-bold">{team2.points.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
