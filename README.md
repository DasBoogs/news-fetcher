# News Fetcher

A news aggregation backend that fetches articles from multiple sources, scores them by engagement metrics, filters by subject relevance, and enriches them with full content via web scraping.

## Overview

News Fetcher aggregates content from Hacker News, Reddit, and Dev.to, then applies intelligent filtering and scoring to surface the most relevant and engaging articles for a given subject. The system currently supports filtering for "Agentic AI" topics but is designed to be extensible to additional subjects.

The backend provides a REST API that returns scored and enriched articles, making it easy to build frontends or integrate with other systems that need curated news content.

## Features

The system provides multi-source article aggregation from Hacker News (top and new stories), Reddit (tech-focused subreddits), and Dev.to (tag-based search). Articles are scored using weighted engagement metrics where comments receive 2.0x weight, shares 1.5x, upvotes 1.0x, reactions 0.8x, and views 0.01x. Subject relevance filtering uses keyword matching with primary keywords worth 10 points and related terms worth 5 points. Content enrichment automatically fetches full article content when summaries are less than 100 characters.

## Installation

Clone the repository and install dependencies for both backend and frontend:

```bash
git clone https://github.com/DasBoogs/news-fetcher.git
cd news-fetcher

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Running the Application

Start the backend server:

```bash
cd backend
npm run dev
```

The backend runs on port 3001 by default (configurable via `PORT` environment variable).

Start the frontend development server:

```bash
cd frontend
npm run dev
```

## API Documentation

### Get Articles by Subject

```
GET /api/articles/:subjectId
```

Fetches articles filtered by subject relevance and sorted by engagement score.

Query parameters:
- `limit` (optional): Number of articles to return (default: 10)

Example request:
```bash
curl http://localhost:3001/api/articles/agentic-ai?limit=5
```

Example response:
```json
{
  "subject": "Agentic AI",
  "totalFound": 45,
  "returned": 5,
  "scoringMethod": "...",
  "weights": {
    "upvotes": 1.0,
    "comments": 2.0,
    "shares": 1.5,
    "reactions": 0.8,
    "views": 0.01
  },
  "articles": [
    {
      "id": "hn-12345",
      "title": "Building Autonomous AI Agents",
      "url": "https://example.com/article",
      "content": "Article content...",
      "source": "Hacker News",
      "publishedAt": "2026-02-01T12:00:00.000Z",
      "engagement": {
        "upvotes": 150,
        "comments": 45
      },
      "engagementScore": 240,
      "scoreBreakdown": {
        "upvotesContribution": 150,
        "commentsContribution": 90,
        "totalScore": 240,
        "explanation": "Score calculation: 150 upvotes x 1 = 150.0 + 45 comments x 2 = 90.0 = 240.0"
      },
      "matchedKeywords": ["ai agents", "autonomous"],
      "relevanceScore": 20
    }
  ]
}
```

### List All Subjects

```
GET /api/subjects
```

Returns all available subjects for filtering.

### Get Subject Details

```
GET /api/subjects/:id
```

Returns details for a specific subject including keywords and related terms.

### Get Scoring Method

```
GET /api/scoring-method
```

Returns an explanation of how engagement scores are calculated along with the current weights.

### Health Check

```
GET /api/health
```

Returns server status and timestamp.

## Architecture Overview

### Request Flow

When a request comes to `/api/articles/:subjectId`, the system executes the following pipeline:

1. **Validate Subject**: The subject ID is validated against registered subjects in `backend/src/subjects/index.ts`
2. **Fetch Articles**: All registered crawlers execute in parallel via `fetchAllArticles()` in `backend/src/crawlers/index.ts`
3. **Score Articles**: Each article receives an engagement score calculated in `backend/src/services/engagementScorer.ts`
4. **Select Top Articles**: Articles are sorted by score and limited to the requested count
5. **Enrich Content**: Articles with short content (< 100 characters) have their full content fetched via `backend/src/services/contentFetcher.ts`
6. **Return Response**: The enriched articles are returned with scoring metadata

### Directory Structure

```
news-fetcher/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server and API routes
│   │   ├── crawlers/
│   │   │   ├── index.ts          # Crawler registry and parallel execution
│   │   │   ├── types.ts          # Article, Crawler, and EngagementMetrics interfaces
│   │   │   ├── hackerNews.ts     # Hacker News crawler
│   │   │   ├── reddit.ts         # Reddit crawler
│   │   │   └── devto.ts          # Dev.to crawler
│   │   ├── services/
│   │   │   ├── engagementScorer.ts  # Scoring logic with weighted metrics
│   │   │   └── contentFetcher.ts    # Web scraping for article content
│   │   └── subjects/
│   │       ├── index.ts          # Subject registry and matching logic
│   │       ├── types.ts          # Subject and SubjectMatch interfaces
│   │       └── agenticAI.ts      # Agentic AI subject definition
│   └── package.json
├── frontend/                     # React frontend (Vite + TypeScript)
└── LICENSE
```

### Engagement Scoring

The engagement scorer in `backend/src/services/engagementScorer.ts` calculates a weighted sum of engagement metrics:

| Metric | Weight | Rationale |
|--------|--------|-----------|
| Comments | 2.0x | Highest weight - comments require effort and indicate genuine interest |
| Shares | 1.5x | Users found content valuable enough to spread |
| Upvotes | 1.0x | Baseline engagement metric |
| Reactions | 0.8x | Easier than upvotes on some platforms |
| Views | 0.01x | Lowest weight - views don't indicate quality |

The formula is:
```
Score = (upvotes × 1.0) + (comments × 2.0) + (shares × 1.5) + (reactions × 0.8) + (views × 0.01)
```

### Subject Filtering

Subject filtering in `backend/src/subjects/index.ts` uses keyword matching to determine article relevance:

- **Primary keywords** (defined in `keywords` array): 10 points each
- **Related terms** (defined in `relatedTerms` array): 5 points each

An article must match at least one keyword to be considered relevant (relevance score > 0).

### Content Enrichment

The content fetcher in `backend/src/services/contentFetcher.ts` uses Cheerio to scrape full article content when the existing content is less than 100 characters. It searches for content in common article selectors (`article`, `[role="main"]`, `.post-content`, etc.) and returns up to 300 words.

## Adding New News Sources

The crawler system is designed to be easily extensible. To add a new news source, you need to implement the `Crawler` interface and register your crawler.

### Step 1: Understand the Crawler Interface

New sources must implement the `Crawler` interface defined in `backend/src/crawlers/types.ts`:

```typescript
export interface Crawler {
  name: string;
  fetchArticles(subjectId: string): Promise<Article[]>;
}
```

The `Article` interface that crawlers must return:

```typescript
export interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: Date | null;
  engagement: EngagementMetrics;
}
```

### Step 2: Understand Engagement Metrics

The `EngagementMetrics` interface has all optional fields to accommodate different source capabilities:

```typescript
export interface EngagementMetrics {
  upvotes?: number;
  comments?: number;
  shares?: number;
  reactions?: number;
  views?: number;
}
```

Different sources map their metrics differently:

| Source | Source Metric | Maps To |
|--------|--------------|---------|
| Hacker News | `score` | `upvotes` |
| Hacker News | `descendants` | `comments` |
| Reddit | `score` | `upvotes` |
| Reddit | `num_comments` | `comments` |
| Dev.to | `public_reactions_count` | `reactions` |
| Dev.to | `comments_count` | `comments` |
| Dev.to | `page_views_count` | `views` |

### Step 3: Create Your Crawler

Create a new file in `backend/src/crawlers/` (e.g., `yourSource.ts`). Follow this implementation pattern based on the existing crawlers:

```typescript
import axios from 'axios';
import { Article, Crawler, EngagementMetrics } from './types';
import { isRelevantToSubject } from '../subjects';

