import { DevToCrawler } from '../../crawlers/devto';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DevToCrawler', () => {
  let crawler: DevToCrawler;

  beforeEach(() => {
    crawler = new DevToCrawler();
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(crawler.name).toBe('Dev.to');
  });

  describe('fetchArticles', () => {
    const createDevToArticle = (overrides: Partial<{
      id: number;
      title: string;
      url: string;
      description: string;
      body_markdown: string;
      public_reactions_count: number;
      comments_count: number;
      page_views_count: number;
      published_at: string;
      tag_list: string[];
    }> = {}) => ({
      id: 1,
      title: 'Default Title',
      url: 'https://dev.to/article',
      description: 'Default description',
      public_reactions_count: 100,
      comments_count: 50,
      published_at: '2024-01-15T10:00:00Z',
      tag_list: ['ai'],
      ...overrides,
    });

    it('should fetch and transform articles correctly', async () => {
      const mockArticle = createDevToArticle({
        id: 12345,
        title: 'Building AI Agents with TypeScript',
        url: 'https://dev.to/user/ai-agents-article',
        description: 'A guide to building agentic ai systems',
        public_reactions_count: 250,
        comments_count: 45,
        page_views_count: 5000,
        published_at: '2024-01-15T10:00:00Z',
      });

      mockedAxios.get.mockResolvedValue({ data: [mockArticle] });

      const articles = await crawler.fetchArticles('agentic-ai');

      const aiArticle = articles.find(a => a.title.includes('AI Agents'));
      expect(aiArticle).toBeDefined();
      expect(aiArticle?.id).toBe('devto-12345');
      expect(aiArticle?.source).toBe('Dev.to');
      expect(aiArticle?.engagement.reactions).toBe(250);
      expect(aiArticle?.engagement.comments).toBe(45);
      expect(aiArticle?.engagement.views).toBe(5000);
    });

    it('should search across multiple tags', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await crawler.fetchArticles('agentic-ai');

      expect(mockedAxios.get).toHaveBeenCalledTimes(5);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('tag=ai'),
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('tag=artificial%20intelligence'),
        expect.any(Object)
      );
    }, 30000);

    it('should filter articles by subject relevance', async () => {
      const relevantArticle = createDevToArticle({
        id: 1,
        title: 'AI Agents Tutorial',
        description: 'Learn about agentic ai',
      });

      const irrelevantArticle = createDevToArticle({
        id: 2,
        title: 'CSS Grid Tutorial',
        description: 'Learn CSS layouts',
      });

      mockedAxios.get.mockResolvedValue({ data: [relevantArticle, irrelevantArticle] });

      const articles = await crawler.fetchArticles('agentic-ai');

      const aiArticles = articles.filter(a => a.title.includes('AI Agents'));
      const cssArticles = articles.filter(a => a.title.includes('CSS'));

      expect(aiArticles.length).toBeGreaterThan(0);
      expect(cssArticles).toHaveLength(0);
    }, 30000);

    it('should deduplicate articles from multiple tag searches', async () => {
      const article = createDevToArticle({
        id: 999,
        title: 'AI Agents and LLMs',
        description: 'agentic ai with langchain',
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      const matchingArticles = articles.filter(a => a.id === 'devto-999');
      expect(matchingArticles).toHaveLength(1);
    }, 30000);

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    }, 30000);

    it('should set correct User-Agent header', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await crawler.fetchArticles('agentic-ai');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'NewsFetcher/1.0',
          }),
        })
      );
    }, 30000);

    it('should use description as content', async () => {
      const article = createDevToArticle({
        id: 1,
        title: 'AI Agents Post',
        description: 'This is the article description about agentic ai',
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].content).toBe('This is the article description about agentic ai');
    }, 30000);

    it('should fall back to body_markdown when description is empty', async () => {
      const article = createDevToArticle({
        id: 1,
        title: 'AI Agents Post',
        description: '',
        body_markdown: 'Full article content about agentic ai systems',
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].content).toBe('Full article content about agentic ai systems');
    }, 30000);

    it('should parse published_at date correctly', async () => {
      const article = createDevToArticle({
        id: 1,
        title: 'AI Agents Post',
        description: 'agentic ai',
        published_at: '2024-06-15T14:30:00Z',
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].publishedAt).toEqual(new Date('2024-06-15T14:30:00Z'));
    }, 30000);

    it('should correctly map engagement metrics', async () => {
      const article = createDevToArticle({
        id: 1,
        title: 'AI Agents Post',
        description: 'agentic ai',
        public_reactions_count: 500,
        comments_count: 75,
        page_views_count: 10000,
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].engagement.reactions).toBe(500);
      expect(articles[0].engagement.comments).toBe(75);
      expect(articles[0].engagement.views).toBe(10000);
    }, 30000);

    it('should handle missing page_views_count', async () => {
      const article = {
        id: 1,
        title: 'AI Agents Post',
        url: 'https://dev.to/article',
        description: 'agentic ai',
        public_reactions_count: 100,
        comments_count: 50,
        published_at: '2024-01-15T10:00:00Z',
        tag_list: ['ai'],
      };

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].engagement.views).toBeUndefined();
    }, 30000);

    it('should preserve article URL', async () => {
      const article = createDevToArticle({
        id: 1,
        title: 'AI Agents Post',
        url: 'https://dev.to/username/ai-agents-post-abc123',
        description: 'agentic ai',
      });

      mockedAxios.get.mockResolvedValue({ data: [article] });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].url).toBe('https://dev.to/username/ai-agents-post-abc123');
    }, 30000);
  });
});
