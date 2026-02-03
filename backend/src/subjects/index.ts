import { Subject, SubjectMatch } from './types';
import { agenticAISubject } from './agenticAI';

const subjects: Map<string, Subject> = new Map();

subjects.set(agenticAISubject.id, agenticAISubject);

export function getSubject(id: string): Subject | undefined {
  return subjects.get(id);
}

export function getAllSubjects(): Subject[] {
  return Array.from(subjects.values());
}

export function addSubject(subject: Subject): void {
  subjects.set(subject.id, subject);
}

export function matchContent(content: string, subjectId: string): SubjectMatch | null {
  const subject = subjects.get(subjectId);
  if (!subject) return null;

  const lowerContent = content.toLowerCase();
  const matchedKeywords: string[] = [];
  let relevanceScore = 0;

  for (const keyword of subject.keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      relevanceScore += 10;
    }
  }

  for (const term of subject.relatedTerms) {
    if (lowerContent.includes(term.toLowerCase())) {
      matchedKeywords.push(term);
      relevanceScore += 5;
    }
  }

  if (matchedKeywords.length === 0) return null;

  return {
    subjectId,
    matchedKeywords,
    relevanceScore,
  };
}

export function isRelevantToSubject(title: string, content: string, subjectId: string): boolean {
  const combinedText = `${title} ${content}`;
  const match = matchContent(combinedText, subjectId);
  return match !== null && match.relevanceScore > 0;
}

export { Subject, SubjectMatch } from './types';