// Define the API response interface for your source
interface YourSourceArticle {
  id: string;
  title: string;
  link: string;
  body: string;
  likes: number;
  comment_count: number;
  created_at: string;
}

export class YourSourceCrawler implements Crawler {
  name = 'Your Source';

  async fetchArticles(subjectId: string): Promise<Article[]> {
    const articles: Article[] = [];

    try {
      // 1. Fetch raw data from the source API
      const response = await axios.get<YourSourceArticle[]>(
        'https://api.yoursource.com/articles',
        {
          headers: {
            'User-Agent': 'NewsFetcher/1.0',
          },
        }
      );

      for (const item of response.data) {
        const title = item.title;
        const content = item.body || '';

        // 2. Filter by subject relevance using keyword matching
        if (!isRelevantToSubject(title, content, subjectId)) continue;

        // 3. Normalize engagement metrics to the standard format
        const engagement: EngagementMetrics = {
          upvotes: item.likes,
          comments: item.comment_count,
        };

        // 4. Push standardized Article objects to the results array
        articles.push({
          id: `yoursource-${item.id}`,
          title,
          url: item.link,
          content,
          source: 'Your Source',
          publishedAt: new Date(item.created_at),
          engagement,
        });
      }
    } catch (error) {
      console.error('Error fetching from Your Source:', error);
    }

    return articles;
  }
}
```

### Step 4: Register Your Crawler

Add your crawler to the registry in `backend/src/crawlers/index.ts`:

```typescript
import { Crawler, Article } from './types';
import { HackerNewsCrawler } from './hackerNews';
import { RedditCrawler } from './reddit';
import { DevToCrawler } from './devto';
import { YourSourceCrawler } from './yourSource';  // Add import

