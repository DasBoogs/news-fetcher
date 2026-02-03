export interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: Date | null;
  engagement: EngagementMetrics;
}

export interface EngagementMetrics {
  upvotes?: number;
  comments?: number;
  shares?: number;
  reactions?: number;
  views?: number;
}

export interface ScoredArticle extends Article {
  engagementScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchedKeywords: string[];
  relevanceScore: number;
}

export interface ScoreBreakdown {
  upvotesContribution: number;
  commentsContribution: number;
  sharesContribution: number;
  reactionsContribution: number;
  viewsContribution: number;
  totalScore: number;
  explanation: string;
}

export interface Crawler {
  name: string;
  fetchArticles(subjectId: string): Promise<Article[]>;
}
