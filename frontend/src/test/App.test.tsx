import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import type { Subject, ArticlesResponse } from '../types';

const mockSubjects: Subject[] = [
  {
    id: 'agentic-ai',
    name: 'Agentic AI',
    description: 'AI agents that can act autonomously',
    keywords: ['ai agent', 'autonomous ai'],
    relatedTerms: ['langchain', 'autogpt'],
  },
  {
    id: 'web3',
    name: 'Web3',
    description: 'Decentralized web technologies',
    keywords: ['blockchain', 'crypto'],
    relatedTerms: ['ethereum', 'defi'],
  },
];

const mockArticlesResponse: ArticlesResponse = {
  subject: 'agentic-ai',
  totalFound: 25,
  returned: 2,
  scoringMethod: 'weighted',
  weights: {
    upvotes: 1,
    comments: 2,
    shares: 1.5,
    reactions: 0.8,
    views: 0.01,
  },
  articles: [
    {
      id: 'article-1',
      title: 'Building AI Agents with LangChain',
      url: 'https://example.com/article-1',
      content: 'This is a comprehensive guide to building AI agents using LangChain framework.',
      source: 'Hacker News',
      publishedAt: '2024-01-15T10:00:00Z',
      engagement: {
        upvotes: 500,
        comments: 120,
      },
      engagementScore: 740,
      scoreBreakdown: {
        upvotesContribution: 500,
        commentsContribution: 240,
        sharesContribution: 0,
        reactionsContribution: 0,
        viewsContribution: 0,
        totalScore: 740,
        explanation: '500 upvotes (x1) + 120 comments (x2) = 740',
      },
      matchedKeywords: ['ai agent', 'langchain'],
      relevanceScore: 15,
    },
    {
      id: 'article-2',
      title: 'AutoGPT: The Future of Autonomous AI',
      url: 'https://example.com/article-2',
      content: 'Exploring how AutoGPT is changing the landscape of autonomous AI systems.',
      source: 'Reddit',
      publishedAt: '2024-01-14T08:30:00Z',
      engagement: {
        upvotes: 300,
        comments: 80,
        reactions: 50,
      },
      engagementScore: 500,
      scoreBreakdown: {
        upvotesContribution: 300,
        commentsContribution: 160,
        sharesContribution: 0,
        reactionsContribution: 40,
        viewsContribution: 0,
        totalScore: 500,
        explanation: '300 upvotes (x1) + 80 comments (x2) + 50 reactions (x0.8) = 500',
      },
      matchedKeywords: ['autonomous ai', 'autogpt'],
      relevanceScore: 10,
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the header', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByText('Tech News Engagement Tracker')).toBeInTheDocument();
      expect(screen.getByText(/Discover trending articles/)).toBeInTheDocument();
    });

    it('should render the subject selector', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByLabelText('Select Topic:')).toBeInTheDocument();
    });

    it('should render the fetch button', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
    });

    it('should render the scoring info toggle button', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByRole('button', { name: 'Show Scoring Method' })).toBeInTheDocument();
    });

    it('should render empty state message initially', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByText(/Click "Fetch Top Articles"/)).toBeInTheDocument();
    });

    it('should fetch and display subjects on mount', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/subjects');
      });

      await waitFor(() => {
        const select = screen.getByLabelText('Select Topic:') as HTMLSelectElement;
        expect(select.options.length).toBe(2);
      });
    });
  });

  describe('Subject Selection', () => {
    it('should update selected subject when dropdown changes', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      await waitFor(() => {
        const select = screen.getByLabelText('Select Topic:') as HTMLSelectElement;
        expect(select.options.length).toBe(2);
      });

      const select = screen.getByLabelText('Select Topic:');
      fireEvent.change(select, { target: { value: 'web3' } });

      expect((select as HTMLSelectElement).value).toBe('web3');
    });
  });

  describe('Fetching Articles', () => {
    it('should show loading state when fetching articles', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockImplementationOnce(() => new Promise(() => {}));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      const fetchButton = screen.getByRole('button', { name: 'Fetch Top Articles' });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetching Articles...')).toBeInTheDocument();
      });
    });

    it('should display articles after successful fetch', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      const fetchButton = screen.getByRole('button', { name: 'Fetch Top Articles' });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      expect(screen.getByText('AutoGPT: The Future of Autonomous AI')).toBeInTheDocument();
    });

    it('should display article sources', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Hacker News')).toBeInTheDocument();
        expect(screen.getByText('Reddit')).toBeInTheDocument();
      });
    });

    it('should display engagement scores', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('740.0')).toBeInTheDocument();
        expect(screen.getByText('500.0')).toBeInTheDocument();
      });
    });

    it('should display total found count', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText(/Found 25 relevant articles/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to fetch articles/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Scoring Info Toggle', () => {
    it('should show scoring info when toggle is clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Show Scoring Method' }));

      expect(screen.getByText('How Engagement Scores Are Calculated')).toBeInTheDocument();
    });

    it('should hide scoring info when toggle is clicked again', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Show Scoring Method' }));
      expect(screen.getByText('How Engagement Scores Are Calculated')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Hide Scoring Method' }));
      expect(screen.queryByText('How Engagement Scores Are Calculated')).not.toBeInTheDocument();
    });

    it('should display scoring weights in the info section', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Show Scoring Method' }));

      expect(screen.getByText('Scoring Weights')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
    });
  });

  describe('Article Expansion', () => {
    it('should expand article to show score breakdown', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: 'Show Score Breakdown' });
      fireEvent.click(expandButtons[0]);

      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
      expect(screen.getByText('500 upvotes (x1) + 120 comments (x2) = 740')).toBeInTheDocument();
    });

    it('should show matched keywords when expanded', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: 'Show Score Breakdown' });
      fireEvent.click(expandButtons[0]);

      expect(screen.getByText('Matched Keywords:')).toBeInTheDocument();
      expect(screen.getByText('ai agent')).toBeInTheDocument();
      expect(screen.getByText('langchain')).toBeInTheDocument();
    });

    it('should collapse article when clicked again', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Agents with LangChain')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: 'Show Score Breakdown' });
      fireEvent.click(expandButtons[0]);

      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Hide Details' }));

      expect(screen.queryByText('Score Breakdown')).not.toBeInTheDocument();
    });
  });

  describe('Engagement Metrics Display', () => {
    it('should display upvotes when available', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('500 upvotes')).toBeInTheDocument();
        expect(screen.getByText('300 upvotes')).toBeInTheDocument();
      });
    });

    it('should display comments when available', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('120 comments')).toBeInTheDocument();
        expect(screen.getByText('80 comments')).toBeInTheDocument();
      });
    });

    it('should display reactions when available', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ subjects: mockSubjects }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockArticlesResponse),
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Fetch Top Articles' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Fetch Top Articles' }));

      await waitFor(() => {
        expect(screen.getByText('50 reactions')).toBeInTheDocument();
      });
    });
  });

  describe('Footer', () => {
    it('should render the footer with data source information', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subjects: mockSubjects }),
      });

      render(<App />);

      expect(screen.getByText(/Data sourced from Hacker News, Reddit, and Dev.to/)).toBeInTheDocument();
    });
  });
});
