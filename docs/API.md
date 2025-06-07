# API Documentation - Forward Assist HQ

This document provides comprehensive API documentation for Forward Assist HQ's Edge Functions and database operations.

## Overview

Forward Assist HQ uses Supabase Edge Functions for AI processing and server-side operations. All functions are deployed to Supabase and accessible via HTTP endpoints.

## Base URL

```
https://your-project-ref.supabase.co/functions/v1/
```

## Authentication

All API endpoints require authentication using Supabase JWT tokens:

```javascript
headers: {
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json'
}
```

## Edge Functions

### 1. Chat Function

**Endpoint:** `POST /functions/v1/chat`

Processes chat messages with AI and returns streaming responses.

#### Request

```typescript
interface ChatRequest {
  message: string;           // User's message
  sessionId: string;         // Chat session UUID
  messages: Array<{          // Conversation history
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

#### Example Request

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: "Help me understand my C&P exam results",
    sessionId: "123e4567-e89b-12d3-a456-426614174000",
    messages: [
      {
        role: "user",
        content: "I just uploaded my C&P exam report"
      }
    ]
  })
});

// Handle streaming response
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk); // Process streaming content
}
```

#### Response

- **Content-Type:** `text/plain`
- **Transfer-Encoding:** `chunked`
- **Body:** Streaming text response from AI

#### Features

- **Context-aware responses** using document embeddings
- **Streaming output** for real-time user experience
- **Document integration** with uploaded files
- **Conversation memory** maintains context across messages

#### Error Responses

```json
{
  "error": "An error occurred while processing your request.",
  "details": "Specific error message"
}
```

---

### 2. Document Analysis Function

**Endpoint:** `POST /functions/v1/analyze-document`

Analyzes uploaded documents and generates structured summaries.

#### Request

```typescript
interface AnalyzeDocumentRequest {
  content: string;           // Extracted document text
  documentType: 'c&p_exam' | 'rating_decision' | 'dbq' | 'other';
  userId: string;            // User UUID
  documentId: string;        // Document UUID
}
```

#### Example Request

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: "COMPENSATION AND PENSION EXAMINATION...",
    documentType: "c&p_exam",
    userId: "user-uuid",
    documentId: "doc-uuid"
  })
});

const result = await response.json();
```

#### Response

```typescript
interface AnalyzeDocumentResponse {
  success: boolean;
  summary: string;           // Markdown-formatted analysis
}
```

#### Example Response

```json
{
  "success": true,
  "summary": "# C&P Examination Analysis\n\n## Key Findings\n- Veteran examined for PTSD claim\n- Current symptoms documented\n\n## Important Dates\n- Examination Date: March 15, 2024\n- Next Review: March 15, 2025\n\n## Required Actions\n1. Submit additional medical records\n2. Schedule follow-up appointment"
}
```

#### Processing Steps

1. **Text Chunking:** Splits large documents into manageable chunks
2. **Embedding Generation:** Creates vector embeddings for semantic search
3. **Chunk Analysis:** Analyzes each chunk for key information
4. **Summary Generation:** Combines analyses into comprehensive summary
5. **Database Storage:** Saves embeddings and analysis results

---

### 3. Title Generation Function

**Endpoint:** `POST /functions/v1/generate-title`

Generates descriptive titles for chat sessions based on conversation content.

#### Request

```typescript
interface GenerateTitleRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

#### Example Request

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/generate-title`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "How do I file a PTSD claim?"
      },
      {
        role: "assistant",
        content: "To file a PTSD claim, you'll need..."
      }
    ]
  })
});

const result = await response.json();
```

#### Response

```typescript
interface GenerateTitleResponse {
  title: string;             // Generated title (max 6 words)
}
```

#### Example Response

```json
{
  "title": "PTSD Claim Filing Process"
}
```

---

### 4. Knowledge Base Training Function

**Endpoint:** `POST /functions/v1/train`

Adds documents to the global knowledge base with vector embeddings.

#### Request

```typescript
interface TrainRequest {
  documents: Array<{
    title: string;           // Document title
    content: string;         // Document content
    metadata: object;        // Additional metadata
    user_id: string | null;  // null for global knowledge base
  }>;
}
```

