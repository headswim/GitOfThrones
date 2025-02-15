export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface YearContributions {
  year: number;
  contributions: ContributionDay[];
}

export interface ContributionResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: Array<{
          contributionDays: Array<{
            contributionCount: number;
            date: string;
          }>;
        }>;
      };
    };
  };
}

export interface GitHubError extends Error {
  resource?: string;
  code?: string;
  documentation_url?: string;
}

export interface LeaderboardEntry {
  username: string;
  avatarUrl: string;
  totalContributions: number;
  contributions: YearContributions[];
}