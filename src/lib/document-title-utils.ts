/**
 * Document Title Utilities
 * Functions to detect unintelligible filenames and generate readable titles
 */

/**
 * Detects if a filename needs to be renamed (is unintelligible)
 * Returns TRUE if:
 * - Title is majority numeric (>50% numbers)
 * - Title contains hashes or UUIDs
 * - Title has less than 3 readable characters
 * - Title contains only special characters and numbers
 * - Title follows patterns like: "doc_123456", "file-xyz-789", etc.
 */
export function needsRenaming(filename: string): boolean {
  // Remove file extension before analysis
  const cleanTitle = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  
  if (cleanTitle.length === 0) return true;
  
  // Calculate ratio of numeric characters
  const numericRatio = (cleanTitle.match(/\d/g) || []).length / cleanTitle.length;
  
  // Check for UUID pattern
  const hasUUID = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(cleanTitle);
  
  // Check for hash pattern (16+ hex chars)
  const hasHash = /^[a-f0-9]{16,}$/i.test(cleanTitle.replace(/[^a-z0-9]/gi, ''));
  
  // Count readable characters (letters and accented chars)
  const readableChars = cleanTitle.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  
  // Check for technical/generic filename patterns
  const technicalPattern = /^(doc|file|scan|img|pdf|download|document|arquivo|upload|temp|tmp|copy|copia)[-_]?[a-z0-9]+$/i.test(cleanTitle);
  
  // Check for patterns like "123_abc" or "abc-123-xyz"
  const mixedPattern = /^[a-z0-9]{1,3}[-_][a-z0-9]+[-_][a-z0-9]+$/i.test(cleanTitle);
  
  return (
    numericRatio > 0.5 || 
    hasUUID || 
    hasHash || 
    readableChars.length < 3 || 
    technicalPattern ||
    mixedPattern
  );
}

/**
 * Generates a concise title from a document summary
 * @param summary The AI-generated summary of the document
 * @returns A title (max 80 chars) extracted from the summary
 */
export function generateTitleFromSummary(summary: string): string {
  if (!summary || summary.trim().length === 0) {
    return '';
  }

  // Remove common introductory phrases in Portuguese
  let title = summary
    .replace(/^(este|o|a|os|as)\s+(documento|texto|artigo|livro|estudo|relatório|análise|manual|guia)\s*/i, '')
    .replace(/^(apresenta|explora|discute|aborda|descreve|trata|examina|analisa)\s*/i, '')
    .replace(/^(sobre|acerca de|a respeito de)\s*/i, '')
    .trim();
  
  // Get first sentence (up to period, exclamation, or question mark)
  const firstSentence = title.split(/[.!?]/)[0].trim();
  
  // If first sentence is too short, try to get more context
  if (firstSentence.length < 20 && title.length > firstSentence.length) {
    const secondSentence = title.split(/[.!?]/)[1]?.trim();
    if (secondSentence) {
      title = `${firstSentence}. ${secondSentence}`;
    } else {
      title = firstSentence;
    }
  } else {
    title = firstSentence;
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long (max 80 chars)
  if (title.length > 80) {
    // Try to break at a word boundary
    const truncated = title.substring(0, 77);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 50) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  
  return title || summary.substring(0, 80);
}

/**
 * Validates if a title is meaningful and readable
 * @param title The title to validate
 * @returns true if the title is meaningful
 */
export function isValidTitle(title: string): boolean {
  if (!title || title.trim().length < 5) return false;
  
  const readableChars = title.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  return readableChars.length >= 5;
}
