# Forward Assist HQ - Complete Documentation

Welcome to Forward Assist HQ, an AI-powered platform designed to assist veterans with VA claims, benefits navigation, and transition support.

## 📚 Documentation Index

### Getting Started
- [Setup Guide](./SETUP.md) - Complete installation and configuration
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [User Guide](./USER_GUIDE.md) - End-user documentation

### Technical Documentation
- [Architecture Overview](./ARCHITECTURE.md) - System design and technical decisions
- [API Documentation](./API.md) - Edge Functions and database operations
- [Database Schema](./DATABASE.md) - Complete database structure

### Development
- [Contributing Guide](./CONTRIBUTING.md) - Development workflow and standards
- [Testing Guide](./TESTING.md) - Testing strategies and procedures
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## 🚀 Quick Start

1. **Prerequisites**
   - Node.js 18+
   - Supabase account
   - OpenAI API key

2. **Installation**
   ```bash
   git clone <repository-url>
   cd forward-assist-hq
   npm install
   ```

3. **Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Database Setup**
   - Run all migration files in `supabase/migrations/`
   - Deploy Edge Functions

5. **Start Development**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
forward-assist-hq/
├── docs/                   # Documentation
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── store/             # State management
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## 🔧 Key Features

- **AI Battle Buddy**: GPT-4 powered virtual VSO
- **Document Analysis**: Automated C&P exam and rating decision analysis
- **Vector Search**: Semantic document search using embeddings
- **Real-time Chat**: Streaming responses with conversation history
- **File Management**: Secure document upload and storage
- **Export Options**: PDF and TXT transcript downloads

## 🛡️ Security

- Row Level Security (RLS) on all database tables
- JWT-based authentication
- Encrypted file storage
- Input validation and sanitization
- CORS protection

## 📊 Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- OpenAI GPT-4 Turbo and Embeddings
- Edge Functions for serverless compute
- pgvector for similarity search

## 📈 Performance

- Streaming AI responses for real-time interaction
- Vector similarity search with HNSW indexing
- Optimized database queries with proper indexing
- Code splitting and lazy loading
- CDN-ready static assets

## 🔗 Links

- [Live Demo](https://your-demo-url.com)
- [API Documentation](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [User Manual](./USER_GUIDE.md)

## 📞 Support

For technical support:
- Review the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Check [GitHub Issues](https://github.com/your-org/forward-assist-hq/issues)
- Contact: support@forwardassisthq.com

---

**Forward Assist HQ** - Empowering veterans through AI-powered assistance.