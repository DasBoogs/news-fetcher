import { describe, it, expect } from 'vitest';

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

describe('formatDate', () => {
  it('should return "Unknown date" for null input', () => {
    expect(formatDate(null)).toBe('Unknown date');
  });

  it('should format a valid date string correctly', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should handle ISO date strings', () => {
    const result = formatDate('2024-06-20T14:45:00.000Z');
    expect(result).toContain('Jun');
    expect(result).toContain('20');
    expect(result).toContain('2024');
  });

  it('should include time in the formatted output', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('truncateContent', () => {
  it('should return content unchanged if shorter than maxLength', () => {
    const content = 'Short content';
    expect(truncateContent(content)).toBe('Short content');
  });

  it('should return content unchanged if exactly at maxLength', () => {
    const content = 'a'.repeat(300);
    expect(truncateContent(content)).toBe(content);
  });

  it('should truncate content longer than maxLength and add ellipsis', () => {
    const content = 'a'.repeat(350);
    const result = truncateContent(content);
    expect(result.length).toBe(303);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should respect custom maxLength parameter', () => {
    const content = 'This is a test content that should be truncated';
    const result = truncateContent(content, 20);
    expect(result).toBe('This is a test conte...');
  });

  it('should handle empty string', () => {
    expect(truncateContent('')).toBe('');
  });

  it('should handle content with special characters', () => {
    const content = 'Content with émojis 🎉 and spëcial châràctérs!';
    expect(truncateContent(content)).toBe(content);
  });
});
