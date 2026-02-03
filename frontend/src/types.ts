export interface EngagementMetrics {
  upvotes?: number;
  comments?: number;
  shares?: number;
  reactions?: number;
  views?: number;
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

export interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string | null;
  engagement: EngagementMetrics;
  engagementScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchedKeywords: string[];
  relevanceScore: number;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  relatedTerms: string[];
}

export interface ScoringWeights {
  upvotes: number;
  comments: number;
  shares: number;
  reactions: number;
  views: number;
}

export interface ArticlesResponse {
  subject: string;
  totalFound: number;
  returned: number;
  scoringMethod: string;
  weights: ScoringWeights;
  articles: Article[];
}

export interface SubjectsResponse {
  subjects: Subject[];
}
