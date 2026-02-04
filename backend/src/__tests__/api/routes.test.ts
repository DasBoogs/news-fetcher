import request from 'supertest';
import express from 'express';
import cors from 'cors';

jest.mock('../../crawlers', () => ({
  fetchAllArticles: jest.fn(),
}));

jest.mock('../../services/engagementScorer', () => ({
  scoreArticles: jest.fn(),
  getTopArticles: jest.fn(),
  getScoringMethodExplanation: jest.fn().mockReturnValue('Test scoring explanation'),
  DEFAULT_WEIGHTS: {
    upvotes: 1.0,
    comments: 2.0,
    shares: 1.5,
    reactions: 0.8,
    views: 0.01,
  },
}));

jest.mock('../../services/contentFetcher', () => ({
  enrichArticlesWithContent: jest.fn(),
}));

import { fetchAllArticles } from '../../crawlers';
import { scoreArticles, getTopArticles, getScoringMethodExplanation, DEFAULT_WEIGHTS } from '../../services/engagementScorer';
import { enrichArticlesWithContent } from '../../services/contentFetcher';
import { getAllSubjects, getSubject } from '../../subjects';

const mockedFetchAllArticles = fetchAllArticles as jest.MockedFunction<typeof fetchAllArticles>;
const mockedScoreArticles = scoreArticles as jest.MockedFunction<typeof scoreArticles>;
const mockedGetTopArticles = getTopArticles as jest.MockedFunction<typeof getTopArticles>;
const mockedEnrichArticlesWithContent = enrichArticlesWithContent as jest.MockedFunction<typeof enrichArticlesWithContent>;

