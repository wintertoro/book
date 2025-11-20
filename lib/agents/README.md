# Agent Architecture

This application is built on a **multi-agent architecture** where specialized agents handle different domains of functionality. Each agent is responsible for a specific set of operations and can communicate with other agents through the coordinator.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Coordinator                     │
│              (Orchestrates all agents)                   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  OCR Agent   │  │ Book Agent  │  │Wishlist Agent│
│              │  │              │  │              │
│ - Extract    │  │ - Add        │  │ - Add        │
│   text       │  │ - Delete     │  │ - Delete     │
│ - Filter     │  │ - Get        │  │ - Move       │
│   titles     │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Deduplication │  │ Export Agent │  │  Base Agent  │
│    Agent     │  │              │  │   (Abstract) │
│              │  │ - CSV        │  │              │
│ - Check      │  │ - JSON       │  │ - Common     │
│   duplicates │  │              │  │   methods    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Agents

### 1. **OCR Agent** (`OCRAgent`)
**Purpose**: Handles image processing and text extraction

**Responsibilities**:
- Process images using Tesseract.js
- Extract text from book images
- Filter and clean OCR results to identify book titles
- Remove common OCR artifacts (page numbers, ISBNs, metadata)

**Usage**:
```typescript
const coordinator = getCoordinator();
const context = coordinator.createContext(session);
const result = await coordinator.processImage(context, imageBuffer);
```

### 2. **Book Management Agent** (`BookManagementAgent`)
**Purpose**: Manages library operations

**Responsibilities**:
- Add books to library
- Delete books from library
- Retrieve all books
- Coordinate with Deduplication Agent to prevent duplicates

**Usage**:
```typescript
const result = await coordinator.executeAgent('book', context, {
  action: 'get' | 'add' | 'delete',
  title?: string,
  id?: string,
  sourceImage?: string,
});
```

### 3. **Wishlist Agent** (`WishlistAgent`)
**Purpose**: Manages wishlist operations

**Responsibilities**:
- Add books to wishlist
- Delete books from wishlist
- Move books between library and wishlist
- Coordinate with Deduplication Agent

**Usage**:
```typescript
const result = await coordinator.executeAgent('wishlist', context, {
  action: 'get' | 'add' | 'delete' | 'move-to-library' | 'move-from-library',
  title?: string,
  id?: string,
});
```

### 4. **Export Agent** (`ExportAgent`)
**Purpose**: Handles data export in various formats

**Responsibilities**:
- Export books as CSV
- Export books as JSON
- Format data appropriately for each format

**Usage**:
```typescript
const result = await coordinator.executeAgent('export', context, {
  format: 'csv' | 'json',
});
```

### 5. **Deduplication Agent** (`DeduplicationAgent`)
**Purpose**: Intelligent duplicate detection

**Responsibilities**:
- Check if a book title is a duplicate
- Use fuzzy matching algorithms (Levenshtein distance)
- Word overlap detection
- Similarity scoring

**Usage**:
```typescript
const result = await coordinator.executeAgent('deduplication', context, {
  newTitle: string,
  existingBooks: Book[],
});
```

## Agent Coordinator

The `AgentCoordinator` is the central orchestrator that:
- Manages all agent instances
- Provides a unified interface for agent execution
- Creates agent contexts from user sessions
- Handles error propagation
- Provides convenience methods for common workflows

**Key Methods**:
- `executeAgent(agentName, context, params)` - Execute any agent
- `createContext(session)` - Create agent context from session
- `processImage(context, imageBuffer)` - Orchestrate OCR processing
- `addBookWithDeduplication(context, title, sourceImage)` - Add book with deduplication

## Agent Interface

All agents implement the `Agent` interface:

```typescript
interface Agent {
  name: string;
  execute<T = any>(context: AgentContext, params: any): Promise<AgentResult<T>>;
}
```

### Agent Context

Every agent receives a context containing:
- `userId`: The current user's ID
- `session`: The full session object
- `metadata`: Optional additional metadata

### Agent Result

All agents return a standardized result:

```typescript
interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}
```

## Base Agent

The `BaseAgent` abstract class provides:
- Common error handling
- Success/error result helpers
- Context validation
- Logging capabilities

All agents extend `BaseAgent` to ensure consistency.

## Benefits of Agent Architecture

1. **Separation of Concerns**: Each agent handles a specific domain
2. **Testability**: Agents can be tested independently
3. **Extensibility**: New agents can be easily added
4. **Maintainability**: Changes to one agent don't affect others
5. **Reusability**: Agents can be composed for complex workflows
6. **Monitoring**: Each agent can log its operations independently

## Adding a New Agent

1. Create a new class extending `BaseAgent`
2. Implement the `execute` method
3. Register the agent in `AgentCoordinator.registerAgents()`
4. Add appropriate types to `types.ts`
5. Export from `index.ts`

Example:
```typescript
export class NewAgent extends BaseAgent {
  name = 'NewAgent';
  
  async execute(context: AgentContext, params: any): Promise<AgentResult> {
    // Implementation
  }
}
```

## Error Handling

All agents follow a consistent error handling pattern:
- Return `AgentResult` with `success: false` on errors
- Include descriptive error messages
- Include error metadata for debugging
- Never throw exceptions (handled by coordinator)

## Logging

Agents log their operations in development mode:
- Agent name and action
- User ID
- Relevant parameters
- Success/failure status

## Future Enhancements

Potential new agents:
- **Recommendation Agent**: Suggest books based on library
- **Analytics Agent**: Track reading patterns
- **Sync Agent**: Sync with external services (Goodreads, etc.)
- **Notification Agent**: Send alerts for wishlist items
- **Search Agent**: Advanced search capabilities

