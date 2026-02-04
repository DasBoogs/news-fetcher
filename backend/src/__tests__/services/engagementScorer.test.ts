import {
  calculateEngagementScore,
  scoreArticles,
  getTopArticles,
  getScoringMethodExplanation,
  DEFAULT_WEIGHTS,
} from '../../services/engagementScorer';
import { Article, ScoredArticle } from '../../crawlers/types';

describe('engagementScorer', () => {
  describe('calculateEngagementScore', () => {
    it('should calculate score with all engagement metrics present', () => {
      const article: Article = {
        id: 'test-1',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 100,
          comments: 50,
          shares: 20,
          reactions: 30,
          views: 1000,
        },
      };

      const result = calculateEngagementScore(article);

      expect(result.upvotesContribution).toBe(100 * DEFAULT_WEIGHTS.upvotes);
      expect(result.commentsContribution).toBe(50 * DEFAULT_WEIGHTS.comments);
      expect(result.sharesContribution).toBe(20 * DEFAULT_WEIGHTS.shares);
      expect(result.reactionsContribution).toBe(30 * DEFAULT_WEIGHTS.reactions);
      expect(result.viewsContribution).toBe(1000 * DEFAULT_WEIGHTS.views);
      expect(result.totalScore).toBe(
        100 * 1.0 + 50 * 2.0 + 20 * 1.5 + 30 * 0.8 + 1000 * 0.01
      );
      expect(result.explanation).toContain('Score calculation:');
    });

    it('should handle missing engagement metrics', () => {
      const article: Article = {
        id: 'test-2',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 50,
          comments: 10,
        },
      };

      const result = calculateEngagementScore(article);

      expect(result.upvotesContribution).toBe(50);
      expect(result.commentsContribution).toBe(20);
      expect(result.sharesContribution).toBe(0);
      expect(result.reactionsContribution).toBe(0);
      expect(result.viewsContribution).toBe(0);
      expect(result.totalScore).toBe(70);
    });

    it('should handle all zero metrics', () => {
      const article: Article = {
        id: 'test-3',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 0,
          comments: 0,
          shares: 0,
          reactions: 0,
          views: 0,
        },
      };

      const result = calculateEngagementScore(article);

      expect(result.totalScore).toBe(0);
      expect(result.explanation).toBe('No engagement metrics available');
    });

    it('should handle empty engagement object', () => {
      const article: Article = {
        id: 'test-4',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {},
      };

      const result = calculateEngagementScore(article);

      expect(result.totalScore).toBe(0);
      expect(result.explanation).toBe('No engagement metrics available');
    });

    it('should handle large numbers correctly', () => {
      const article: Article = {
        id: 'test-5',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 100000,
          comments: 50000,
          views: 10000000,
        },
      };

      const result = calculateEngagementScore(article);

      expect(result.upvotesContribution).toBe(100000);
      expect(result.commentsContribution).toBe(100000);
      expect(result.viewsContribution).toBe(100000);
      expect(result.totalScore).toBe(300000);
    });

    it('should use custom weights when provided', () => {
      const article: Article = {
        id: 'test-6',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 100,
          comments: 50,
        },
      };

      const customWeights = {
        upvotes: 2.0,
        comments: 3.0,
        shares: 1.0,
        reactions: 1.0,
        views: 0.1,
      };

      const result = calculateEngagementScore(article, customWeights);

      expect(result.upvotesContribution).toBe(200);
      expect(result.commentsContribution).toBe(150);
      expect(result.totalScore).toBe(350);
    });

    it('should generate correct explanation string', () => {
      const article: Article = {
        id: 'test-7',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: new Date(),
        engagement: {
          upvotes: 10,
          comments: 5,
        },
      };

      const result = calculateEngagementScore(article);

      expect(result.explanation).toContain('10 upvotes x 1 = 10.0');
      expect(result.explanation).toContain('5 comments x 2 = 10.0');
      expect(result.explanation).toContain('= 20.0');
    });
  });

  describe('scoreArticles', () => {
    const createArticle = (id: string, title: string, upvotes: number): Article => ({
      id,
      title,
      url: 'https://example.com',
      content: 'Test content about agentic ai',
      source: 'Test Source',
      publishedAt: new Date(),
      engagement: { upvotes },
    });

    it('should score multiple articles correctly', () => {
      const articles = [
        createArticle('1', 'Article about agentic ai', 100),
        createArticle('2', 'Another ai agents article', 50),
      ];

      const result = scoreArticles(articles, 'agentic-ai');

      expect(result).toHaveLength(2);
      expect(result[0].engagementScore).toBe(100);
      expect(result[1].engagementScore).toBe(50);
    });

    it('should handle empty array', () => {
      const result = scoreArticles([], 'agentic-ai');
      expect(result).toHaveLength(0);
    });

    it('should preserve article data', () => {
      const article = createArticle('test-id', 'Test Title', 100);
      const result = scoreArticles([article], 'agentic-ai');

      expect(result[0].id).toBe('test-id');
      expect(result[0].title).toBe('Test Title');
      expect(result[0].url).toBe('https://example.com');
      expect(result[0].source).toBe('Test Source');
    });

    it('should include matched keywords and relevance score', () => {
      const article = createArticle('1', 'Article about agentic ai agents', 100);
      const result = scoreArticles([article], 'agentic-ai');

      expect(result[0].matchedKeywords).toBeDefined();
      expect(result[0].relevanceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTopArticles', () => {
    const createScoredArticle = (id: string, score: number): ScoredArticle => ({
      id,
      title: 'Test',
      url: 'https://example.com',
      content: 'Test content',
      source: 'Test',
      publishedAt: new Date(),
      engagement: {},
      engagementScore: score,
      scoreBreakdown: {
        upvotesContribution: 0,
        commentsContribution: 0,
        sharesContribution: 0,
        reactionsContribution: 0,
        viewsContribution: 0,
        totalScore: score,
        explanation: '',
      },
      matchedKeywords: [],
      relevanceScore: 0,
    });

    it('should return top articles sorted by engagement score', () => {
      const articles = [
        createScoredArticle('1', 50),
        createScoredArticle('2', 100),
        createScoredArticle('3', 75),
      ];

      const result = getTopArticles(articles, 3);

      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });

    it('should respect limit parameter', () => {
      const articles = [
        createScoredArticle('1', 50),
        createScoredArticle('2', 100),
        createScoredArticle('3', 75),
        createScoredArticle('4', 25),
      ];

      const result = getTopArticles(articles, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
    });

    it('should handle fewer articles than limit', () => {
      const articles = [
        createScoredArticle('1', 50),
        createScoredArticle('2', 100),
      ];

      const result = getTopArticles(articles, 10);

      expect(result).toHaveLength(2);
    });

    it('should use default limit of 10', () => {
      const articles = Array.from({ length: 15 }, (_, i) =>
        createScoredArticle(`${i}`, i * 10)
      );

      const result = getTopArticles(articles);

      expect(result).toHaveLength(10);
    });

    it('should handle empty array', () => {
      const result = getTopArticles([], 5);
      expect(result).toHaveLength(0);
    });
  });

  describe('getScoringMethodExplanation', () => {
    it('should return a non-empty string', () => {
      const result = getScoringMethodExplanation();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should contain weight information', () => {
      const result = getScoringMethodExplanation();
      expect(result).toContain('Upvotes');
      expect(result).toContain('Comments');
      expect(result).toContain('Shares');
      expect(result).toContain('Reactions');
      expect(result).toContain('Views');
    });

    it('should contain the formula', () => {
      const result = getScoringMethodExplanation();
      expect(result).toContain('Formula');
      expect(result).toContain('Score =');
    });

    it('should mention data sources', () => {
      const result = getScoringMethodExplanation();
      expect(result).toContain('Hacker News');
      expect(result).toContain('Reddit');
      expect(result).toContain('Dev.to');
    });
  });

  describe('DEFAULT_WEIGHTS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_WEIGHTS.upvotes).toBe(1.0);
      expect(DEFAULT_WEIGHTS.comments).toBe(2.0);
      expect(DEFAULT_WEIGHTS.shares).toBe(1.5);
      expect(DEFAULT_WEIGHTS.reactions).toBe(0.8);
      expect(DEFAULT_WEIGHTS.views).toBe(0.01);
    });
  });
});
