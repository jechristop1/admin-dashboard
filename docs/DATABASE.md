# Database Schema Documentation - Forward Assist HQ

This document provides a comprehensive overview of the database schema, including tables, relationships, indexes, and security policies.

## Overview

Forward Assist HQ uses PostgreSQL with the pgvector extension for vector similarity search. All tables implement Row Level Security (RLS) to ensure data isolation between users.

## Database Extensions

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## Core Tables

### Authentication Tables

#### `auth.users` (Managed by Supabase Auth)
Supabase manages user authentication automatically.

```sql
-- Supabase Auth schema (read-only)
auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  user_metadata jsonb,
  app_metadata jsonb
)
```

### Application Tables

#### `chat_sessions`
Stores chat conversation sessions for each user.

```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `messages`
Stores individual messages within chat sessions.

```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at DESC);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their sessions"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their sessions"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );
```

#### `user_documents`
Stores metadata for user-uploaded documents.

```sql
CREATE TABLE user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  url text NOT NULL,
  document_type text CHECK (document_type IN ('c&p_exam', 'rating_decision', 'dbq', 'other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  analysis text,
  error_message text,
  upload_date timestamptz DEFAULT now(),
  UNIQUE(user_id, file_path)
);

-- Indexes
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX idx_user_documents_status ON user_documents(status);
CREATE INDEX idx_user_documents_document_type ON user_documents(document_type);
CREATE INDEX idx_user_documents_upload_date ON user_documents(upload_date DESC);

-- RLS Policies
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON user_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON user_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON user_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON user_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `document_embeddings`
Stores vector embeddings for document chunks to enable semantic search.

```sql
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Vector similarity search index
CREATE INDEX document_embeddings_embedding_idx 
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Standard indexes
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);

-- RLS Policies
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read embeddings of their documents"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents
      WHERE user_documents.id = document_embeddings.document_id
      AND user_documents.user_id = auth.uid()
    )
  );
```

#### `documents` (Knowledge Base)
Global knowledge base documents accessible to all users.

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for global knowledge base
  created_at timestamptz DEFAULT now()
);

-- Vector similarity search index
CREATE INDEX documents_embedding_idx 
  ON documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Standard indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own and global documents"
  ON documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `document_chunks`
Chunked document content with embeddings for improved search performance.

```sql
CREATE TABLE document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  chunk_index integer NOT NULL,
  total_chunks integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX document_chunks_embedding_hnsw_idx 
  ON document_chunks 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Standard indexes
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- RLS Policies
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own document chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents
      WHERE user_documents.id = document_chunks.document_id
      AND user_documents.user_id = auth.uid()
    )
  );
```

#### `search_cache`
Caches search results to improve performance for repeated queries.

```sql
CREATE TABLE search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  embedding vector(1536),
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_search_cache_user_query ON search_cache(user_id, query);
CREATE INDEX idx_search_cache_created_at ON search_cache(created_at);

-- RLS Policies
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own search cache"
  ON search_cache FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## Database Functions

### Vector Search Functions

#### `match_document_chunks`
Searches user's document chunks using vector similarity.

```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count integer DEFAULT 5,
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
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN user_documents ud ON dc.document_id = ud.id
  WHERE 
    ud.user_id = p_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

#### `search_documents`
Searches global and user documents.

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count integer DEFAULT 5,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity,
    d.metadata
  FROM documents d
  WHERE 
    (d.user_id = p_user_id OR d.user_id IS NULL)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

## Storage Configuration

### Buckets

#### `uploads` Bucket
Stores user-uploaded documents with proper access controls.

```sql
-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Performance Optimization

### Indexing Strategy

1. **Primary Keys**: All tables use UUID primary keys with default generation
2. **Foreign Keys**: Indexed automatically by PostgreSQL
3. **Vector Indexes**: HNSW for document chunks, IVFFlat for knowledge base
4. **Composite Indexes**: For common query patterns
5. **Partial Indexes**: For filtered queries on status, document type, etc.

### Query Optimization

```sql
-- Analyze table statistics
ANALYZE chat_sessions;
ANALYZE messages;
ANALYZE user_documents;
ANALYZE document_embeddings;
ANALYZE document_chunks;
ANALYZE documents;

-- Monitor query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Security Considerations

### Row Level Security (RLS)

All tables implement RLS policies to ensure:
- Users can only access their own data
- Admin users can access global knowledge base
- Proper isolation between user sessions

### Data Encryption

- Data at rest: AES-256 encryption
- Data in transit: TLS 1.3
- Vector embeddings: Encrypted storage

### Access Control

```sql
-- Example: Restrict admin access to knowledge base
CREATE POLICY "Admin users can manage knowledge base"
  ON documents FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@forwardassisthq.com'
    AND user_id IS NULL
  );
```

## Backup and Recovery

### Automated Backups

Supabase provides automated daily backups. For additional protection:

```sql
-- Create manual backup
pg_dump -h your-host -U postgres -d your-database > backup.sql

-- Restore from backup
psql -h your-host -U postgres -d your-database < backup.sql
```

### Point-in-Time Recovery

Supabase supports point-in-time recovery for the last 7 days on paid plans.

## Monitoring and Maintenance

### Health Checks

```sql
-- Check database size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Maintenance Tasks

```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX INDEX CONCURRENTLY document_chunks_embedding_hnsw_idx;

-- Clean up old search cache entries
DELETE FROM search_cache 
WHERE created_at < NOW() - INTERVAL '7 days';
```

## Migration Management

### Migration Files

All schema changes are managed through migration files in `supabase/migrations/`:

1. **Initial Schema**: `20250605184001_rustic_portal.sql`
2. **Knowledge Base**: `20250605205609_silent_band.sql`
3. **File Storage**: `20250605215048_sparkling_tooth.sql`
4. **Document Embeddings**: `20250606061957_nameless_meadow.sql`

### Best Practices

1. **Never modify existing migrations**
2. **Always create new migration files for changes**
3. **Test migrations in development first**
4. **Include rollback scripts when possible**
5. **Document breaking changes**

---

This database schema provides a robust foundation for the Forward Assist HQ platform, ensuring data integrity, security, and performance at scale.