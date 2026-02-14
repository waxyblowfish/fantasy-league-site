import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, History, Users, Calendar, DollarSign, BarChart3, Sparkles } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const LEAGUE_ID = '1257085009114697728';
const API_BASE = 'https://api.sleeper.app/v1';

export default function FantasyLeagueSite() {
  const [activeTab, setActiveTab] = useState('home');
  const [leagueData, setLeagueData] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState({});
  const [currentMatchups, setCurrentMatchups] = useState([]);
  const [previousMatchups, setPreviousMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    fetchLeagueData();
  }, []);

  const fetchLeagueData = async () => {
    try {
      setLoading(true);
      
      // Fetch league info
      const leagueRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}`);
      const league = await leagueRes.json();
      setLeagueData(league);
      
      // Fetch rosters
      const rostersRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/rosters`);
      const rostersData = await rostersRes.json();
      setRosters(rostersData);
      
      // Fetch users
      const usersRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);
      
      // Fetch players (cached - only need once)
      const playersRes = await fetch(`${API_BASE}/players/nfl`);
      const playersData = await playersRes.json();
      setPlayers(playersData);
      
      // Determine current week
      const week = league.settings.leg || 1;
      setCurrentWeek(week);
      
      // Fetch current week matchups
      if (week <= 18) {
        const currentRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week}`);
        const current = await currentRes.json();
        setCurrentMatchups(current || []);
      }
      
      // Fetch previous week matchups
      if (week > 1) {
        const prevRes = await fetch(`${API_BASE}/league/${LEAGUE_ID}/matchups/${week - 1}`);
        const prev = await prevRes.json();
        setPreviousMatchups(prev || []);
      }
      
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

  const canKeepPlayer = (draftRound, yearsKept) => {
    const cost = calculateKeeperCost(draftRound, yearsKept);
    return !(draftRound > 0 && cost === 1 && yearsKept > 0);
  };

  const renderHome = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-12 h-12" />
          <h1 className="text-4xl font-bold">{leagueData?.name || 'Fantasy Football League'}</h1>
        </div>
        <p className="text-xl opacity-90">Season {leagueData?.season || '2024'} • {rosters.length} Teams</p>
        <p className="mt-4 text-lg">Welcome to your league hub! Track standings, analyze stats, and never miss a beat.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="font-bold text-lg mb-2">Current Week</h3>
          <p className="text-3xl font-bold text-green-600">Week {currentWeek}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="font-bold text-lg mb-2">League Format</h3>
          <p className="text-xl font-semibold">Keeper League</p>
          <p className="text-sm text-gray-600 mt-1">Keep up to 2 players</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <h3 className="font-bold text-lg mb-2">Scoring</h3>
          <p className="text-xl font-semibold">{leagueData?.scoring_settings?.rec === 1 ? 'Full PPR' : leagueData?.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { name: 'Current Season', tab: 'current', icon: TrendingUp },
            { name: 'History', tab: 'history', icon: History },
            { name: 'Waivers/FA', tab: 'waivers', icon: Users },
            { name: 'Data & Projections', tab: 'data', icon: BarChart3 },
            { name: 'Draft & Keepers', tab: 'draft', icon: Calendar }
          ].map(link => (
            <button
              key={link.tab}
              onClick={() => setActiveTab(link.tab)}
              className="flex items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              <link.icon className="w-5 h-5 text-blue-600" />
              <span className="font-medium">{link.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrent = () => {
    const groupedMatchups = currentMatchups.reduce((acc, matchup) => {
      if (!acc[matchup.matchup_id]) acc[matchup.matchup_id] = [];
      acc[matchup.matchup_id].push(matchup);
      return acc;
    }, {});

    const groupedPrevious = previousMatchups.reduce((acc, matchup) => {
      if (!acc[matchup.matchup_id]) acc[matchup.matchup_id] = [];
      acc[matchup.matchup_id].push(matchup);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Current Season - Week {currentWeek}</h1>
        
        {/* Upcoming Week */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Upcoming Matchups - Week {currentWeek}
          </h2>
          <div className="space-y-4">
            {Object.values(groupedMatchups).map((matchup, idx) => {
              if (matchup.length !== 2) return null;
              const [team1, team2] = matchup;
              return (
                <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{getTeamName(team1.roster_id)}</p>
                      <p className="text-sm text-gray-600">Projected: {team1.points?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="text-2xl font-bold text-gray-400 px-4">VS</div>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-lg">{getTeamName(team2.roster_id)}</p>
                      <p className="text-sm text-gray-600">Projected: {team2.points?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Previous Week with AI Recap */}
        {currentWeek > 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Week {currentWeek - 1} Recap
            </h2>
            
            <AIWeeklyRecap 
              matchups={groupedPrevious} 
              getTeamName={getTeamName}
              week={currentWeek - 1}
            />

            <div className="mt-6 space-y-4">
              <h3 className="font-bold text-lg">Results</h3>
              {Object.values(groupedPrevious).map((matchup, idx) => {
                if (matchup.length !== 2) return null;
                const [team1, team2] = matchup;
                const team1Won = team1.points > team2.points;
                return (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className={`flex-1 ${team1Won ? 'bg-green-50' : 'bg-red-50'} p-3 rounded`}>
                        <p className="font-bold text-lg">{getTeamName(team1.roster_id)}</p>
                        <p className="text-2xl font-bold">{team1.points?.toFixed(2) || '0.00'}</p>
                        {team1Won && <p className="text-sm text-green-600 font-semibold">WINNER</p>}
                      </div>
                      <div className="px-4 text-gray-400">-</div>
                      <div className={`flex-1 ${!team1Won ? 'bg-green-50' : 'bg-red-50'} p-3 rounded text-right`}>
                        <p className="font-bold text-lg">{getTeamName(team2.roster_id)}</p>
                        <p className="text-2xl font-bold">{team2.points?.toFixed(2) || '0.00'}</p>
                        {!team1Won && <p className="text-sm text-green-600 font-semibold">WINNER</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Current Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-center p-2">W</th>
                  <th className="text-center p-2">L</th>
                  <th className="text-center p-2">PF</th>
                </tr>
              </thead>
              <tbody>
                {rosters
                  .sort((a, b) => {
                    if ((b.settings.wins || 0) !== (a.settings.wins || 0)) {
                      return (b.settings.wins || 0) - (a.settings.wins || 0);
                    }
                    return (b.settings.fpts || 0) - (a.settings.fpts || 0);
                  })
                  .map((roster, idx) => (
                    <tr key={roster.roster_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{idx + 1}</td>
                      <td className="p-2">{getTeamName(roster.roster_id)}</td>
                      <td className="text-center p-2">{roster.settings.wins || 0}</td>
                      <td className="text-center p-2">{roster.settings.losses || 0}</td>
                      <td className="text-center p-2">{(roster.settings.fpts || 0).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDraft = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Draft & Keeper Information</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Keeper Rules Overview</h2>
        <div className="prose max-w-none">
          <ul className="space-y-2">
            <li><strong>Number of Keepers:</strong> Up to 2 players per team</li>
            <li><strong>First Year Kept:</strong> Same round as drafted</li>
            <li><strong>Subsequent Years:</strong> 
              <ul className="ml-4 mt-1">
                <li>Rounds 6-15: Cost increases by 3 rounds each year (e.g., 10th → 7th → 4th → 2nd → 1st)</li>
                <li>Rounds 1-5: Cost increases by 2 rounds each year (e.g., 5th → 3rd → 1st)</li>
              </ul>
            </li>
            <li><strong>Maximum Cost:</strong> Once a player reaches 1st round cost, they can be kept for one more year at that price, then must be released</li>
            <li><strong>Undrafted/Free Agents:</strong> Initial cost is 15th round (highest round)</li>
            <li><strong>FA Escalation:</strong> 15th → 12th → 9th → 6th → 4th → 2nd → 1st (3-round penalty until 6th, then 2-round)</li>
            <li><strong>Tie-Breaker:</strong> If two players cost the same pick, the player with lower ADP (Average Draft Position) costs +1 additional round</li>
          </ul>
        </div>
      </div>

      <KeeperCalculator calculateKeeperCost={calculateKeeperCost} canKeepPlayer={canKeepPlayer} />
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <History className="w-8 h-8" />
        League History
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Past Champions</h2>
        <p className="text-gray-600">Historical data will be populated here from previous seasons...</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-4 p-3 bg-yellow-50 border-l-4 border-yellow-500">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-bold">2024 Champion</p>
              <p className="text-sm text-gray-600">To be determined...</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">All-Time Records</h2>
        <p className="text-gray-600">League records and achievements coming soon...</p>
      </div>
    </div>
  );

  const renderWaivers = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Users className="w-8 h-8" />
        Waivers & Free Agents
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Available Players</h2>
        <p className="text-gray-600">Top available free agents and waiver wire targets...</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Trending Adds/Drops</h2>
        <p className="text-gray-600">Most added and dropped players this week...</p>
      </div>
    </div>
  );

  const renderData = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <BarChart3 className="w-8 h-8" />
        Data & Projections
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">League Analytics</h2>
        <p className="text-gray-600">Advanced stats and analytics coming soon...</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">ROS Projections</h2>
        <p className="text-gray-600">Rest of season projections and rankings...</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl font-semibold">Loading league data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SpeedInsights />
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-blue-600" />
              <span className="font-bold text-xl">League Hub</span>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'home', label: 'Home', icon: Trophy },
                { id: 'current', label: 'Current', icon: TrendingUp },
                { id: 'history', label: 'History', icon: History },
                { id: 'waivers', label: 'Waivers', icon: Users },
                { id: 'data', label: 'Data', icon: BarChart3 },
                { id: 'draft', label: 'Draft', icon: Calendar }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'current' && renderCurrent()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'waivers' && renderWaivers()}
        {activeTab === 'data' && renderData()}
        {activeTab === 'draft' && renderDraft()}
      </div>
    </div>
  );
}

// AI Weekly Recap Component
function AIWeeklyRecap({ matchups, getTeamName, week }) {
  const [recap, setRecap] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Check if we have a cached recap for this week
  useEffect(() => {
    const cacheKey = `recap_week_${week}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { text, timestamp } = JSON.parse(cached);
        const cacheDate = new Date(timestamp);
        const now = new Date();
        
        // Check if cache is from this week (before next Tuesday)
        const nextTuesday = getNextTuesday(cacheDate);
        
        if (now < nextTuesday) {
          setRecap(text);
          setGenerated(true);
          return;
        }
      } catch (e) {
        // Invalid cache, ignore
      }
    }
    
    // Auto-generate on first visit if it's Tuesday or later
    const today = new Date();
    if (today.getDay() >= 2 && !generated) { // Tuesday = 2
      generateRecap();
    }
  }, [week]);

  const getNextTuesday = (fromDate) => {
    const date = new Date(fromDate);
    const day = date.getDay();
    const daysUntilTuesday = day <= 2 ? 2 - day : 9 - day;
    date.setDate(date.getDate() + daysUntilTuesday);
    date.setHours(12, 0, 0, 0); // Noon
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

      // Call our serverless function instead of Claude API directly
      const response = await fetch('/api/generate-recap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchupData,
          week
        })
      });

      const data = await response.json();
      const recapText = data.recap || 'Unable to generate recap.';
      setRecap(recapText);
      setGenerated(true);
      
      // Cache the recap
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
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
        <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">AI-Powered Weekly Recap</h3>
        <p className="text-gray-600 mb-4">Get a funny, engaging summary of last week's action!</p>
        <button
          onClick={generateRecap}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Week Recap'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h3 className="font-bold text-lg">AI Week {week} Recap</h3>
      </div>
      <div className="prose max-w-none text-gray-700 whitespace-pre-line">
        {recap}
      </div>
      <button
        onClick={generateRecap}
        disabled={loading}
        className="mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm"
      >
        {loading ? 'Regenerating...' : 'Regenerate Recap'}
      </button>
    </div>
  );
}