const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/subjects', (req, res) => {
    const subjects = getAllSubjects();
    res.json({ subjects });
  });

  app.get('/api/subjects/:id', (req, res) => {
    const subject = getSubject(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ subject });
  });

  app.get('/api/scoring-method', (req, res) => {
    res.json({
      explanation: getScoringMethodExplanation(),
      weights: DEFAULT_WEIGHTS,
    });
  });

  app.get('/api/articles/:subjectId', async (req, res) => {
    const { subjectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const subject = getSubject(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    try {
      const articles = await fetchAllArticles(subjectId);
      const scoredArticles = scoreArticles(articles, subjectId);
      const topArticles = getTopArticles(scoredArticles, limit);
      const enrichedArticles = await enrichArticlesWithContent(topArticles);

      res.json({
        subject: subject.name,
        totalFound: articles.length,
        returned: enrichedArticles.length,
        scoringMethod: getScoringMethodExplanation(),
        weights: DEFAULT_WEIGHTS,
        articles: enrichedArticles.map(article => ({
          id: article.id,
          title: article.title,
          url: article.url,
          content: article.content,
          source: article.source,
          publishedAt: article.publishedAt,
          engagement: article.engagement,
          engagementScore: article.engagementScore,
          scoreBreakdown: article.scoreBreakdown,
          matchedKeywords: article.matchedKeywords,
          relevanceScore: article.relevanceScore,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
};

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/subjects', () => {
    it('should return 200 with subjects array', async () => {
      const response = await request(app).get('/api/subjects');

      expect(response.status).toBe(200);
      expect(response.body.subjects).toBeDefined();
      expect(Array.isArray(response.body.subjects)).toBe(true);
    });

    it('should include agentic-ai subject', async () => {
      const response = await request(app).get('/api/subjects');

      const agenticAI = response.body.subjects.find(
        (s: { id: string }) => s.id === 'agentic-ai'
      );
      expect(agenticAI).toBeDefined();
      expect(agenticAI.name).toBe('Agentic AI');
    });

    it('should return subjects with required properties', async () => {
      const response = await request(app).get('/api/subjects');

      for (const subject of response.body.subjects) {
        expect(subject.id).toBeDefined();
        expect(subject.name).toBeDefined();
        expect(subject.description).toBeDefined();
        expect(subject.keywords).toBeDefined();
        expect(subject.relatedTerms).toBeDefined();
      }
    });
  });

  describe('GET /api/subjects/:id', () => {
    it('should return 200 with subject for valid id', async () => {
      const response = await request(app).get('/api/subjects/agentic-ai');

      expect(response.status).toBe(200);
      expect(response.body.subject).toBeDefined();
      expect(response.body.subject.id).toBe('agentic-ai');
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await request(app).get('/api/subjects/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Subject not found');
    });

    it('should return subject with all properties', async () => {
      const response = await request(app).get('/api/subjects/agentic-ai');

      const subject = response.body.subject;
      expect(subject.id).toBe('agentic-ai');
      expect(subject.name).toBe('Agentic AI');
      expect(subject.description).toBeDefined();
      expect(Array.isArray(subject.keywords)).toBe(true);
      expect(Array.isArray(subject.relatedTerms)).toBe(true);
    });
  });

  describe('GET /api/scoring-method', () => {
    it('should return 200 with explanation and weights', async () => {
      const response = await request(app).get('/api/scoring-method');

      expect(response.status).toBe(200);
      expect(response.body.explanation).toBeDefined();
      expect(response.body.weights).toBeDefined();
    });

    it('should return correct weights', async () => {
      const response = await request(app).get('/api/scoring-method');

      expect(response.body.weights.upvotes).toBe(1.0);
      expect(response.body.weights.comments).toBe(2.0);
      expect(response.body.weights.shares).toBe(1.5);
      expect(response.body.weights.reactions).toBe(0.8);
      expect(response.body.weights.views).toBe(0.01);
    });
  });

  describe('GET /api/articles/:subjectId', () => {
    const mockArticle = {
      id: 'test-1',
      title: 'Test Article',
      url: 'https://example.com',
      content: 'Test content',
      source: 'Test Source',
      publishedAt: new Date(),
      engagement: { upvotes: 100 },
    };

    const mockScoredArticle = {
      ...mockArticle,
      engagementScore: 100,
      scoreBreakdown: {
        upvotesContribution: 100,
        commentsContribution: 0,
        sharesContribution: 0,
        reactionsContribution: 0,
        viewsContribution: 0,
        totalScore: 100,
        explanation: 'Test explanation',
      },
      matchedKeywords: ['test'],
      relevanceScore: 10,
    };

    beforeEach(() => {
      mockedFetchAllArticles.mockResolvedValue([mockArticle]);
      mockedScoreArticles.mockReturnValue([mockScoredArticle]);
      mockedGetTopArticles.mockReturnValue([mockScoredArticle]);
      mockedEnrichArticlesWithContent.mockResolvedValue([mockScoredArticle]);
    });

    it('should return 200 with articles for valid subject', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await request(app).get('/api/articles/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Subject not found');
    });

    it('should include subject name in response', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      expect(response.body.subject).toBe('Agentic AI');
    });

    it('should include totalFound and returned counts', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      expect(response.body.totalFound).toBeDefined();
      expect(response.body.returned).toBeDefined();
    });

    it('should include scoring method and weights', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      expect(response.body.scoringMethod).toBeDefined();
      expect(response.body.weights).toBeDefined();
    });

    it('should respect limit query parameter', async () => {
      const response = await request(app).get('/api/articles/agentic-ai?limit=5');

      expect(mockedGetTopArticles).toHaveBeenCalledWith(expect.any(Array), 5);
    });

    it('should use default limit of 10', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      expect(mockedGetTopArticles).toHaveBeenCalledWith(expect.any(Array), 10);
    });

    it('should return articles with all required properties', async () => {
      const response = await request(app).get('/api/articles/agentic-ai');

      const article = response.body.articles[0];
      expect(article.id).toBeDefined();
      expect(article.title).toBeDefined();
      expect(article.url).toBeDefined();
      expect(article.content).toBeDefined();
      expect(article.source).toBeDefined();
      expect(article.engagement).toBeDefined();
      expect(article.engagementScore).toBeDefined();
      expect(article.scoreBreakdown).toBeDefined();
      expect(article.matchedKeywords).toBeDefined();
      expect(article.relevanceScore).toBeDefined();
    });

    it('should return 500 on fetch error', async () => {
      mockedFetchAllArticles.mockRejectedValue(new Error('Fetch error'));

      const response = await request(app).get('/api/articles/agentic-ai');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch articles');
    });

    it('should call fetchAllArticles with correct subjectId', async () => {
      await request(app).get('/api/articles/agentic-ai');

      expect(mockedFetchAllArticles).toHaveBeenCalledWith('agentic-ai');
    });

    it('should call scoreArticles with articles and subjectId', async () => {
      await request(app).get('/api/articles/agentic-ai');

      expect(mockedScoreArticles).toHaveBeenCalledWith([mockArticle], 'agentic-ai');
    });

    it('should call enrichArticlesWithContent with top articles', async () => {
      await request(app).get('/api/articles/agentic-ai');

      expect(mockedEnrichArticlesWithContent).toHaveBeenCalledWith([mockScoredArticle]);
    });
  });
});
