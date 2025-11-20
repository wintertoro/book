/**
 * Agent Architecture - Centralized Exports
 * 
 * This module exports all agents and the coordinator for easy access
 */

export { AgentCoordinator, getCoordinator } from './coordinator';
export { BaseAgent } from './base-agent';
export { OCRAgent } from './ocr-agent';
export { BookManagementAgent } from './book-management-agent';
export { WishlistAgent } from './wishlist-agent';
export { ExportAgent } from './export-agent';
export { DeduplicationAgent } from './deduplication-agent';
export type {
  Agent,
  AgentContext,
  AgentResult,
  OCRParams,
  OCRResult,
  AddBookParams,
  BookOperationResult,
  WishlistOperationParams,
  ExportParams,
  ExportResult,
  DeduplicationParams,
  DeduplicationResult,
} from './types';

