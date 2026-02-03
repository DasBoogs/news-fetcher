import express from 'express';
import cors from 'cors';
import { fetchAllArticles } from './crawlers';
import { scoreArticles, getTopArticles, getScoringMethodExplanation, DEFAULT_WEIGHTS } from './services/engagementScorer';
import { enrichArticlesWithContent } from './services/contentFetcher';
import { getAllSubjects, getSubject } from './subjects';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/subjects', (req, res) => {
  const subjects = getAllSubjects();
  res.json({ subjects });
});

app.get('/api/subjects/:id', (req, res) => {
  const subject = getSubject(req.params.id);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  res.json({ subject });
});

app.get('/api/scoring-method', (req, res) => {
  res.json({
    explanation: getScoringMethodExplanation(),
    weights: DEFAULT_WEIGHTS,
  });
});

app.get('/api/articles/:subjectId', async (req, res) => {
  const { subjectId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;

  const subject = getSubject(subjectId);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  try {
    console.log(`Fetching articles for subject: ${subject.name}`);

    const articles = await fetchAllArticles(subjectId);
    console.log(`Total articles found: ${articles.length}`);

    const scoredArticles = scoreArticles(articles, subjectId);
    console.log(`Scored ${scoredArticles.length} articles`);

    const topArticles = getTopArticles(scoredArticles, limit);
    console.log(`Returning top ${topArticles.length} articles`);

    const enrichedArticles = await enrichArticlesWithContent(topArticles);

    res.json({
      subject: subject.name,
      totalFound: articles.length,
      returned: enrichedArticles.length,
      scoringMethod: getScoringMethodExplanation(),
      weights: DEFAULT_WEIGHTS,
      articles: enrichedArticles.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url,
        content: article.content,
        source: article.source,
        publishedAt: article.publishedAt,
        engagement: article.engagement,
        engagementScore: article.engagementScore,
        scoreBreakdown: article.scoreBreakdown,
        matchedKeywords: article.matchedKeywords,
        relevanceScore: article.relevanceScore,
      })),
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
