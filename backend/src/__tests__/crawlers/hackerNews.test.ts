import { HackerNewsCrawler } from '../../crawlers/hackerNews';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HackerNewsCrawler', () => {
  let crawler: HackerNewsCrawler;

  beforeEach(() => {
    crawler = new HackerNewsCrawler();
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(crawler.name).toBe('Hacker News');
  });

  describe('fetchArticles', () => {
    it('should fetch and transform articles correctly', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1, 2] })
        .mockResolvedValueOnce({ data: [3] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'Building AI Agents with Modern Tools',
            url: 'https://example.com/ai-agents',
            text: 'Article about agentic ai systems',
            score: 150,
            descendants: 45,
            time: 1700000000,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 2,
            type: 'story',
            title: 'Unrelated Story',
            url: 'https://example.com/other',
            score: 100,
            descendants: 20,
            time: 1700000000,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 3,
            type: 'story',
            title: 'LangChain Tutorial',
            url: 'https://example.com/langchain',
            score: 80,
            descendants: 15,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles.length).toBeGreaterThan(0);
      
      const aiAgentArticle = articles.find(a => a.title.includes('AI Agents'));
      expect(aiAgentArticle).toBeDefined();
      expect(aiAgentArticle?.id).toBe('hn-1');
      expect(aiAgentArticle?.source).toBe('Hacker News');
      expect(aiAgentArticle?.engagement.upvotes).toBe(150);
      expect(aiAgentArticle?.engagement.comments).toBe(45);
    });

    it('should filter out non-story items', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'comment',
            title: 'AI Agents Discussion',
            text: 'agentic ai',
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    });

    it('should filter out items without title', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            url: 'https://example.com',
            score: 100,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    });

    it('should use HN discussion URL when article URL is missing', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 12345,
            type: 'story',
            title: 'Ask HN: AI Agents question',
            text: 'Discussion about agentic ai',
            score: 50,
            descendants: 30,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(1);
      expect(articles[0].url).toBe('https://news.ycombinator.com/item?id=12345');
    });

    it('should deduplicate stories from top and new', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1, 2] })
        .mockResolvedValueOnce({ data: [1, 3] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents Article',
            url: 'https://example.com/1',
            text: 'agentic ai',
            score: 100,
            time: 1700000000,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 2,
            type: 'story',
            title: 'Another AI Agents Post',
            url: 'https://example.com/2',
            text: 'agentic ai',
            score: 50,
            time: 1700000000,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 3,
            type: 'story',
            title: 'Third AI Article',
            url: 'https://example.com/3',
            text: 'agentic ai',
            score: 75,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      const ids = articles.map(a => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    });

    it('should handle individual story fetch failures', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1, 2] })
        .mockResolvedValueOnce({ data: [] })
        .mockRejectedValueOnce(new Error('Story fetch failed'))
        .mockResolvedValueOnce({
          data: {
            id: 2,
            type: 'story',
            title: 'AI Agents Article',
            url: 'https://example.com/2',
            text: 'agentic ai',
            score: 100,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe('hn-2');
    });

    it('should filter articles by subject relevance', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1, 2] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents and Automation',
            url: 'https://example.com/1',
            text: 'agentic ai systems',
            score: 100,
            time: 1700000000,
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 2,
            type: 'story',
            title: 'Cooking Recipes',
            url: 'https://example.com/2',
            text: 'How to make pasta',
            score: 200,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toContain('AI Agents');
    });

    it('should correctly map engagement metrics', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents Post',
            url: 'https://example.com/1',
            text: 'agentic ai',
            score: 250,
            descendants: 100,
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].engagement.upvotes).toBe(250);
      expect(articles[0].engagement.comments).toBe(100);
    });

    it('should handle missing engagement metrics', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents Post',
            url: 'https://example.com/1',
            text: 'agentic ai',
            time: 1700000000,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].engagement.upvotes).toBe(0);
      expect(articles[0].engagement.comments).toBe(0);
    });

    it('should convert Unix timestamp to Date', async () => {
      const timestamp = 1700000000;
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents Post',
            url: 'https://example.com/1',
            text: 'agentic ai',
            score: 100,
            time: timestamp,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].publishedAt).toEqual(new Date(timestamp * 1000));
    });

    it('should handle missing timestamp', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: [1] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: {
            id: 1,
            type: 'story',
            title: 'AI Agents Post',
            url: 'https://example.com/1',
            text: 'agentic ai',
            score: 100,
          },
        });

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].publishedAt).toBeNull();
    });
  });
});
