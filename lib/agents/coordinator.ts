import type { Agent, AgentContext, AgentResult } from './types';
import { OCRAgent } from './ocr-agent';
import { BookManagementAgent } from './book-management-agent';
import { WishlistAgent } from './wishlist-agent';
import { ExportAgent } from './export-agent';
import { DeduplicationAgent } from './deduplication-agent';

/**
 * Agent Coordinator
 * Orchestrates agent interactions and provides a unified interface
 */
export class AgentCoordinator {
  private agents: Map<string, Agent>;

  constructor() {
    this.agents = new Map();
    this.registerAgents();
  }

  /**
   * Register all available agents
   */
  private registerAgents(): void {
    // Pass coordinator to agents that need it (for dependency injection)
    this.agents.set('ocr', new OCRAgent());
    this.agents.set('book', new BookManagementAgent(this));
    this.agents.set('wishlist', new WishlistAgent(this));
    this.agents.set('export', new ExportAgent());
    this.agents.set('deduplication', new DeduplicationAgent());
  }

  /**
   * Get an agent by name
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Execute an agent with context
   */
  async executeAgent<T = unknown>(
    agentName: string,
    context: AgentContext,
    params: unknown
  ): Promise<AgentResult<T>> {
    const agent = this.getAgent(agentName);
    if (!agent) {
      return {
        success: false,
        error: `Agent not found: ${agentName}`,
      };
    }

    try {
      const result = await agent.execute(context, params);
      return result as AgentResult<T>;
    } catch (error) {
      return {
        success: false,
        error: `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error },
      };
    }
  }

  /**
   * Create context from session
   * @throws Error if session is invalid or userId is missing
   */
  createContext(session: { user?: { id?: string } } | null | undefined): AgentContext {
    const userId = session?.user?.id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid session: userId is required');
    }
    return {
      userId,
      session,
    };
  }

  /**
   * Process image and extract book titles (orchestrates OCR + deduplication)
   */
  async processImage(
    context: AgentContext,
    imageBuffer: Buffer
  ): Promise<AgentResult<{ titles: string[]; rawText: string; author?: string }>> {
    // Step 1: Use OCR agent to extract text
    const ocrResult = await this.executeAgent<{ titles: string[]; rawText: string; author?: string; confidence?: number }>('ocr', context, { imageBuffer });

    if (!ocrResult.success || !ocrResult.data) {
      return ocrResult as AgentResult<{ titles: string[]; rawText: string; author?: string }>;
    }

    return this.success({
      titles: ocrResult.data.titles,
      rawText: ocrResult.data.rawText,
      author: ocrResult.data.author,
    });
  }

  /**
   * Add book with deduplication check (orchestrates book agent + deduplication)
   */
  async addBookWithDeduplication(
    context: AgentContext,
    title: string,
    sourceImage?: string,
    author?: string,
    ocrText?: string
  ): Promise<AgentResult<{ book: unknown; isDuplicate: boolean }>> {
    return this.executeAgent('book', context, {
      action: 'add',
      title,
      sourceImage,
      author,
      ocrText,
    });
  }

  /**
   * Helper method for success results
   */
  private success<T>(data: T, metadata?: Record<string, unknown>): AgentResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }
}

// Singleton instance
let coordinatorInstance: AgentCoordinator | null = null;

/**
 * Get the global agent coordinator instance
 */
export function getCoordinator(): AgentCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new AgentCoordinator();
  }
  return coordinatorInstance;
}

