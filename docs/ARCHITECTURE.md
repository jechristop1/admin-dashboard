# Architecture Documentation - Forward Assist HQ

This document provides a comprehensive overview of the Forward Assist HQ system architecture, including technical decisions, data flow, and infrastructure components.

## System Overview

Forward Assist HQ is a modern web application built with a serverless architecture, designed to provide AI-powered assistance to veterans navigating VA benefits and claims processes.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   OpenAI API    │
│   (React SPA)   │◄──►│   (Backend)     │◄──►│   (AI Services) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Static  │             │Database │             │ GPT-4   │
    │Hosting  │             │Storage  │             │Embedding│
    │(CDN)    │             │Auth     │             │Models   │
    └─────────┘             │Functions│             └─────────┘
                            └─────────┘
```

## Frontend Architecture

### Technology Stack

- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing

### Component Architecture

```
src/
├── components/
│   ├── chat/              # Chat-specific components
│   │   ├── ChatInterface  # Main chat container
│   │   ├── ChatMessage    # Individual message display
│   │   ├── ChatInput      # Message input with file upload
│   │   └── ChatHistory    # Conversation history sidebar
│   ├── layout/            # Layout components
│   │   ├── Layout         # Main layout wrapper
│   │   ├── Header         # Application header
│   │   └── Sidebar        # Navigation sidebar
│   └── ui/                # Reusable UI components
│       ├── Button         # Configurable button component
│       └── Avatar         # User/AI avatar component
├── pages/                 # Page-level components
│   ├── Chat               # Main chat page
│   ├── Documents          # Document management page
│   ├── KnowledgeBase      # Admin knowledge base page
│   └── Login              # Authentication page
├── store/                 # State management
│   ├── authStore          # Authentication state
│   └── chatStore          # Chat state and operations
├── types/                 # TypeScript definitions
├── utils/                 # Utility functions
└── lib/                   # Library configurations
```

### State Management

#### Zustand Stores

**AuthStore**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}
```

**ChatStore**
```typescript
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentSessionId: string | null;
  addMessage: (message: Message) => Promise<void>;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string>;
}
```

### Data Flow

1. **User Interaction**: User types message or uploads document
2. **State Update**: Zustand store updates local state
3. **API Call**: Frontend calls Supabase Edge Function
4. **Streaming Response**: Real-time response streaming from AI
5. **State Sync**: Local state updated with response
6. **Database Persistence**: Message saved to Supabase

## Backend Architecture

### Supabase Infrastructure

Supabase provides a complete backend-as-a-service solution:

- **PostgreSQL Database**: Primary data storage with extensions
- **Authentication**: JWT-based user authentication
- **Storage**: File storage with CDN
- **Edge Functions**: Serverless compute for AI processing
- **Real-time**: WebSocket connections for live updates

### Database Schema

#### Core Tables

```sql
-- User authentication (managed by Supabase Auth)
auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  encrypted_password text,
  created_at timestamptz,
  updated_at timestamptz
)

-- Chat sessions
chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Chat messages
messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id),
  role text CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- User documents
user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  url text NOT NULL,
  document_type text CHECK (document_type IN ('c&p_exam', 'rating_decision', 'dbq', 'other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  analysis text,
  error_message text,
  upload_date timestamptz DEFAULT now()
)

-- Document embeddings for vector search
document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES user_documents(id),
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

-- Global knowledge base
documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id), -- NULL for global knowledge
  created_at timestamptz DEFAULT now()
)
```

#### Vector Search Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for fast similarity search
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Search function
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count integer,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content,
    1 - (de.embedding <=> query_embedding) as similarity
  FROM document_embeddings de
  JOIN user_documents ud ON de.document_id = ud.id
  WHERE 
    ud.user_id = p_user_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

### Row Level Security (RLS)

All tables implement RLS policies to ensure data isolation:

```sql
-- Example: Chat sessions policy
CREATE POLICY "Users can view own chat sessions"
ON chat_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Example: Messages policy
CREATE POLICY "Users can view messages in their sessions"
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);
```

## Edge Functions Architecture

### Function Overview

Edge Functions provide serverless compute for AI operations:

1. **chat**: Main AI conversation handler
2. **analyze-document**: Document processing and analysis
3. **generate-title**: Chat session title generation
4. **train**: Knowledge base document ingestion