export const crawlers: Crawler[] = [
  new HackerNewsCrawler(),
  new RedditCrawler(),
  new DevToCrawler(),
  new YourSourceCrawler(),  // Add to array
];
```

That's it! The system will automatically execute your crawler in parallel with the others when fetching articles. The `fetchAllArticles` function uses `Promise.all` to run all crawlers concurrently, and errors in individual crawlers are caught and logged without affecting other crawlers.

### Standard Crawler Workflow

All crawlers follow this workflow:

1. **Fetch raw data** from the source API (e.g., `axios.get()`)
2. **Filter by subject relevance** using `isRelevantToSubject(title, content, subjectId)` from `../subjects`
3. **Normalize engagement metrics** to the standard `EngagementMetrics` format
4. **Push standardized Article objects** to the results array with a unique ID prefixed by source name

### Best Practices

When implementing a new crawler, consider rate limiting by adding delays between requests if fetching from multiple endpoints (see `devto.ts` and `reddit.ts` for examples using `setTimeout`). Handle errors gracefully by wrapping API calls in try-catch blocks and returning an empty array on failure. Use unique IDs by prefixing article IDs with your source name (e.g., `yoursource-${id}`) to avoid collisions. Set appropriate User-Agent headers to identify your requests to the source API. Deduplicate results if your crawler fetches from multiple endpoints that might return the same articles (see `devto.ts` for an example using `Map`).

## Adding New Subjects

To add a new subject for filtering, create a new file in `backend/src/subjects/` following the pattern in `agenticAI.ts`:

```typescript
import { Subject } from './types';

export const yourSubject: Subject = {
  id: 'your-subject-id',
  name: 'Your Subject Name',
  description: 'Description of what this subject covers',
  keywords: [
    // Primary keywords (10 points each)
    'primary keyword 1',
    'primary keyword 2',
  ],
  relatedTerms: [
    // Related terms (5 points each)
    'related term 1',
    'related term 2',
  ],
};
```

Then register it in `backend/src/subjects/index.ts`:

```typescript
import { yourSubject } from './yourSubject';

subjects.set(yourSubject.id, yourSubject);
```

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js for the REST API
- Axios for HTTP requests
- Cheerio for HTML parsing and content extraction

### Frontend
- React 19 with TypeScript
- Vite for build tooling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. When adding new crawlers or subjects, ensure you follow the patterns established in the existing code.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
