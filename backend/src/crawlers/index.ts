import { Crawler, Article } from './types';
import { HackerNewsCrawler } from './hackerNews';
import { RedditCrawler } from './reddit';
import { DevToCrawler } from './devto';

export const crawlers: Crawler[] = [
  new HackerNewsCrawler(),
  new RedditCrawler(),
  new DevToCrawler(),
];

export async function fetchAllArticles(subjectId: string): Promise<Article[]> {
  const allArticles: Article[] = [];

  const crawlerPromises = crawlers.map(async crawler => {
    try {
      console.log(`Fetching from ${crawler.name}...`);
      const articles = await crawler.fetchArticles(subjectId);
      console.log(`Found ${articles.length} relevant articles from ${crawler.name}`);
      return articles;
    } catch (error) {
      console.error(`Error in ${crawler.name} crawler:`, error);
      return [];
    }
  });

  const results = await Promise.all(crawlerPromises);

  for (const articles of results) {
    allArticles.push(...articles);
  }

  return allArticles;
}

export { Article, Crawler, EngagementMetrics, ScoredArticle, ScoreBreakdown } from './types';
