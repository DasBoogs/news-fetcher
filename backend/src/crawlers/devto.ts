import axios from 'axios';
import { Article, Crawler, EngagementMetrics } from './types';
import { isRelevantToSubject } from '../subjects';

const DEVTO_API_BASE = 'https://dev.to/api';

interface DevToArticle {
  id: number;
  title: string;
  url: string;
  description: string;
  body_markdown?: string;
  public_reactions_count: number;
  comments_count: number;
  page_views_count?: number;
  published_at: string;
  tag_list: string[];
}

export class DevToCrawler implements Crawler {
  name = 'Dev.to';

  async fetchArticles(subjectId: string): Promise<Article[]> {
    const articles: Article[] = [];

    try {
      const searchTerms = ['ai', 'artificial intelligence', 'llm', 'agents', 'automation'];

      for (const term of searchTerms) {
        const response = await axios.get<DevToArticle[]>(
          `${DEVTO_API_BASE}/articles?tag=${encodeURIComponent(term)}&per_page=30`,
          {
            headers: {
              'User-Agent': 'NewsFetcher/1.0',
            },
          }
        );

        for (const article of response.data) {
          const title = article.title;
          const content = article.description || article.body_markdown || '';

          if (!isRelevantToSubject(title, content, subjectId)) continue;

          const engagement: EngagementMetrics = {
            reactions: article.public_reactions_count,
            comments: article.comments_count,
            views: article.page_views_count,
          };

          articles.push({
            id: `devto-${article.id}`,
            title,
            url: article.url,
            content,
            source: 'Dev.to',
            publishedAt: new Date(article.published_at),
            engagement,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error fetching from Dev.to:', error);
    }

    const uniqueArticles = Array.from(
      new Map(articles.map(a => [a.id, a])).values()
    );

    return uniqueArticles;
  }
}