#### Example Request

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/train`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    documents: [
      {
        title: "VA Disability Benefits Overview",
        content: "VA disability compensation offers monthly benefits...",
        metadata: {
          source: "VA.gov",
          category: "Benefits",
          type: "Overview"
        },
        user_id: null  // Global knowledge base
      }
    ]
  })
});

const result = await response.json();
```

#### Response

```typescript
interface TrainResponse {
  success: boolean;
  results: Array<{
    id: string;
    title: string;
  }>;
}
```

#### Processing Steps

1. **Text Chunking:** Splits documents into optimal chunks
2. **Embedding Generation:** Creates vector embeddings
3. **Database Storage:** Stores chunks with embeddings
4. **Indexing:** Updates vector search indexes

---

## Database Functions

### Vector Search Functions

#### `match_document_chunks`

Searches user's document chunks using vector similarity.

```sql
SELECT * FROM match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count integer DEFAULT 5,
  p_user_id uuid
);
```

#### `search_documents`

Searches global and user documents.

```sql
SELECT * FROM search_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count integer DEFAULT 5,
  p_user_id uuid
);
```

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: string;             // Human-readable error message
  details?: string;          // Technical details (development only)
  code?: string;            // Error code for programmatic handling
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `MISSING_PARAMS` | Required parameters missing | Check request payload |
| `INVALID_FILE` | File validation failed | Verify file format and size |
| `OPENAI_ERROR` | OpenAI API error | Check API key and credits |
| `DATABASE_ERROR` | Database operation failed | Check RLS policies and permissions |
| `EMBEDDING_ERROR` | Vector embedding generation failed | Retry request or check content |

### Error Examples

```json
{
  "error": "File validation failed",
  "details": "File size exceeds 10MB limit",
  "code": "INVALID_FILE"
}
```

```json
{
  "error": "OpenAI API error",
  "details": "Insufficient API credits",
  "code": "OPENAI_ERROR"
}
```

## Rate Limits

### OpenAI API Limits
- **GPT-4 Turbo:** 500 requests/minute
- **Embeddings:** 3000 requests/minute
- **Token limits:** 128k tokens per request

### Supabase Limits
- **Edge Functions:** 500,000 invocations/month (free tier)
- **Database:** 500MB storage (free tier)
- **Storage:** 1GB files (free tier)

## Best Practices

### Request Optimization

1. **Batch Operations:** Group multiple operations when possible
2. **Caching:** Implement client-side caching for repeated requests
3. **Error Handling:** Always handle errors gracefully
4. **Timeouts:** Set appropriate request timeouts

### Security

1. **Authentication:** Always include valid JWT tokens
2. **Input Validation:** Validate all input data
3. **Rate Limiting:** Implement client-side rate limiting
4. **Error Messages:** Don't expose sensitive information

### Performance

1. **Streaming:** Use streaming responses for long operations
2. **Chunking:** Process large documents in chunks
3. **Indexing:** Ensure proper database indexing
4. **Monitoring:** Monitor function performance and errors

## SDK Examples

### JavaScript/TypeScript

```typescript
class ForwardAssistAPI {
  constructor(
    private supabaseUrl: string,
    private supabaseKey: string
  ) {}

  async sendMessage(message: string, sessionId: string, messages: Message[]) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId, messages }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.body;
  }

  async analyzeDocument(content: string, documentType: string, userId: string, documentId: string) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/analyze-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, documentType, userId, documentId }),
    });

    if (!response.ok) {
      throw new Error(`Analysis Error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### React Hook

```typescript
import { useState, useCallback } from 'react';

export function useForwardAssistAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string, sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId, messages: [] }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.body;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
}
```

## Testing

### Function Testing

```javascript
// Test chat function
const testChat = async () => {
  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: "Hello, AI Battle Buddy!",
      sessionId: "test-session-id",
      messages: []
    })
  });

  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log('Chunk:', decoder.decode(value));
  }
};
```

### Error Testing

```javascript
// Test error handling
const testError = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer invalid-key`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('Error response:', error);
    }
  } catch (err) {
    console.log('Network error:', err);
  }
};
```

---

This API documentation provides comprehensive coverage of all Forward Assist HQ endpoints and their usage patterns. For additional support, refer to the main README or create an issue in the repository.