### Chat Function Architecture

```typescript
// Simplified chat function flow
export default async function handler(req: Request) {
  // 1. Authentication & validation
  const { message, sessionId, messages } = await req.json();
  
  // 2. Context retrieval
  const relevantChunks = await searchDocumentChunks(message, userId);
  const userDocs = await getUserDocuments(userId);
  
  // 3. Context preparation
  const context = buildContext(relevantChunks, userDocs);
  
  // 4. AI processing
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [systemMessage, ...messages, userMessage],
    stream: true
  });
  
  // 5. Streaming response
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain' }
  });
}
```

### Document Analysis Pipeline

```typescript
// Document analysis workflow
async function analyzeDocument(content: string, documentType: string) {
  // 1. Text chunking
  const chunks = chunkText(content, MAX_TOKENS_PER_CHUNK);
  
  // 2. Parallel processing
  const chunkResults = await Promise.all(
    chunks.map(async (chunk, index) => {
      // Generate embedding
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk
      });
      
      // Store in database
      await supabase.from('document_embeddings').insert({
        document_id: documentId,
        content: chunk,
        embedding: embedding.data[0].embedding
      });
      
      // Analyze chunk
      const analysis = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [systemPrompt, { role: 'user', content: chunk }]
      });
      
      return analysis.choices[0].message.content;
    })
  );
  
  // 3. Generate final summary
  const summary = await generateSummary(chunkResults);
  
  return summary;
}
```

## AI Integration Architecture

### OpenAI Services

**Models Used:**
- **GPT-4 Turbo Preview**: Main chat responses and document analysis
- **text-embedding-3-small**: Vector embeddings for semantic search

**Token Management:**
- Input token limits: 128k tokens for GPT-4 Turbo
- Output token limits: 4k tokens per response
- Embedding dimensions: 1536 dimensions

### Vector Search Implementation

```typescript
// Semantic search workflow
async function semanticSearch(query: string, userId: string) {
  // 1. Generate query embedding
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  
  // 2. Search similar documents
  const results = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding.data[0].embedding,
    match_threshold: 0.78,
    match_count: 5,
    p_user_id: userId
  });
  
  // 3. Return relevant context
  return results.data;
}
```

### Context Building

```typescript
// Context preparation for AI responses
function buildContext(chunks: DocumentChunk[], documents: UserDocument[]) {
  let context = '';
  
  // Add relevant document sections
  if (chunks.length > 0) {
    context += "Relevant document sections:\n\n";
    context += chunks.map(chunk => chunk.content).join('\n\n');
    context += '\n\n';
  }
  
  // Add document analyses
  if (documents.length > 0) {
    context += "Document analyses:\n\n";
    context += documents
      .filter(doc => doc.analysis)
      .map(doc => `${doc.file_name}:\n${doc.analysis}`)
      .join('\n\n');
  }
  
  return context;
}
```

## Security Architecture

### Authentication Flow

```
1. User Login Request
   ↓
2. Supabase Auth Validation
   ↓
3. JWT Token Generation
   ↓
4. Client Token Storage
   ↓
5. API Request with Token
   ↓
6. Token Validation
   ↓
7. RLS Policy Enforcement
   ↓
8. Data Access Granted
```

### Data Protection

**Encryption:**
- Data at rest: AES-256 encryption
- Data in transit: TLS 1.3
- JWT tokens: RS256 signing

**Access Control:**
- Row Level Security on all tables
- User-specific data isolation
- Admin role separation

**File Security:**
- User-specific storage folders
- Signed URLs for file access
- Automatic file cleanup

### API Security

```typescript
// Security middleware example
async function validateRequest(req: Request) {
  // 1. Extract JWT token
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  
  // 2. Validate token
  const { data: user, error } = await supabase.auth.getUser(token);
  if (error) throw new Error('Unauthorized');
  
  // 3. Rate limiting
  if (!checkRateLimit(user.id)) {
    throw new Error('Rate limit exceeded');
  }
  
  // 4. Input validation
  const body = await req.json();
  validateInput(body);
  
  return { user, body };
}
```

## Performance Architecture

### Frontend Optimization

