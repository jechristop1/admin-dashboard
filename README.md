# Forward Assist HQ - AI Battle Buddy

A comprehensive AI-powered platform designed to assist veterans with VA claims, benefits navigation, and transition support. Built with React, TypeScript, Supabase, and OpenAI.

## 🎯 Overview

Forward Assist HQ provides veterans with an intelligent AI assistant that can:
- Analyze VA documents (C&P exams, rating decisions, DBQs)
- Answer questions about VA benefits and claims
- Provide personalized guidance based on uploaded documents
- Maintain conversation history and context
- Export chat transcripts for record-keeping

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Router** for navigation
- **Lucide React** for icons
- **React Markdown** for message formatting

### Backend
- **Supabase** for database, authentication, and storage
- **PostgreSQL** with pgvector extension for vector similarity search
- **Row Level Security (RLS)** for data protection
- **Edge Functions** for AI processing

### AI & ML
- **OpenAI GPT-4 Turbo** for chat responses
- **OpenAI text-embedding-3-small** for document embeddings
- **Vector similarity search** for document retrieval

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key

### Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd forward-assist-hq
npm install
```

2. **Create `.env` file:**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Enable the `vector` extension in SQL Editor:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
   - Run all migration files in order from `supabase/migrations/`
   - Add OpenAI API key to Edge Function secrets:
     ```bash
     supabase secrets set OPENAI_API_KEY=your_openai_api_key
     ```

4. **Deploy Edge Functions:**
```bash
supabase functions deploy chat
supabase functions deploy analyze-document
supabase functions deploy generate-title
supabase functions deploy train
```

5. **Start development server:**
```bash
npm run dev
```

## 📁 Project Structure

```
forward-assist-hq/
├── src/
│   ├── components/          # React components
│   │   ├── chat/           # Chat-related components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Reusable UI components
│   ├── pages/              # Page components
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── lib/                # Library configurations
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## 🗄️ Database Schema

### Core Tables

#### `users` (Supabase Auth)
- Managed by Supabase Auth
- Contains user authentication data

#### `chat_sessions`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to users)
- `title` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `messages`
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key to chat_sessions)
- `role` (text: 'user', 'assistant', 'system')
- `content` (text)
- `created_at` (timestamptz)

#### `user_documents`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to users)
- `file_name` (text)
- `file_path` (text)
- `file_size` (bigint)
- `mime_type` (text)
- `url` (text)
- `document_type` (text: 'c&p_exam', 'rating_decision', 'dbq', 'other')
- `status` (text: 'pending', 'processing', 'completed', 'error')
- `analysis` (text, nullable)
- `error_message` (text, nullable)
- `upload_date` (timestamptz)

#### `document_embeddings`
- `id` (uuid, primary key)
- `document_id` (uuid, foreign key to user_documents)
- `content` (text)
- `embedding` (vector(1536))
- `metadata` (jsonb)
- `created_at` (timestamptz)

#### `documents` (Knowledge Base)
- `id` (uuid, primary key)
- `title` (text)
- `content` (text)
- `embedding` (vector(1536))
- `metadata` (jsonb)
- `user_id` (uuid, nullable - null for global knowledge base)
- `created_at` (timestamptz)

## 🔐 Security

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data:

- **Chat sessions**: Users can CRUD their own sessions
- **Messages**: Users can access messages from their sessions
- **Documents**: Users can manage their own documents
- **Embeddings**: Users can read embeddings from their documents

### File Storage
- Files stored in Supabase Storage with user-specific folders
- Path structure: `{user_id}/{timestamp}-{filename}`
- Storage policies prevent cross-user access

### Authentication
- Supabase Auth with email/password
- JWT tokens for API authentication
- Admin access for knowledge base management

## 🤖 AI Features

### Document Analysis
1. **File Upload**: PDF, TXT, JSON files up to 10MB
2. **Text Extraction**: PDF.js for PDF parsing
3. **Chunking**: Smart text chunking for large documents
4. **Embedding Generation**: OpenAI embeddings for semantic search
5. **Analysis**: GPT-4 analysis with structured output

### Chat System
1. **Context-Aware**: Uses document embeddings for relevant context
2. **Streaming Responses**: Real-time response streaming
3. **Memory**: Maintains conversation history
4. **Export**: PDF and TXT export capabilities

### Vector Search
- HNSW indexing for fast similarity search
- Cosine similarity for document matching
- Configurable similarity thresholds

## 📡 API Reference

### Edge Functions

#### `/functions/v1/chat`
**POST** - Process chat messages with AI

**Request:**
```json
{
  "message": "string",
  "sessionId": "uuid",
  "messages": [
    {
      "role": "user|assistant|system",
      "content": "string"
    }
  ]
}
```

