import {
  getSubject,
  getAllSubjects,
  addSubject,
  matchContent,
  isRelevantToSubject,
} from '../../subjects';
import { Subject } from '../../subjects/types';

describe('subjects', () => {
  describe('getSubject', () => {
    it('should return the agentic-ai subject', () => {
      const subject = getSubject('agentic-ai');

      expect(subject).toBeDefined();
      expect(subject?.id).toBe('agentic-ai');
      expect(subject?.name).toBe('Agentic AI');
    });

    it('should return undefined for non-existent subject', () => {
      const subject = getSubject('non-existent-subject');

      expect(subject).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const subject = getSubject('');

      expect(subject).toBeUndefined();
    });
  });

  describe('getAllSubjects', () => {
    it('should return an array of subjects', () => {
      const subjects = getAllSubjects();

      expect(Array.isArray(subjects)).toBe(true);
      expect(subjects.length).toBeGreaterThan(0);
    });

    it('should include the agentic-ai subject', () => {
      const subjects = getAllSubjects();
      const agenticAI = subjects.find(s => s.id === 'agentic-ai');

      expect(agenticAI).toBeDefined();
    });

    it('should return subjects with required properties', () => {
      const subjects = getAllSubjects();

      for (const subject of subjects) {
        expect(subject.id).toBeDefined();
        expect(subject.name).toBeDefined();
        expect(subject.description).toBeDefined();
        expect(Array.isArray(subject.keywords)).toBe(true);
        expect(Array.isArray(subject.relatedTerms)).toBe(true);
      }
    });
  });

  describe('addSubject', () => {
    it('should add a new subject', () => {
      const newSubject: Subject = {
        id: 'test-subject',
        name: 'Test Subject',
        description: 'A test subject for testing',
        keywords: ['test', 'testing'],
        relatedTerms: ['unit test', 'integration test'],
      };

      addSubject(newSubject);

      const retrieved = getSubject('test-subject');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Subject');
    });

    it('should overwrite existing subject with same id', () => {
      const subject1: Subject = {
        id: 'overwrite-test',
        name: 'Original Name',
        description: 'Original description',
        keywords: ['original'],
        relatedTerms: [],
      };

      const subject2: Subject = {
        id: 'overwrite-test',
        name: 'Updated Name',
        description: 'Updated description',
        keywords: ['updated'],
        relatedTerms: [],
      };

      addSubject(subject1);
      addSubject(subject2);

      const retrieved = getSubject('overwrite-test');
      expect(retrieved?.name).toBe('Updated Name');
    });
  });

  describe('matchContent', () => {
    it('should return null for non-existent subject', () => {
      const result = matchContent('some content', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null when no keywords match', () => {
      const result = matchContent('completely unrelated content about cooking', 'agentic-ai');

      expect(result).toBeNull();
    });

    it('should match primary keywords with 10 points each', () => {
      const result = matchContent('This article is about agentic ai systems', 'agentic-ai');

      expect(result).not.toBeNull();
      expect(result?.matchedKeywords).toContain('agentic ai');
      expect(result?.relevanceScore).toBeGreaterThanOrEqual(10);
    });

    it('should match related terms with 5 points each', () => {
      const result = matchContent('Building applications with langchain framework', 'agentic-ai');

      expect(result).not.toBeNull();
      expect(result?.matchedKeywords).toContain('langchain');
      expect(result?.relevanceScore).toBe(5);
    });

    it('should be case insensitive', () => {
      const result1 = matchContent('AGENTIC AI is the future', 'agentic-ai');
      const result2 = matchContent('agentic ai is the future', 'agentic-ai');

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1?.relevanceScore).toBe(result2?.relevanceScore);
    });

    it('should accumulate scores for multiple keyword matches', () => {
      const result = matchContent(
        'This article discusses agentic ai and ai agents with langchain',
        'agentic-ai'
      );

      expect(result).not.toBeNull();
      expect(result?.matchedKeywords.length).toBeGreaterThan(1);
      expect(result?.relevanceScore).toBeGreaterThan(10);
    });

    it('should include subjectId in the result', () => {
      const result = matchContent('Content about agentic ai', 'agentic-ai');

      expect(result?.subjectId).toBe('agentic-ai');
    });

    it('should match keywords in longer content', () => {
      const longContent = `
        This is a long article about various topics in technology.
        We will discuss how ai agents are transforming the industry.
        The future of autonomous systems looks promising.
      `;

      const result = matchContent(longContent, 'agentic-ai');

      expect(result).not.toBeNull();
      expect(result?.matchedKeywords).toContain('ai agents');
    });

    it('should handle empty content', () => {
      const result = matchContent('', 'agentic-ai');

      expect(result).toBeNull();
    });
  });

  describe('isRelevantToSubject', () => {
    it('should return true when title contains relevant keywords', () => {
      const result = isRelevantToSubject(
        'Building AI Agents with Modern Frameworks',
        '',
        'agentic-ai'
      );

      expect(result).toBe(true);
    });

    it('should return true when content contains relevant keywords', () => {
      const result = isRelevantToSubject(
        'Generic Title',
        'This article explores agentic ai systems',
        'agentic-ai'
      );

      expect(result).toBe(true);
    });

    it('should return true when both title and content contain keywords', () => {
      const result = isRelevantToSubject(
        'AI Agents Overview',
        'Deep dive into agentic ai',
        'agentic-ai'
      );

      expect(result).toBe(true);
    });

    it('should return false when neither title nor content match', () => {
      const result = isRelevantToSubject(
        'Cooking Recipes',
        'How to make pasta',
        'agentic-ai'
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent subject', () => {
      const result = isRelevantToSubject(
        'AI Agents',
        'Agentic AI content',
        'non-existent-subject'
      );

      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result1 = isRelevantToSubject('AGENTIC AI', '', 'agentic-ai');
      const result2 = isRelevantToSubject('agentic ai', '', 'agentic-ai');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle empty title and content', () => {
      const result = isRelevantToSubject('', '', 'agentic-ai');

      expect(result).toBe(false);
    });

    it('should match related terms', () => {
      const result = isRelevantToSubject(
        'Using LangChain for Development',
        '',
        'agentic-ai'
      );

      expect(result).toBe(true);
    });
  });
});
