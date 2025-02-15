import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, YearContributions } from '../types';
import { Github } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchLeaderboard } from '../utils/github';
import { supabase } from '../lib/supabase';

const CompactHeatmap: React.FC<{ contributions: YearContributions[] }> = ({ contributions }) => {
  // Only show 2025 contributions
  const year2025 = contributions.find(year => year.year === 2025);
  if (!year2025) return null;

  // Create a grid of 7x7 squares (49 days)
  const days = year2025.contributions.slice(0, 49);
  
  // Find the maximum contribution count for this user's data
  const maxCount = Math.max(...days.map(day => day.contributionCount));

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-800';
    
    // Calculate percentage of max
    const percentage = count / maxCount;
    
    if (percentage <= 0.2) return 'bg-green-900';
    if (percentage <= 0.4) return 'bg-green-700';
    if (percentage <= 0.7) return 'bg-green-500';
    return 'bg-green-300';
  };

  const weeks = [];
  for (let i = 0; i < 7; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  return (
    <div className="flex gap-[1px]">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-rows-7 gap-[1px]">
          {week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 rounded-[1px] ${getColor(day.contributionCount)} relative group cursor-default`}
            >
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                {format(parseISO(day.date), 'MMM d, yyyy')}: {day.contributionCount} contributions
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchLeaderboard().then(data => {
      setEntries(data);
      setLoading(false);
    });

    // Set up real-time subscription
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'github_users'
        },
        () => {
          // Refetch the leaderboard when any user data changes
          fetchLeaderboard().then(setEntries);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-12 bg-gray-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Github className="w-6 h-6" />
          Loading The Kings Beyond the Firewall...
        </h2>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-12 bg-gray-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-xl font-bold text-[#c0a062] mb-4 flex items-center gap-2">
          <Github className="w-6 h-6" />
          The Kings Beyond the Firewall
        </h2>
        <div className="prose prose-invert max-w-none mb-6">
          <p className="text-gray-300 leading-relaxed">
            In the realm of Git, where branches fork and merge, a greater game is played. Here, developers forge their legacy not with steel and fire, but with commits and pull requests. Each green square tells a tale of contribution, each streak a battle won in the endless war of code.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Welcome to Git of Thrones, where we honor those who build the digital kingdoms. Your commit history stands as testament to your reign - will you claim the Iron Throne of Open Source?
          </p>
          <p className="text-[#c0a062] font-medium italic">
            When you play the Git of Thrones, you merge or you conflict.
          </p>
        </div>
        <p className="text-gray-400">No contributors yet. Be the first to generate your contribution graph!</p>
      </div>
    );
  }

  return (
    <div className="mt-12 bg-gray-800 rounded-lg p-4 sm:p-6">
      <h2 className="text-xl font-bold text-[#c0a062] mb-4 flex items-center gap-2">
        <Github className="w-6 h-6" />
        The Kings Beyond the Firewall
      </h2>
      <div className="prose prose-invert max-w-none mb-8">
        <p className="text-gray-300 leading-relaxed">
          In the realm of Git, where branches fork and merge, a greater game is played. Here, developers forge their legacy not with steel and fire, but with commits and pull requests. Each green square tells a tale of contribution, each streak a battle won in the endless war of code.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Welcome to Git of Thrones, where we honor those who build the digital kingdoms. Your commit history stands as testament to your reign - will you claim the Iron Throne of Open Source?
        </p>
        <p className="text-[#c0a062] font-medium italic">
          When you play the Git of Thrones, you merge or you conflict.
        </p>
      </div>
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div
            key={entry.username}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-shrink-0 w-6 sm:w-8 text-base sm:text-lg font-bold text-gray-400">
                #{index + 1}
              </div>
              <img
                src={entry.avatarUrl}
                alt={entry.username}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
              />
              <div className="flex-grow min-w-0">
                <h3 className="text-white font-medium text-sm sm:text-base truncate">
                  {entry.username}
                </h3>
                <div className="mt-1 sm:mt-2">
                  <CompactHeatmap contributions={entry.contributions} />
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 text-right ml-auto mt-2 sm:mt-0">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {entry.totalContributions.toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">contributions</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;