**Code Splitting:**
```typescript
// Lazy loading for better performance
const Documents = lazy(() => import('./pages/Documents'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));

// Route-based code splitting
<Route path="/documents" element={
  <Suspense fallback={<Loading />}>
    <Documents />
  </Suspense>
} />
```

**Caching Strategy:**
- Browser cache for static assets
- Service worker for offline capability
- Local storage for user preferences
- Memory cache for API responses

### Backend Optimization

**Database Indexing:**
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_messages_session_created 
ON messages(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_documents_user_status 
ON user_documents(user_id, status);

CREATE INDEX CONCURRENTLY idx_embeddings_similarity 
ON document_embeddings USING hnsw (embedding vector_cosine_ops);
```

**Query Optimization:**
- Prepared statements for common queries
- Connection pooling
- Query result caching
- Batch operations for bulk inserts

### Edge Function Performance

**Cold Start Mitigation:**
- Keep functions warm with periodic pings
- Optimize import statements
- Minimize function size

**Streaming Responses:**
```typescript
// Streaming for better perceived performance
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        controller.enqueue(encoder.encode(content));
      }
    }
    controller.close();
  }
});
```

## Monitoring and Observability

### Logging Strategy

**Frontend Logging:**
```typescript
// Structured logging
const logger = {
  info: (message: string, data?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
};
```

**Backend Logging:**
```typescript
// Edge function logging
console.log(JSON.stringify({
  function: 'chat',
  userId: user.id,
  sessionId: sessionId,
  messageLength: message.length,
  timestamp: new Date().toISOString()
}));
```

### Metrics Collection

**Performance Metrics:**
- Response times
- Error rates
- Function execution duration
- Database query performance

**Business Metrics:**
- User engagement
- Document upload success rate
- Chat completion rate
- Feature usage analytics

### Health Checks

```typescript
// System health monitoring
async function healthCheck() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    openai: await checkOpenAI(),
    functions: await checkFunctions()
  };
  
  const healthy = Object.values(checks).every(check => check.status === 'ok');
  
  return {
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
}
```

## Scalability Considerations

### Horizontal Scaling

**Frontend:**
- CDN distribution
- Multiple deployment regions
- Load balancing

**Backend:**
- Supabase auto-scaling
- Connection pooling
- Read replicas for queries

### Vertical Scaling

**Database:**
- Compute instance upgrades
- Storage expansion
- Memory optimization

**Functions:**
- Memory allocation tuning
- Timeout optimization
- Concurrency limits

### Data Scaling

**Vector Search:**
- Index optimization
- Partitioning strategies
- Approximate search algorithms

**File Storage:**
- CDN integration
- Compression strategies
- Lifecycle policies

## Deployment Architecture

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Infrastructure as Code

```typescript
// Supabase configuration
const supabaseConfig = {
  database: {
    extensions: ['vector', 'pg_stat_statements'],
    settings: {
      shared_preload_libraries: 'pg_stat_statements',
      max_connections: 100,
      shared_buffers: '256MB'
    }
  },
  storage: {
    buckets: [
      {
        name: 'uploads',
        public: true,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['application/pdf', 'text/plain', 'application/json']
      }
    ]
  },
  functions: [
    { name: 'chat', memory: 512 },
    { name: 'analyze-document', memory: 1024 },
    { name: 'generate-title', memory: 256 },
    { name: 'train', memory: 512 }
  ]
};
```

## Future Architecture Considerations

### Planned Enhancements

**Multi-tenancy:**
- Organization-level data isolation
- Shared knowledge bases
- Role-based access control

**Real-time Collaboration:**
- Shared chat sessions
- Live document annotation
- Team workspaces

**Advanced AI Features:**
- Voice input/output
- Image analysis
- Predictive analytics

**Mobile Architecture:**
- React Native app
- Offline synchronization
- Push notifications

### Technology Evolution

**Database:**
- Consider PostgreSQL 16 features
- Evaluate vector database alternatives
- Implement time-series data for analytics

**AI/ML:**
- Fine-tuned models for VA-specific content
- Local model deployment for privacy
- Multi-modal AI capabilities

**Infrastructure:**
- Edge computing for reduced latency
- Kubernetes for container orchestration
- Microservices architecture

---

This architecture documentation provides a comprehensive view of the Forward Assist HQ system design, enabling developers to understand, maintain, and extend the platform effectively.