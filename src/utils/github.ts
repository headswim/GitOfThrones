import { Octokit } from 'octokit';
import { ContributionResponse, YearContributions, GitHubError, LeaderboardEntry } from '../types';
import { supabase } from '../lib/supabase';

export async function checkExistingUser(username: string): Promise<{ contributions: YearContributions[] | null, canUpdate: boolean, timeUntilUpdate: number | null }> {
  try {
    // Check if user exists in our database
    const { data: userData, error: userError } = await supabase
      .from('github_users')
      .select('username, last_contribution_update')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      return { contributions: null, canUpdate: true, timeUntilUpdate: null };
    }

    // Calculate time since last update using UTC timestamps
    const lastUpdate = new Date(userData.last_contribution_update);
    const now = new Date();
    const timeDiffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    const canUpdate = timeDiffHours >= 24;
    const timeUntilUpdate = canUpdate ? 0 : 24 - timeDiffHours;

    // Fetch all their contribution data
    const { data: yearlyData, error: yearlyError } = await supabase
      .from('yearly_contributions')
      .select('year, contributions')
      .eq('username', username)
      .order('year', { ascending: false });

    if (yearlyError || !yearlyData) {
      return { contributions: null, canUpdate: true, timeUntilUpdate: null };
    }

    const contributions = yearlyData.map(year => ({
      year: year.year,
      contributions: year.contributions
    }));

    return { 
      contributions, 
      canUpdate,
      timeUntilUpdate: timeUntilUpdate > 0 ? timeUntilUpdate : null
    };
  } catch (error) {
    console.error('Error checking existing user:', error);
    return { contributions: null, canUpdate: true, timeUntilUpdate: null };
  }
}

