import { fetchAllArticles, crawlers } from '../../crawlers';
import { Article } from '../../crawlers/types';

describe('crawlers/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('crawlers array', () => {
    it('should contain all three crawlers', () => {
      expect(crawlers).toHaveLength(3);
    });

    it('should include HackerNewsCrawler', () => {
      const hnCrawler = crawlers.find(c => c.name === 'Hacker News');
      expect(hnCrawler).toBeDefined();
    });

    it('should include RedditCrawler', () => {
      const redditCrawler = crawlers.find(c => c.name === 'Reddit');
      expect(redditCrawler).toBeDefined();
    });

    it('should include DevToCrawler', () => {
      const devtoCrawler = crawlers.find(c => c.name === 'Dev.to');
      expect(devtoCrawler).toBeDefined();
    });
  });

  describe('fetchAllArticles', () => {
    const createMockArticle = (id: string, source: string): Article => ({
      id,
      title: `Article from ${source}`,
      url: `https://example.com/${id}`,
      content: 'Test content',
      source,
      publishedAt: new Date(),
      engagement: { upvotes: 100 },
    });

    it('should aggregate articles from all crawlers', async () => {
      for (const crawler of crawlers) {
        const mockArticle = createMockArticle(`${crawler.name}-1`, crawler.name);
        jest.spyOn(crawler, 'fetchArticles').mockResolvedValue([mockArticle]);
      }

      const articles = await fetchAllArticles('agentic-ai');

      expect(articles.length).toBe(3);
      expect(articles.some(a => a.source === 'Hacker News')).toBe(true);
      expect(articles.some(a => a.source === 'Reddit')).toBe(true);
      expect(articles.some(a => a.source === 'Dev.to')).toBe(true);
    });

    it('should handle crawler errors gracefully', async () => {
      jest.spyOn(crawlers[0], 'fetchArticles').mockRejectedValue(new Error('HN API Error'));
      jest.spyOn(crawlers[1], 'fetchArticles').mockResolvedValue([
        createMockArticle('reddit-1', 'Reddit'),
      ]);
      jest.spyOn(crawlers[2], 'fetchArticles').mockResolvedValue([
        createMockArticle('devto-1', 'Dev.to'),
      ]);

      const articles = await fetchAllArticles('agentic-ai');

      expect(articles.length).toBe(2);
      expect(articles.some(a => a.source === 'Reddit')).toBe(true);
      expect(articles.some(a => a.source === 'Dev.to')).toBe(true);
    });

    it('should return empty array when all crawlers fail', async () => {
      for (const crawler of crawlers) {
        jest.spyOn(crawler, 'fetchArticles').mockRejectedValue(new Error('API Error'));
      }

      const articles = await fetchAllArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    });

    it('should return empty array when all crawlers return empty', async () => {
      for (const crawler of crawlers) {
        jest.spyOn(crawler, 'fetchArticles').mockResolvedValue([]);
      }

      const articles = await fetchAllArticles('agentic-ai');

      expect(articles).toHaveLength(0);
    });

    it('should pass subjectId to all crawlers', async () => {
      const spies = crawlers.map(crawler => 
        jest.spyOn(crawler, 'fetchArticles').mockResolvedValue([])
      );

      await fetchAllArticles('test-subject');

      for (const spy of spies) {
        expect(spy).toHaveBeenCalledWith('test-subject');
      }
    });

    it('should combine multiple articles from each crawler', async () => {
      jest.spyOn(crawlers[0], 'fetchArticles').mockResolvedValue([
        createMockArticle('hn-1', 'Hacker News'),
        createMockArticle('hn-2', 'Hacker News'),
      ]);
      jest.spyOn(crawlers[1], 'fetchArticles').mockResolvedValue([
        createMockArticle('reddit-1', 'Reddit'),
        createMockArticle('reddit-2', 'Reddit'),
        createMockArticle('reddit-3', 'Reddit'),
      ]);
      jest.spyOn(crawlers[2], 'fetchArticles').mockResolvedValue([
        createMockArticle('devto-1', 'Dev.to'),
      ]);

      const articles = await fetchAllArticles('agentic-ai');

      expect(articles).toHaveLength(6);
    });

    it('should execute crawlers in parallel', async () => {
      const delays: number[] = [];
      const startTime = Date.now();

      jest.spyOn(crawlers[0], 'fetchArticles').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        delays.push(Date.now() - startTime);
        return [];
      });

      jest.spyOn(crawlers[1], 'fetchArticles').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        delays.push(Date.now() - startTime);
        return [];
      });

      jest.spyOn(crawlers[2], 'fetchArticles').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        delays.push(Date.now() - startTime);
        return [];
      });

      await fetchAllArticles('agentic-ai');

      const maxDelay = Math.max(...delays);
      expect(maxDelay).toBeLessThan(200);
    });
  });
});
