/**
 * Utility class for HTML-related operations
 */
export class HtmlUtil {
  private static readonly HTML_ESCAPE_MAP: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /**
   * Escape HTML special characters to prevent XSS
   * @param text - The text to escape
   * @returns Escaped text safe for HTML rendering
   */
  static escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char) => this.HTML_ESCAPE_MAP[char]);
  }
}