**Response:** Streaming text response

#### `/functions/v1/analyze-document`
**POST** - Analyze uploaded documents

**Request:**
```json
{
  "content": "string",
  "documentType": "c&p_exam|rating_decision|dbq|other",
  "userId": "uuid",
  "documentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "summary": "string"
}
```

#### `/functions/v1/generate-title`
**POST** - Generate chat session titles

**Request:**
```json
{
  "messages": [
    {
      "role": "user|assistant",
      "content": "string"
    }
  ]
}
```

**Response:**
```json
{
  "title": "string"
}
```

#### `/functions/v1/train`
**POST** - Add documents to knowledge base

**Request:**
```json
{
  "documents": [
    {
      "title": "string",
      "content": "string",
      "metadata": {},
      "user_id": "uuid"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": []
}
```

## 🎨 UI Components

### Core Components

#### `ChatInterface`
Main chat component with message display and input

#### `ChatMessage`
Individual message component with markdown rendering

#### `ChatInput`
Message input with file upload capability

#### `ChatHistory`
Sidebar component showing conversation history

#### `Layout`
Main layout wrapper with header and sidebar

#### `Sidebar`
Navigation sidebar with collapsible functionality

### UI Library

#### `Button`
Configurable button component with variants:
- `primary` - Main action button
- `secondary` - Secondary action button
- `outline` - Outlined button
- `ghost` - Minimal button
- `danger` - Destructive action button

#### `Avatar`
User/AI avatar component with fallback text

## 🔧 Configuration

### Tailwind CSS
Custom color palette:
- **Primary**: `#0A2463` (Navy blue)
- **Secondary**: `#FFBA08` (Gold)
- **Neutral**: `#5E6973` (Gray)

### TypeScript
Strict mode enabled with comprehensive type definitions

### Build Configuration
- Vite for fast development and building
- ESLint for code quality
- PostCSS for CSS processing

## 📱 Features

### Chat System
- Real-time messaging with AI
- Conversation history
- Message export (PDF/TXT)
- Streaming responses
- Markdown support

### Document Management
- File upload with validation
- Document analysis
- Vector search integration
- Status tracking
- Error handling

### User Management
- Secure authentication
- User-specific data isolation
- Admin panel for knowledge base

### Knowledge Base
- Global document repository
- Admin-only access
- Bulk document upload
- Vector indexing

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**
   - Set production Supabase URL and keys
   - Configure OpenAI API key in Supabase secrets

2. **Database**
   - Run all migrations
   - Set up RLS policies
   - Configure storage buckets

3. **Edge Functions**
   - Deploy all functions to production
   - Test function endpoints

4. **Build and Deploy**
   ```bash
   npm run build
   # Deploy dist/ folder to your hosting provider
   ```

### Hosting Options
- **Vercel** (Recommended for React apps)
- **Netlify**
- **AWS S3 + CloudFront**
- **Any static hosting provider**

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] User registration
- [ ] User login/logout
- [ ] Session persistence

#### Chat System
- [ ] Send messages
- [ ] Receive AI responses
- [ ] Conversation history
- [ ] Export functionality

#### Document Upload
- [ ] PDF upload and processing
- [ ] Text file upload
- [ ] Error handling for invalid files
- [ ] Document analysis

#### Admin Features
- [ ] Knowledge base access
- [ ] Document management
- [ ] User permissions

## 🐛 Troubleshooting

### Common Issues

#### "Missing environment variables"
- Ensure `.env` file exists with correct Supabase credentials
- Check variable names match exactly

#### "Failed to load documents"
- Verify RLS policies are correctly set up
- Check user authentication status
- Ensure database migrations have run

#### "OpenAI API errors"
- Verify API key is set in Supabase secrets
- Check API key has sufficient credits
- Ensure correct model names are used

#### "File upload failures"
- Check storage bucket policies
- Verify file size limits
- Ensure correct MIME types

### Debug Mode
Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test**
4. **Commit with descriptive messages**
5. **Push and create pull request**

### Code Standards
- Use TypeScript for all new code
- Follow existing component patterns
- Add proper error handling
- Include JSDoc comments for functions
- Use semantic commit messages

### Pull Request Guidelines
- Include description of changes
- Add screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

## 🗺️ Roadmap

### Planned Features
- [ ] Mobile app (React Native)
- [ ] Voice input/output
- [ ] Advanced document OCR
- [ ] Multi-language support
- [ ] Integration with VA.gov APIs
- [ ] Automated claim status tracking
- [ ] Calendar integration for appointments
- [ ] Notification system

### Technical Improvements
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics integration
- [ ] CDN optimization
- [ ] Database query optimization

---

**Forward Assist HQ** - Empowering veterans through AI-powered assistance.