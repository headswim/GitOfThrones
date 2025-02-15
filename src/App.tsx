import React, { useState } from 'react';
import { Github, Loader2, Download, HelpCircle } from 'lucide-react';
import { fetchAllYearContributions, generateContributionsSVG, checkExistingUser } from './utils/github';
import HeatmapYear from './components/HeatmapYear';
import Leaderboard from './components/Leaderboard';
import { YearContributions } from './types';

function App() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState<YearContributions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleGenerate = async () => {
    if (!token || !username) {
      setError('Please provide both token and username');
      return;
    }

    if (!token.startsWith('ghp_')) {
      setError('Please provide a valid GitHub personal access token (starts with ghp_)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { contributions: existingData, canUpdate, timeUntilUpdate } = await checkExistingUser(username);
      
      if (existingData) {
        setContributions(existingData);
        
        if (!canUpdate) {
          const hours = Math.ceil(timeUntilUpdate!);
          const minutes = Math.ceil((timeUntilUpdate! % 1) * 60);
          
          let waitMessage = 'You must wait ';
          if (hours > 0) waitMessage += `${hours} hour${hours === 1 ? '' : 's'}`;
          if (minutes > 0 && hours > 0) waitMessage += ' and ';
          if (minutes > 0) waitMessage += `${minutes} minute${minutes === 1 ? '' : 's'}`;
          waitMessage += ' before refreshing your stats.';
          
          setError(`Your contributions are already in our system! ${waitMessage}`);
          setLoading(false);
          return;
        }
      }

      const data = await fetchAllYearContributions(token, username);
      setContributions(data);
      
      if (existingData) {
        setError('Your contributions have been successfully updated!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (contributions.length === 0) return;

    const svg = generateContributionsSVG(contributions);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-github-contributions.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#1a1d24] text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.svg"
              alt="Git of Thrones"
              className="h-12"
            />
            <h1 className="text-2xl font-bold text-[#c0a062]">Git of Thrones</h1>
          </div>
          <a
            href="https://github.com/headswim/GitOfThrones"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#2a2e37] hover:bg-[#3a3e47] rounded-lg transition-colors text-[#c0a062] hover:text-[#d4b475]"
          >
            <Github className="w-5 h-5" />
            <span className="hidden sm:inline">View on GitHub</span>
          </a>
        </div>

        <div className="bg-[#2a2e37] p-6 rounded-lg mb-8 border border-[#3a3e47]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-1 text-[#c0a062]">
                GitHub Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d24] rounded-md focus:ring-2 focus:ring-[#c0a062] focus:outline-none border border-[#3a3e47]"
                placeholder="ghp_your_token_here"
              />
              <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                <span>Must be a classic token with 'repo' and 'user' scopes</span>
                <div className="relative inline-block">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="p-1 hover:bg-[#3a3e47] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#c0a062]"
                    aria-label="Token instructions"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  {showInstructions && (
                    <div className="absolute left-0 top-6 w-72 p-3 bg-[#2a2e37] rounded-lg shadow-xl text-sm text-gray-200 z-10 border border-[#3a3e47]">
                      <div className="absolute -top-2 left-1 w-3 h-3 bg-[#2a2e37] transform rotate-45 border-l border-t border-[#3a3e47]"></div>
                      <ol className="space-y-1">
                        <li>1. <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-[#c0a062] hover:text-[#d4b475]">Go to GitHub token settings</a></li>
                        <li>2. Click "Generate New token"</li>
                        <li>3. Select "Generate new token (classic)"</li>
                        <li>4. Give it a name and select 'repo' and 'user' permissions</li>
                        <li>5. Click "Generate token"</li>
                        <li>6. Copy and paste the token here with your username</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1 text-[#c0a062]">
                GitHub Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d24] rounded-md focus:ring-2 focus:ring-[#c0a062] focus:outline-none border border-[#3a3e47]"
                placeholder="username"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-[#c0a062] hover:bg-[#d4b475] text-[#1a1d24] font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Heatmap'
            )}
          </button>

          {error && (
            <div className={`mt-4 text-sm ${error.includes('already in our system') ? 'text-green-400' : 'text-red-400'}`}>
              {error}
            </div>
          )}
        </div>

        {contributions.length > 0 && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-[#c0a062] hover:bg-[#d4b475] text-[#1a1d24] font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download as SVG
              </button>
            </div>
            <div className="space-y-8">
              {contributions.map((yearData) => (
                <HeatmapYear
                  key={yearData.year}
                  year={yearData.year}
                  contributions={yearData.contributions}
                />
              ))}
            </div>
          </>
        )}

        <Leaderboard />
      </div>
    </div>
  );
}

export default App;