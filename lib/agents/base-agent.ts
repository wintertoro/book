import { Agent, AgentContext, AgentResult } from './types';

/**
 * Abstract base class for all agents
 * Provides common functionality and ensures consistent interface
 */
export abstract class BaseAgent implements Agent {
  abstract name: string;

  /**
   * Execute the agent's main logic
   */
  abstract execute(context: AgentContext, params: any): Promise<AgentResult<any>>;

  /**
   * Create a successful result
   */
  protected success<T>(data: T, metadata?: Record<string, any>): AgentResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create an error result
   */
  protected error(message: string, metadata?: Record<string, any>): AgentResult {
    return {
      success: false,
      error: message,
      metadata,
    };
  }

  /**
   * Validate context has required userId
   */
  protected validateContext(context: AgentContext): boolean {
    if (!context.userId) {
      return false;
    }
    return true;
  }

  /**
   * Log agent execution (can be extended for monitoring)
   */
  protected log(action: string, context: AgentContext, details?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] ${action}`, {
        userId: context.userId,
        ...details,
      });
    }
  }
}

