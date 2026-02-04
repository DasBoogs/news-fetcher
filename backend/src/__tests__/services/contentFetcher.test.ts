import { fetchArticleContent, enrichArticlesWithContent } from '../../services/contentFetcher';
import { ScoredArticle } from '../../crawlers/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('contentFetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArticleContent', () => {
    it('should extract content from article tag', async () => {
      const html = `
        <html>
          <body>
            <nav>Navigation</nav>
            <article>
              <p>This is the main article content that we want to extract from the page.</p>
            </article>
            <footer>Footer</footer>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/article');

      expect(result).toContain('This is the main article content');
      expect(result).not.toContain('Navigation');
      expect(result).not.toContain('Footer');
    });

    it('should extract content from main tag when article not present', async () => {
      const html = `
        <html>
          <body>
            <header>Header</header>
            <main>
              <p>Main content goes here with important information.</p>
            </main>
            <aside>Sidebar</aside>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/page');

      expect(result).toContain('Main content goes here');
    });

    it('should extract content from .post-content class', async () => {
      const html = `
        <html>
          <body>
            <div class="post-content">
              <p>Blog post content with detailed information.</p>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/blog');

      expect(result).toContain('Blog post content');
    });

    it('should extract content from [role="main"]', async () => {
      const html = `
        <html>
          <body>
            <div role="main">
              <p>Accessible main content area.</p>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/accessible');

      expect(result).toContain('Accessible main content');
    });

    it('should fall back to body when no selectors match', async () => {
      const html = `
        <html>
          <body>
            <div>
              <p>Some body content without specific selectors.</p>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/simple');

      expect(result).toContain('Some body content');
    });

    it('should remove script and style tags', async () => {
      const html = `
        <html>
          <body>
            <article>
              <script>console.log('should be removed');</script>
              <style>.hidden { display: none; }</style>
              <p>Actual content here.</p>
            </article>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/scripts');

      expect(result).toContain('Actual content here');
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('display: none');
    });

    it('should remove ads and sidebar elements', async () => {
      const html = `
        <html>
          <body>
            <article>
              <p>Main article text.</p>
              <div class="ads">Buy our product!</div>
              <div class="advertisement">Sponsored content</div>
              <div class="sidebar">Related links</div>
            </article>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/ads');

      expect(result).toContain('Main article text');
      expect(result).not.toContain('Buy our product');
      expect(result).not.toContain('Sponsored content');
      expect(result).not.toContain('Related links');
    });

    it('should truncate content to 300 words', async () => {
      const longContent = Array(400).fill('word').join(' ');
      const html = `
        <html>
          <body>
            <article>
              <p>${longContent}</p>
            </article>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/long');

      const wordCount = result.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(300);
    });

    it('should normalize whitespace', async () => {
      const html = `
        <html>
          <body>
            <article>
              <p>Content   with    multiple     spaces</p>
              <p>And

              newlines</p>
            </article>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await fetchArticleContent('https://example.com/whitespace');

      expect(result).not.toMatch(/\s{2,}/);
    });

    it('should return empty string on network error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchArticleContent('https://example.com/error');

      expect(result).toBe('');
    });

    it('should return empty string on timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

      const result = await fetchArticleContent('https://example.com/timeout');

      expect(result).toBe('');
    });

    it('should set correct headers', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: '<html><body><article>Test</article></body></html>' });

      await fetchArticleContent('https://example.com/headers');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/headers',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('NewsFetcher'),
          }),
          timeout: 10000,
        })
      );
    });
  });

  describe('enrichArticlesWithContent', () => {
    const createScoredArticle = (id: string, content: string, url: string): ScoredArticle => ({
      id,
      title: 'Test Article',
      url,
      content,
      source: 'Test',
      publishedAt: new Date(),
      engagement: {},
      engagementScore: 100,
      scoreBreakdown: {
        upvotesContribution: 0,
        commentsContribution: 0,
        sharesContribution: 0,
        reactionsContribution: 0,
        viewsContribution: 0,
        totalScore: 100,
        explanation: '',
      },
      matchedKeywords: [],
      relevanceScore: 10,
    });

    it('should enrich articles with short content', async () => {
      const articles = [
        createScoredArticle('1', 'Short', 'https://example.com/1'),
      ];

      const html = '<html><body><article>This is the full article content that was fetched from the web page.</article></body></html>';
      mockedAxios.get.mockResolvedValueOnce({ data: html });

      const result = await enrichArticlesWithContent(articles);

      expect(result[0].content).toContain('This is the full article content');
    });

    it('should not fetch content for articles with sufficient content', async () => {
      const longContent = 'A'.repeat(150);
      const articles = [
        createScoredArticle('1', longContent, 'https://example.com/1'),
      ];

      const result = await enrichArticlesWithContent(articles);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result[0].content.length).toBeLessThanOrEqual(longContent.length);
    });

    it('should truncate existing long content to 300 words', async () => {
      const longContent = Array(400).fill('word').join(' ');
      const articles = [
        createScoredArticle('1', longContent, 'https://example.com/1'),
      ];

      const result = await enrichArticlesWithContent(articles);

      const wordCount = result[0].content.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(300);
    });

    it('should handle fetch failures gracefully', async () => {
      const articles = [
        createScoredArticle('1', 'Short', 'https://example.com/1'),
      ];

      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await enrichArticlesWithContent(articles);

      expect(result[0].content).toBe('Short');
    });

    it('should process multiple articles', async () => {
      const articles = [
        createScoredArticle('1', 'Short 1', 'https://example.com/1'),
        createScoredArticle('2', 'A'.repeat(150), 'https://example.com/2'),
        createScoredArticle('3', 'Short 3', 'https://example.com/3'),
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: '<article>Enriched content 1</article>' })
        .mockResolvedValueOnce({ data: '<article>Enriched content 3</article>' });

      const result = await enrichArticlesWithContent(articles);

      expect(result).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should preserve other article properties', async () => {
      const articles = [
        createScoredArticle('test-id', 'Short', 'https://example.com/test'),
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: '<article>New content</article>' });

      const result = await enrichArticlesWithContent(articles);

      expect(result[0].id).toBe('test-id');
      expect(result[0].title).toBe('Test Article');
      expect(result[0].url).toBe('https://example.com/test');
      expect(result[0].engagementScore).toBe(100);
    });

    it('should handle empty array', async () => {
      const result = await enrichArticlesWithContent([]);
      expect(result).toHaveLength(0);
    });

    it('should use fetched content when available', async () => {
      const articles = [
        createScoredArticle('1', '', 'https://example.com/1'),
      ];

      mockedAxios.get.mockResolvedValueOnce({ 
        data: '<article>Fetched content from the web</article>' 
      });

      const result = await enrichArticlesWithContent(articles);

      expect(result[0].content).toContain('Fetched content from the web');
    });
  });
});
