import axios from 'axios';
import { Article, Crawler, EngagementMetrics } from './types';
import { isRelevantToSubject } from '../subjects';

const REDDIT_API_BASE = 'https://www.reddit.com';

interface RedditPost {
  data: {
    id: string;
    title: string;
    url: string;
    selftext: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    permalink: string;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
  };
}

const TECH_SUBREDDITS = [
  'artificial',
  'MachineLearning',
  'technology',
  'programming',
  'LocalLLaMA',
  'singularity',
  'ChatGPT',
  'OpenAI',
];

export class RedditCrawler implements Crawler {
  name = 'Reddit';

  async fetchArticles(subjectId: string): Promise<Article[]> {
    const articles: Article[] = [];

    for (const subreddit of TECH_SUBREDDITS) {
      try {
        const response = await axios.get<RedditListing>(
          `${REDDIT_API_BASE}/r/${subreddit}/hot.json?limit=50`,
          {
            headers: {
              'User-Agent': 'NewsFetcher/1.0',
            },
          }
        );

        for (const post of response.data.data.children) {
          const { data } = post;
          const title = data.title;
          const content = data.selftext || '';

          if (!isRelevantToSubject(title, content, subjectId)) continue;

          const engagement: EngagementMetrics = {
            upvotes: data.score,
            comments: data.num_comments,
          };

          articles.push({
            id: `reddit-${data.id}`,
            title,
            url: data.url.startsWith('http') ? data.url : `https://www.reddit.com${data.permalink}`,
            content,
            source: `Reddit r/${data.subreddit}`,
            publishedAt: new Date(data.created_utc * 1000),
            engagement,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    return articles;
  }
}
