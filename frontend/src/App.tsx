import { useState, useEffect } from 'react';
import './App.css';
import type { Article, Subject, ArticlesResponse, SubjectsResponse, ScoringWeights } from './types';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('agentic-ai');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState<ScoringWeights | null>(null);
  const [showScoringInfo, setShowScoringInfo] = useState<boolean>(false);
  const [totalFound, setTotalFound] = useState<number>(0);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/subjects`);
      const data: SubjectsResponse = await response.json();
      setSubjects(data.subjects);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    setArticles([]);

    try {
      const response = await fetch(`${API_BASE}/articles/${selectedSubject}?limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      const data: ArticlesResponse = await response.json();
      setArticles(data.articles);
      setWeights(data.weights);
      setTotalFound(data.totalFound);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Tech News Engagement Tracker</h1>
        <p className="subtitle">
          Discover trending articles about emerging tech topics, ranked by user engagement
        </p>
      </header>

      <main className="main-content">
        <section className="controls">
          <div className="subject-selector">
            <label htmlFor="subject">Select Topic:</label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="fetch-button"
            onClick={fetchArticles}
            disabled={loading}
          >
            {loading ? 'Fetching Articles...' : 'Fetch Top Articles'}
          </button>

          <button
            className="info-button"
            onClick={() => setShowScoringInfo(!showScoringInfo)}
          >
            {showScoringInfo ? 'Hide' : 'Show'} Scoring Method
          </button>
        </section>

        {showScoringInfo && (
          <section className="scoring-info">
            <h2>How Engagement Scores Are Calculated</h2>
            {weights && (
              <div className="weights-table">
                <h3>Scoring Weights</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Weight</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Upvotes</td>
                      <td>{weights.upvotes}x</td>
                      <td>Direct measure of user approval</td>
                    </tr>
                    <tr>
                      <td>Comments</td>
                      <td>{weights.comments}x</td>
                      <td>Higher weight - comments indicate deeper engagement</td>
                    </tr>
                    <tr>
                      <td>Shares</td>
                      <td>{weights.shares}x</td>
                      <td>Indicates content worth spreading</td>
                    </tr>
                    <tr>
                      <td>Reactions</td>
                      <td>{weights.reactions}x</td>
                      <td>Quick engagement indicator</td>
                    </tr>
                    <tr>
                      <td>Views</td>
                      <td>{weights.views}x</td>
                      <td>Lower weight - views don't indicate quality</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="formula">
              <h3>Formula</h3>
              <code>
                Score = (upvotes x {weights?.upvotes || 1}) + (comments x {weights?.comments || 2}) + 
                (shares x {weights?.shares || 1.5}) + (reactions x {weights?.reactions || 0.8}) + 
                (views x {weights?.views || 0.01})
              </code>
            </div>
            <div className="data-sources">
              <h3>Data Sources</h3>
              <ul>
                <li><strong>Hacker News:</strong> Provides upvotes (points) and comment counts</li>
                <li><strong>Reddit:</strong> Provides upvotes (score) and comment counts from tech subreddits</li>
                <li><strong>Dev.to:</strong> Provides reactions, comments, and sometimes view counts</li>
              </ul>
            </div>
          </section>
        )}

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Crawling news sources for relevant articles...</p>
            <p className="loading-note">This may take a moment as we fetch from multiple sources</p>
          </div>
        )}

        {articles.length > 0 && (
          <section className="results">
            <div className="results-header">
              <h2>Top 10 Articles</h2>
              <p className="results-summary">
                Found {totalFound} relevant articles, showing top 10 by engagement score
              </p>
            </div>

            <div className="articles-list">
              {articles.map((article, index) => (
                <article key={article.id} className="article-card">
                  <div className="article-rank">#{index + 1}</div>
                  
                  <div className="article-content">
                    <div className="article-header">
                      <h3>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                      </h3>
                      <span className="article-source">{article.source}</span>
                    </div>

                    <div className="article-meta">
                      <span className="article-date">{formatDate(article.publishedAt)}</span>
                      <span className="article-link">
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          Read Full Article
                        </a>
                      </span>
                    </div>

                    <div className="article-excerpt">
                      <p>{truncateContent(article.content)}</p>
                    </div>

                    <div className="article-engagement">
                      <div className="engagement-score">
                        <span className="score-label">Engagement Score:</span>
                        <span className="score-value">{article.engagementScore.toFixed(1)}</span>
                      </div>

                      <div className="engagement-metrics">
                        {article.engagement.upvotes !== undefined && (
                          <span className="metric">
                            <span className="metric-icon">&#9650;</span>
                            {article.engagement.upvotes} upvotes
                          </span>
                        )}
                        {article.engagement.comments !== undefined && (
                          <span className="metric">
                            <span className="metric-icon">&#128172;</span>
                            {article.engagement.comments} comments
                          </span>
                        )}
                        {article.engagement.reactions !== undefined && (
                          <span className="metric">
                            <span className="metric-icon">&#10084;</span>
                            {article.engagement.reactions} reactions
                          </span>
                        )}
                        {article.engagement.views !== undefined && (
                          <span className="metric">
                            <span className="metric-icon">&#128065;</span>
                            {article.engagement.views} views
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="expand-button"
                      onClick={() => setExpandedArticle(
                        expandedArticle === article.id ? null : article.id
                      )}
                    >
                      {expandedArticle === article.id ? 'Hide Details' : 'Show Score Breakdown'}
                    </button>

                    {expandedArticle === article.id && (
                      <div className="score-breakdown">
                        <h4>Score Breakdown</h4>
                        <p className="breakdown-explanation">
                          {article.scoreBreakdown.explanation}
                        </p>
                        <div className="matched-keywords">
                          <strong>Matched Keywords:</strong>
                          <div className="keywords-list">
                            {article.matchedKeywords.map((keyword, i) => (
                              <span key={i} className="keyword-tag">{keyword}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!loading && articles.length === 0 && !error && (
          <section className="empty-state">
            <p>Click "Fetch Top Articles" to discover trending content about your selected topic.</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Data sourced from Hacker News, Reddit, and Dev.to. 
          Engagement metrics are fetched in real-time.
        </p>
      </footer>
    </div>
  );
}

export default App
