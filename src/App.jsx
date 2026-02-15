import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, History, Users, Calendar, BarChart3, Info, Moon, Sun, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const LEAGUE_ID = '1257085009114697728';
const API_BASE = 'https://api.sleeper.app/v1';
const CURRENT_YEAR = '2024';

export default function FantasyLeagueSite() {
  const [activeTab, setActiveTab] = useState('home');
  const [leagueData, setLeagueData] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentMatchups, setCurrentMatchups] = useState([]);
  const [previousMatchups, setPreviousMatchups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [darkMode, setDarkMode] = useState(false);

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
      
      const leagueRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}`);
      const league = await leagueRes.json();
      setLeagueData(league);
      
      const rostersRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/rosters`);
      const rostersData = await rostersRes.json();
      setRosters(rostersData);
      
      const usersRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);
      
      const week = league.settings.leg || 1;
      setCurrentWeek(week);
      
      if (week <= 18) {
        const currentRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week}`);
        const current = await currentRes.json();
        setCurrentMatchups(current || []);
      }
      
      if (week > 1) {
        const prevRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week - 1}`);
        const prev = await prevRes.json();
        setPreviousMatchups(prev || []);
      }

      // Fetch recent transactions
      const transRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/transactions/${week}`);
      const transData = await transRes.json();
      setTransactions(transData || []);
      
    } catch (error) {
      console.error('Error fetching league data:', error);
    } finally {
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {activeTab === 'home' && <HomePage darkMode={darkMode} leagueData={leagueData} rosters={rosters} currentWeek={currentWeek} setActiveTab={setActiveTab} />}
        {activeTab === 'info' && <LeagueInfoPage darkMode={darkMode} leagueData={leagueData} rosters={rosters} users={users} />}
        {activeTab === 'current' && <CurrentPage darkMode={darkMode} currentWeek={currentWeek} currentMatchups={currentMatchups} previousMatchups={previousMatchups} rosters={rosters} getTeamName={getTeamName} getAvatar={getAvatar} />}
        {activeTab === 'waivers' && <WaiversPage darkMode={darkMode} transactions={transactions} getTeamName={getTeamName} />}
        {activeTab === 'draft' && <DraftPage darkMode={darkMode} rosters={rosters} users={users} getTeamName={getTeamName} />}
        {activeTab === 'standings' && <StandingsPage darkMode={darkMode} rosters={rosters} getTeamName={getTeamName} currentWeek={currentWeek} />}
        {activeTab === 'history' && <HistoryPage darkMode={darkMode} rosters={rosters} users={users} getTeamName={getTeamName} getAvatar={getAvatar} />}
      </div>
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
function LeagueInfoPage({ darkMode, leagueData, rosters, users }) {
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
          <div className="flex items-center gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-bold">2024 Champion</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Season in progress...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Current Page Component
function CurrentPage({ darkMode, currentWeek, currentMatchups, previousMatchups, rosters, getTeamName, getAvatar }) {
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

      <StandingsTable rosters={rosters} getTeamName={getTeamName} darkMode={darkMode} showPlayoffLine={true} />
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

function StandingsTable({ rosters, getTeamName, darkMode, showPlayoffLine }) {
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
                showPlayoffLine && idx === 5 ? 'border-b-4 border-blue-500' : ''
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
          Blue line indicates playoff cutoff
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
        <h3 className="font-bold text-lg mb-2">🤖 AI Weekly Recap</h3>
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
function WaiversPage({ darkMode, transactions, getTeamName }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Waivers & Free Agents</h1>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Recent Transactions</h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>Transaction data coming soon...</p>
      </div>
    </div>
  );
}

// Draft Page - Placeholder
function DraftPage({ darkMode, rosters, users, getTeamName }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Draft & Keepers</h1>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Keeper Rules</h2>
        <div className={`space-y-2 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <p><strong>• Keep up to 2 players</strong></p>
          <p><strong>• Rounds 6-15:</strong> Cost increases by 3 rounds per year (10th → 7th → 4th → 2nd → 1st)</p>
          <p><strong>• Rounds 1-5:</strong> Cost increases by 2 rounds per year (5th → 3rd → 1st)</p>
          <p><strong>• Undrafted/FA:</strong> Start at 15th round</p>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Draft Board</h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>Draft data coming soon...</p>
      </div>
    </div>
  );
}

// Standings Page - Placeholder
function StandingsPage({ darkMode, rosters, getTeamName, currentWeek }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Standings & Projections</h1>
      
      <StandingsTable rosters={rosters} getTeamName={getTeamName} darkMode={darkMode} showPlayoffLine={true} />

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Projected Final Standings</h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>Projections coming soon...</p>
      </div>
    </div>
  );
}

// History Page - Placeholder
function HistoryPage({ darkMode, rosters, users, getTeamName, getAvatar }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">League History</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center`}>
          <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg">Most Championships</h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Coming soon...</p>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center`}>
          <Trophy className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg">Highest Score</h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Coming soon...</p>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 text-center`}>
          <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h3 className="font-bold text-lg">Longest Win Streak</h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Coming soon...</p>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 sm:p-6`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Season Archives</h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>Historical data coming soon...</p>
      </div>
    </div>
  );
}