async function getUserCreationYear(octokit: Octokit, username: string): Promise<number> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        createdAt
        avatarUrl
      }
    }
  `;

  try {
    const response = await octokit.graphql(query, { username });
    const { createdAt, avatarUrl } = (response as any).user;
    
    // Store or update user in Supabase with UTC timestamp
    await supabase
      .from('github_users')
      .upsert({
        username,
        avatar_url: avatarUrl,
        last_updated: new Date().toISOString(),
        last_contribution_update: new Date().toISOString()
      }, {
        onConflict: 'username'
      });

    return new Date(createdAt).getFullYear();
  } catch (error) {
    console.error('Error fetching user creation date:', error);
    return 2008; // Fallback to GitHub's founding year
  }
}

export async function fetchContributions(token: string, username: string, year: number): Promise<YearContributions> {
  const octokit = new Octokit({ auth: token });

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31, 23, 59, 59);

  try {
    console.log(`Fetching contributions for ${username} - ${year}`);
    
    const response = await octokit.graphql(query, {
      username,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    // Type assertion and validation
    const typedResponse = response as any;
    const calendar = typedResponse?.user?.contributionsCollection?.contributionCalendar;
    
    if (!calendar || !Array.isArray(calendar.weeks)) {
      console.error('Invalid response structure:', response);
      throw new Error('Invalid response from GitHub API');
    }

    const contributions = calendar.weeks
      .flatMap(week => week.contributionDays || [])
      .filter(day => day && typeof day.date === 'string' && typeof day.contributionCount === 'number')
      .map(day => ({
        date: day.date,
        contributionCount: day.contributionCount,
      }));

    if (contributions.length === 0) {
      console.log(`No contributions found for ${username} in ${year}`);
    } else {
      console.log(`Found ${contributions.length} days with contributions for ${year}`);
    }

    // Store contributions in Supabase
    await supabase
      .from('yearly_contributions')
      .upsert({
        username,
        year,
        contributions: contributions
      }, {
        onConflict: 'username,year'
      });

    return {
      year,
      contributions,
    };
  } catch (error) {
    const gitHubError = error as GitHubError;
    console.error('GitHub API Error:', {
      message: gitHubError.message,
      resource: gitHubError.resource,
      code: gitHubError.code,
      documentation_url: gitHubError.documentation_url
    });
    
    if (gitHubError.message?.includes('Bad credentials')) {
      throw new Error('Invalid GitHub token. Please check your token and try again.');
    }
    if (gitHubError.message?.includes('rate limit')) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (gitHubError.message?.includes('Could not resolve to a User')) {
      throw new Error(`User "${username}" not found on GitHub.`);
    }

    throw new Error(gitHubError.message || 'Failed to fetch GitHub contributions');
  }
}

export async function fetchAllYearContributions(token: string, username: string): Promise<YearContributions[]> {
  const octokit = new Octokit({ auth: token });
  const currentYear = new Date().getFullYear();
  const startYear = await getUserCreationYear(octokit, username);
  
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  );

  try {
    const contributions = await Promise.all(
      years.map(year => fetchContributions(token, username, year))
    );

    // Sort by year in descending order (newest first) and filter out years with no contributions
    const sortedContributions = contributions
      .filter(year => year.contributions.length > 0)
      .sort((a, b) => b.year - a.year);
    
    if (sortedContributions.length === 0) {
      throw new Error(`No contributions found for user "${username}"`);
    }

    // Calculate and update total contributions with UTC timestamp
    const totalContributions = sortedContributions.reduce((total, year) => {
      return total + year.contributions.reduce((yearTotal, day) => yearTotal + day.contributionCount, 0);
    }, 0);

    await supabase
      .from('github_users')
      .update({ 
        total_contributions: totalContributions,
        last_contribution_update: new Date().toISOString()
      })
      .eq('username', username);
    
    return sortedContributions;
  } catch (error) {
    console.error('Error in fetchAllYearContributions:', error);
    throw error;
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data: users, error } = await supabase
    .from('github_users')
    .select('username, avatar_url, total_contributions')
    .order('total_contributions', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const { data: yearlyData } = await supabase
        .from('yearly_contributions')
        .select('year, contributions')
        .eq('username', user.username)
        .order('year', { ascending: false });

      return {
        username: user.username,
        avatarUrl: user.avatar_url,
        totalContributions: user.total_contributions,
        contributions: yearlyData?.map(year => ({
          year: year.year,
          contributions: year.contributions
        })) || []
      };
    })
  );

  return leaderboard;
}

export function generateContributionsSVG(contributions: YearContributions[]): string {
  const CELL_SIZE = 10;
  const CELL_PADDING = 2;
  const YEAR_PADDING = 30;
  const YEAR_HEIGHT = 7 * (CELL_SIZE + CELL_PADDING);
  const WEEKS_IN_YEAR = 53;
  const WIDTH = WEEKS_IN_YEAR * (CELL_SIZE + CELL_PADDING);
  const HEIGHT = contributions.length * (YEAR_HEIGHT + YEAR_PADDING);
  const today = new Date();

  const getColor = (count: number, maxCount: number): string => {
    if (count === 0) return '#1e293b';
    const percentage = count / maxCount;
    if (percentage <= 0.2) return '#064e3b';
    if (percentage <= 0.4) return '#047857';
    if (percentage <= 0.7) return '#10b981';
    return '#34d399';
  };

  let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .year-label { font: bold 12px sans-serif; fill: #e2e8f0; }
      .contribution { rx: 2; ry: 2; }
    </style>
    <rect width="100%" height="100%" fill="#0f172a"/>`;

  contributions.forEach((yearData, yearIndex) => {
    const yOffset = yearIndex * (YEAR_HEIGHT + YEAR_PADDING);
    const maxCount = Math.max(...yearData.contributions.map(day => day.contributionCount));
    
    // Add year label
    svg += `<text x="0" y="${yOffset + 20}" class="year-label">${yearData.year}</text>`;

    // Create a map of dates to contribution counts
    const contributionMap = new Map(
      yearData.contributions.map(day => [day.date, day.contributionCount])
    );

    // Generate grid
    let currentDate = new Date(yearData.year, 0, 1);
    const endDate = yearData.year === today.getFullYear() 
      ? today 
      : new Date(yearData.year, 11, 31);
    let weekIndex = 0;

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = contributionMap.get(dateStr) || 0;

      const x = weekIndex * (CELL_SIZE + CELL_PADDING);
      const y = yOffset + 30 + (dayOfWeek * (CELL_SIZE + CELL_PADDING));

      svg += `<rect
        class="contribution"
        x="${x}"
        y="${y}"
        width="${CELL_SIZE}"
        height="${CELL_SIZE}"
        fill="${getColor(count, maxCount)}"
      />`;

      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() === 0) {
        weekIndex++;
      }
    }
  });

  svg += '</svg>';
  return svg;
}