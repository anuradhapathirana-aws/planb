/**
 * Splits a heading on its `**` emphasis markers. Even indexes are plain text,
 * odd indexes are the emphasised parts. `Highlight` and `TypingHeading` both
 * read markers through this, so the two can never disagree about them.
 */
export function splitHighlight(text: string): string[] {
  // Capturing group, so the delimited parts survive the split at odd indexes.
  return text.split(/\*\*(.+?)\*\*/g);
}