// Keeper Calculator Component
function KeeperCalculator({ calculateKeeperCost, canKeepPlayer }) {
  const [draftRound, setDraftRound] = useState(10);
  const [isUndrafted, setIsUndrafted] = useState(false);
  
  const years = [0, 1, 2, 3, 4, 5, 6];
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Keeper Cost Calculator</h2>
      
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
              className="border rounded px-3 py-2 w-32"
            />
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-lg mb-4 text-center">Keeper Cost Over Time</h3>
        <div className="grid grid-cols-7 gap-2">
          {years.map(year => {
            const cost = calculateKeeperCost(isUndrafted ? 0 : draftRound, year);
            const canKeep = canKeepPlayer(isUndrafted ? 0 : draftRound, year);
            
            return (
              <div key={year} className="text-center">
                <div className={`rounded-lg p-4 ${canKeep ? 'bg-white shadow-md' : 'bg-gray-200 opacity-50'}`}>
                  <p className="text-sm text-gray-600 mb-1">Year {year === 0 ? '1' : year + 1}</p>
                  <p className={`text-2xl font-bold ${canKeep ? 'text-blue-600' : 'text-gray-400'}`}>
                    {canKeep ? (cost === 1 ? '1st' : cost + 'th') : 'N/A'}
                  </p>
                  {!canKeep && year > 0 && (
                    <p className="text-xs text-red-600 mt-1">Can't keep</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-bold mb-2">How It Works:</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Drafted Players (Rounds 6-15):</strong> Start at their draft round, then cost decreases by 3 rounds each year until reaching rounds 1-5.</p>
          <p><strong>Drafted Players (Rounds 1-5):</strong> Cost decreases by 2 rounds each year until reaching 1st round.</p>
          <p><strong>Free Agents:</strong> Start at 15th round, decrease by 3 rounds until round 6, then by 2 rounds per year.</p>
          <p><strong>Final Year:</strong> Once a player costs a 1st round pick and you've kept them for a year at that price, they cannot be kept anymore.</p>
          <p><strong>Tie-Breaker:</strong> If two players would cost the same pick, the player with lower ADP costs an additional +1 round.</p>
          <p className="text-xs text-gray-500 italic mt-3">Example: A 10th round pick costs 10th → 7th → 4th → 2nd → 1st for their final keepable year.</p>
        </div>
      </div>
    </div>
  );
}
