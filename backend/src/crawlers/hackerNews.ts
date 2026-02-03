import axios from 'axios';
import { Article, Crawler, EngagementMetrics } from './types';
import { isRelevantToSubject } from '../subjects';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
}

export class HackerNewsCrawler implements Crawler {
  name = 'Hacker News';

  async fetchArticles(subjectId: string): Promise<Article[]> {
    const articles: Article[] = [];

    try {
      const topStoriesResponse = await axios.get<number[]>(`${HN_API_BASE}/topstories.json`);
      const topStoryIds = topStoriesResponse.data.slice(0, 100);

      const newStoriesResponse = await axios.get<number[]>(`${HN_API_BASE}/newstories.json`);
      const newStoryIds = newStoriesResponse.data.slice(0, 50);

      const allIds = [...new Set([...topStoryIds, ...newStoryIds])];

      const storyPromises = allIds.map(id =>
        axios.get<HNItem>(`${HN_API_BASE}/item/${id}.json`).catch(() => null)
      );

      const responses = await Promise.all(storyPromises);

      for (const response of responses) {
        if (!response || !response.data) continue;

        const item = response.data;
        if (item.type !== 'story' || !item.title) continue;

        const title = item.title;
        const content = item.text || '';
        const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;

        if (!isRelevantToSubject(title, content, subjectId)) continue;

        const engagement: EngagementMetrics = {
          upvotes: item.score || 0,
          comments: item.descendants || 0,
        };

        articles.push({
          id: `hn-${item.id}`,
          title,
          url,
          content,
          source: 'Hacker News',
          publishedAt: item.time ? new Date(item.time * 1000) : null,
          engagement,
        });
      }
    } catch (error) {
      console.error('Error fetching from Hacker News:', error);
    }

    return articles;
  }
}
