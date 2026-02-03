import { Article, ScoredArticle, ScoreBreakdown } from '../crawlers/types';
import { matchContent } from '../subjects';

export interface ScoringWeights {
  upvotes: number;
  comments: number;
  shares: number;
  reactions: number;
  views: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  upvotes: 1.0,
  comments: 2.0,
  shares: 1.5,
  reactions: 0.8,
  views: 0.01,
};

export function calculateEngagementScore(
  article: Article,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoreBreakdown {
  const { engagement } = article;

  const upvotesContribution = (engagement.upvotes || 0) * weights.upvotes;
  const commentsContribution = (engagement.comments || 0) * weights.comments;
  const sharesContribution = (engagement.shares || 0) * weights.shares;
  const reactionsContribution = (engagement.reactions || 0) * weights.reactions;
  const viewsContribution = (engagement.views || 0) * weights.views;

  const totalScore =
    upvotesContribution +
    commentsContribution +
    sharesContribution +
    reactionsContribution +
    viewsContribution;

  const explanationParts: string[] = [];

  if (engagement.upvotes) {
    explanationParts.push(`${engagement.upvotes} upvotes x ${weights.upvotes} = ${upvotesContribution.toFixed(1)}`);
  }
  if (engagement.comments) {
    explanationParts.push(`${engagement.comments} comments x ${weights.comments} = ${commentsContribution.toFixed(1)}`);
  }
  if (engagement.shares) {
    explanationParts.push(`${engagement.shares} shares x ${weights.shares} = ${sharesContribution.toFixed(1)}`);
  }
  if (engagement.reactions) {
    explanationParts.push(`${engagement.reactions} reactions x ${weights.reactions} = ${reactionsContribution.toFixed(1)}`);
  }
  if (engagement.views) {
    explanationParts.push(`${engagement.views} views x ${weights.views} = ${viewsContribution.toFixed(1)}`);
  }

  const explanation = explanationParts.length > 0
    ? `Score calculation: ${explanationParts.join(' + ')} = ${totalScore.toFixed(1)}`
    : 'No engagement metrics available';

  return {
    upvotesContribution,
    commentsContribution,
    sharesContribution,
    reactionsContribution,
    viewsContribution,
    totalScore,
    explanation,
  };
}

export function scoreArticles(
  articles: Article[],
  subjectId: string,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredArticle[] {
  const scoredArticles: ScoredArticle[] = [];

  for (const article of articles) {
    const scoreBreakdown = calculateEngagementScore(article, weights);
    const match = matchContent(`${article.title} ${article.content}`, subjectId);

    scoredArticles.push({
      ...article,
      engagementScore: scoreBreakdown.totalScore,
      scoreBreakdown,
      matchedKeywords: match?.matchedKeywords || [],
      relevanceScore: match?.relevanceScore || 0,
    });
  }

  return scoredArticles;
}

export function getTopArticles(
  scoredArticles: ScoredArticle[],
  limit: number = 10
): ScoredArticle[] {
  return scoredArticles
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);
}

export function getScoringMethodExplanation(): string {
  return `
## Engagement Score Calculation

The engagement score is calculated using a weighted sum of various engagement metrics:

### Weights Used:
- **Upvotes**: ${DEFAULT_WEIGHTS.upvotes}x - Direct measure of user approval
- **Comments**: ${DEFAULT_WEIGHTS.comments}x - Higher weight as comments indicate deeper engagement
- **Shares**: ${DEFAULT_WEIGHTS.shares}x - Indicates content worth spreading
- **Reactions**: ${DEFAULT_WEIGHTS.reactions}x - Quick engagement indicator
- **Views**: ${DEFAULT_WEIGHTS.views}x - Lower weight as views don't indicate quality

### Formula:
\`Score = (upvotes × ${DEFAULT_WEIGHTS.upvotes}) + (comments × ${DEFAULT_WEIGHTS.comments}) + (shares × ${DEFAULT_WEIGHTS.shares}) + (reactions × ${DEFAULT_WEIGHTS.reactions}) + (views × ${DEFAULT_WEIGHTS.views})\`

### Data Sources:
- **Hacker News**: Provides upvotes (points) and comment counts
- **Reddit**: Provides upvotes (score) and comment counts
- **Dev.to**: Provides reactions, comments, and sometimes view counts

### Why These Weights?
- Comments are weighted highest (2.0x) because they require the most effort and indicate genuine interest
- Shares are weighted at 1.5x as they show users found content valuable enough to spread
- Upvotes are weighted at 1.0x as the baseline engagement metric
- Reactions are weighted at 0.8x as they're easier than upvotes on some platforms
- Views are weighted lowest (0.01x) as they don't indicate quality or engagement depth
`.trim();
}

export { DEFAULT_WEIGHTS };
