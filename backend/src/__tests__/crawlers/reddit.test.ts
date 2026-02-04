import { RedditCrawler } from '../../crawlers/reddit';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RedditCrawler', () => {
  let crawler: RedditCrawler;

  beforeEach(() => {
    crawler = new RedditCrawler();
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(crawler.name).toBe('Reddit');
  });

  describe('fetchArticles', () => {
    const createRedditResponse = (posts: Array<{
      id: string;
      title: string;
      url: string;
      selftext?: string;
      score: number;
      num_comments: number;
      created_utc: number;
      subreddit: string;
      permalink: string;
    }>) => ({
      data: {
        data: {
          children: posts.map(post => ({ data: post })),
        },
      },
    });

    it('should fetch and transform articles correctly', async () => {
      const mockResponse = createRedditResponse([
        {
          id: 'abc123',
          title: 'Building AI Agents with Python',
          url: 'https://example.com/ai-agents',
          selftext: 'Discussion about agentic ai systems',
          score: 500,
          num_comments: 150,
          created_utc: 1700000000,
          subreddit: 'MachineLearning',
          permalink: '/r/MachineLearning/comments/abc123/building_ai_agents/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      const aiArticle = articles.find(a => a.title.includes('AI Agents'));
      expect(aiArticle).toBeDefined();
      expect(aiArticle?.id).toBe('reddit-abc123');
      expect(aiArticle?.source).toBe('Reddit r/MachineLearning');
      expect(aiArticle?.engagement.upvotes).toBe(500);
      expect(aiArticle?.engagement.comments).toBe(150);
    }, 30000);

    it('should fetch from multiple subreddits', async () => {
      mockedAxios.get.mockResolvedValue(createRedditResponse([]));

      await crawler.fetchArticles('agentic-ai');

      expect(mockedAxios.get).toHaveBeenCalledTimes(8);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/r/artificial/'),
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/r/MachineLearning/'),
        expect.any(Object)
      );
    }, 30000);

    it('should filter articles by subject relevance', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents and Automation',
          url: 'https://example.com/1',
          selftext: 'agentic ai systems',
          score: 100,
          num_comments: 50,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/',
        },
        {
          id: '2',
          title: 'Best Pizza Recipes',
          url: 'https://example.com/2',
          selftext: 'How to make pizza',
          score: 200,
          num_comments: 100,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/2/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      const relevantArticles = articles.filter(a => a.title.includes('AI Agents'));
      const irrelevantArticles = articles.filter(a => a.title.includes('Pizza'));

      expect(relevantArticles.length).toBeGreaterThan(0);
      expect(irrelevantArticles).toHaveLength(0);
    }, 30000);

    it('should handle external URLs correctly', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Article',
          url: 'https://external-site.com/article',
          selftext: 'agentic ai',
          score: 100,
          num_comments: 50,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].url).toBe('https://external-site.com/article');
    }, 30000);

    it('should use Reddit permalink for self posts', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Discussion',
          url: '/r/artificial/comments/1/ai_agents/',
          selftext: 'agentic ai discussion',
          score: 100,
          num_comments: 50,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/ai_agents/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].url).toBe('https://www.reddit.com/r/artificial/comments/1/ai_agents/');
    }, 30000);

    it('should handle API errors for individual subreddits gracefully', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Subreddit error'))
        .mockResolvedValue(createRedditResponse([
          {
            id: '1',
            title: 'AI Agents Post',
            url: 'https://example.com/1',
            selftext: 'agentic ai',
            score: 100,
            num_comments: 50,
            created_utc: 1700000000,
            subreddit: 'MachineLearning',
            permalink: '/r/MachineLearning/comments/1/',
          },
        ]));

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles.length).toBeGreaterThan(0);
    }, 30000);

    it('should set correct User-Agent header', async () => {
      mockedAxios.get.mockResolvedValue(createRedditResponse([]));

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

    it('should convert Unix timestamp to Date', async () => {
      const timestamp = 1700000000;
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Post',
          url: 'https://example.com/1',
          selftext: 'agentic ai',
          score: 100,
          num_comments: 50,
          created_utc: timestamp,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].publishedAt).toEqual(new Date(timestamp * 1000));
    }, 30000);

    it('should handle empty selftext', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Link Post',
          url: 'https://example.com/ai-agents',
          selftext: '',
          score: 100,
          num_comments: 50,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].content).toBe('');
    }, 30000);

    it('should include subreddit in source', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Post',
          url: 'https://example.com/1',
          selftext: 'agentic ai',
          score: 100,
          num_comments: 50,
          created_utc: 1700000000,
          subreddit: 'LocalLLaMA',
          permalink: '/r/LocalLLaMA/comments/1/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].source).toBe('Reddit r/LocalLLaMA');
    }, 30000);

    it('should correctly map engagement metrics', async () => {
      const mockResponse = createRedditResponse([
        {
          id: '1',
          title: 'AI Agents Post',
          url: 'https://example.com/1',
          selftext: 'agentic ai',
          score: 1500,
          num_comments: 300,
          created_utc: 1700000000,
          subreddit: 'artificial',
          permalink: '/r/artificial/comments/1/',
        },
      ]);

      mockedAxios.get.mockResolvedValue(mockResponse);

      const articles = await crawler.fetchArticles('agentic-ai');

      expect(articles[0].engagement.upvotes).toBe(1500);
      expect(articles[0].engagement.comments).toBe(300);
    }, 30000);
  });
});
