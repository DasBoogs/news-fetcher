export interface Subject {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  relatedTerms: string[];
}

export interface SubjectMatch {
  subjectId: string;
  matchedKeywords: string[];
  relevanceScore: number;
}
