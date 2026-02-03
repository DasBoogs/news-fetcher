import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScoredArticle } from '../crawlers/types';

export async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsFetcher/1.0)',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    $('script, style, nav, header, footer, aside, .ads, .advertisement, .sidebar').remove();

    const selectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
      '.story-body',
      '#article-body',
    ];

    let text = '';

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        text = element.text();
        break;
      }
    }

    if (!text) {
      text = $('body').text();
    }

    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    const words = text.split(/\s+/).slice(0, 300);
    return words.join(' ');
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return '';
  }
}

export async function enrichArticlesWithContent(
  articles: ScoredArticle[]
): Promise<ScoredArticle[]> {
  const enrichedArticles: ScoredArticle[] = [];

  for (const article of articles) {
    let content = article.content;

    if (!content || content.length < 100) {
      try {
        const fetchedContent = await fetchArticleContent(article.url);
        if (fetchedContent) {
          content = fetchedContent;
        }
      } catch (error) {
        console.error(`Failed to fetch content for ${article.url}`);
      }
    } else {
      const words = content.split(/\s+/).slice(0, 300);
      content = words.join(' ');
    }

    enrichedArticles.push({
      ...article,
      content,
    });
  }

  return enrichedArticles;
}
