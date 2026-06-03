export interface UsageAnalytics {
  activeDays?: number;
  totalSessions?: number;
  qualifyingSessions?: number;
  totalMessages?: number;
  userMessages?: number;
  assistantMessages?: number;
  toolCalls?: number;
  commands?: number;
  linesAdded?: number;
  linesRemoved?: number;
  filesModified?: number;
  commitsCreated?: number;
  pullRequestsCreated?: number;
  toolActionStats?: Record<
    string,
    {
      total: number;
      accepted?: number;
      rejected?: number;
      errorCount?: number;
      acceptanceRate?: number;
    }
  >;
  commandStats?: {
    totalCommands: number;
    failedCommands: number;
    failureCategories: Record<string, number>;
  };
  modelBreakdown?: Array<{
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    estimatedCost?: {
      amount: number;
      currency: string;
    };
  }>;
  projectBreakdown?: Array<{
    projectName: string;
    sessions: number;
    messages: number;
    toolCalls: number;
    linesAdded?: number;
    linesRemoved?: number;
    filesModified?: number;
    commitsCreated?: number;
    toolErrors?: number;
  }>;
  dailyTrend?: Array<{
    date: string;
    sessions: number;
    messages: number;
    toolCalls: number;
    linesAdded?: number;
    linesRemoved?: number;
    estimatedCostAmount?: number;
  }>;
}
