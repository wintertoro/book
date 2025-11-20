import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, ExportParams, ExportResult } from './types';
import { getAllBooks } from '@/lib/storage';

/**
 * Export Agent
 * Handles data export in various formats (CSV, JSON)
 */
export class ExportAgent extends BaseAgent {
  name = 'ExportAgent';

  async execute(
    context: AgentContext,
    params: ExportParams
  ): Promise<AgentResult<any>> {
    this.log('exporting', context, { format: params.format });

    if (!this.validateContext(context)) {
      return this.error('Invalid context: userId required');
    }

    try {
      const books = await getAllBooks(context.userId);

      switch (params.format) {
        case 'csv':
          return this.exportCSV(books);
        case 'json':
          return this.exportJSON(books);
        default:
          return this.error(`Unsupported export format: ${params.format}`);
      }
    } catch (error) {
      return this.error(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Export books as CSV
   */
  private exportCSV(books: any[]): AgentResult<ExportResult> {
    const headers = ['Title', 'Added Date'];
    const rows = books.map(book => [
      `"${book.title.replace(/"/g, '""')}"`,
      new Date(book.addedAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return this.success({
      content: csv,
      mimeType: 'text/csv',
      filename: 'book-library.csv',
    });
  }

  /**
   * Export books as JSON
   */
  private exportJSON(books: any[]): AgentResult<ExportResult> {
    return this.success({
      content: { books },
      mimeType: 'application/json',
      filename: 'book-library.json',
    });
  }
}

