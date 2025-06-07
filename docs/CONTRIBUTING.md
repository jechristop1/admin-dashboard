# Contributing Guide - Forward Assist HQ

Thank you for your interest in contributing to Forward Assist HQ! This guide will help you get started with development and ensure your contributions align with our standards.

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- **Supabase account** for backend services
- **OpenAI API key** for AI functionality
- **Code editor** (VS Code recommended)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/forward-assist-hq.git
   cd forward-assist-hq
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your development credentials
   ```

4. **Database Setup**
   - Create a Supabase project
   - Run all migration files in order
   - Deploy Edge Functions

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Branch Strategy

We use a feature branch workflow:

```
main (production)
├── develop (integration)
├── feature/user-authentication
├── feature/document-analysis
├── bugfix/chat-loading-state
└── hotfix/security-patch
```

### Creating a Feature

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add document analysis pipeline"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## 🎯 Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types and interfaces
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ✅ Good: Proper error handling
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// ❌ Bad: Any types and poor error handling
async function fetchData(id: any): Promise<any> {
  const data = await supabase.from('users').select('*').eq('id', id);
  return data.data;
}
```

### React Component Guidelines

```typescript
// ✅ Good: Functional component with proper typing
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  onClick,
  children,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

// ❌ Bad: No types, unclear props
const Button = ({ variant, size, loading, click, children }) => {
  return (
    <button onClick={click}>
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

### CSS/Tailwind Guidelines

```typescript
// ✅ Good: Semantic class organization
const ChatMessage = () => (
  <div className="
    flex gap-4 p-6
    bg-white border-b border-gray-200
    hover:bg-gray-50 transition-colors
  ">
    <Avatar className="flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <MessageContent />
    </div>
  </div>
);

// ❌ Bad: Unorganized classes
const ChatMessage = () => (
  <div className="flex gap-4 p-6 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
    {/* content */}
  </div>
);
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// Example test structure
describe('ChatStore', () => {
  beforeEach(() => {
    // Reset store state
  });

  it('should add message to store', () => {
    const message: Message = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    };

    useChatStore.getState().addMessage(message);
    
    expect(useChatStore.getState().messages).toContain(message);
  });

  it('should handle loading state', () => {
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Example API test
describe('Chat API', () => {
  it('should process chat message', async () => {
    const response = await fetch('/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'test-session',
        messages: [],
      }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/plain');
  });
});
```

## 📁 File Organization

### Component Structure

```
src/components/
├── chat/
│   ├── ChatInterface.tsx      # Main chat container
│   ├── ChatMessage.tsx        # Individual message
│   ├── ChatInput.tsx          # Message input
│   └── ChatHistory.tsx        # Conversation history
├── layout/
│   ├── Layout.tsx             # Main layout wrapper
│   ├── Header.tsx             # Application header
│   └── Sidebar.tsx            # Navigation sidebar
└── ui/
    ├── Button.tsx             # Reusable button
    ├── Avatar.tsx             # User/AI avatar
    └── index.ts               # Export barrel
```

### File Naming Conventions

- **Components**: PascalCase (`ChatInterface.tsx`)
- **Utilities**: camelCase (`exportUtils.ts`)
- **Types**: camelCase (`index.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

## 🔧 Database Migrations

### Creating Migrations

1. **Generate Migration File**
   ```bash
   # Use descriptive names
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_user_preferences.sql
   ```

2. **Migration Structure**
   ```sql
   /*
     # Add User Preferences Table
     
     1. New Tables
       - `user_preferences`
         - `id` (uuid, primary key)
         - `user_id` (uuid, foreign key)
         - `preferences` (jsonb)
     
     2. Security
       - Enable RLS on `user_preferences` table
       - Add policy for users to manage own preferences
   */

   CREATE TABLE IF NOT EXISTS user_preferences (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     preferences jsonb DEFAULT '{}',
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );

   ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can manage own preferences"
     ON user_preferences FOR ALL
     TO authenticated
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   ```

3. **Test Migration**
   ```bash
   # Test in development first
   supabase db reset
   ```

### Migration Best Practices

- **Always include rollback instructions**
- **Use `IF EXISTS` and `IF NOT EXISTS`**
- **Include comprehensive comments**
- **Test with sample data**
- **Never modify existing migrations**

## 🚀 Edge Functions

### Function Structure

```typescript
// supabase/functions/example/index.ts
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    const { param1, param2 } = await req.json();
    
    if (!param1) {
      throw new Error('param1 is required');
    }

    // Process request
    const result = await processRequest(param1, param2);

    // Return response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'An error occurred',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Deployment

```bash
# Deploy single function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

## 📝 Documentation

### Code Documentation

```typescript
/**
 * Processes a chat message and returns an AI response
 * 
 * @param message - The user's message content
 * @param sessionId - The chat session identifier
 * @param context - Additional context for the AI
 * @returns Promise resolving to the AI response
 * 
 * @example
 * ```typescript
 * const response = await processChatMessage(
 *   "Help me with my VA claim",
 *   "session-123",
 *   { documents: userDocs }
 * );
 * ```
 */
async function processChatMessage(
  message: string,
  sessionId: string,
  context?: ChatContext
): Promise<string> {
  // Implementation
}
```

### README Updates

When adding new features, update relevant documentation:

- **README.md**: High-level feature description
- **API.md**: New endpoints or changes
- **USER_GUIDE.md**: User-facing features
- **ARCHITECTURE.md**: Technical changes

## 🔍 Code Review Process

### Pull Request Guidelines

1. **PR Title**: Use conventional commits format
   ```
   feat: add document analysis pipeline
   fix: resolve chat loading state issue
   docs: update API documentation
   ```

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Screenshots
   (if applicable)

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   ```

### Review Checklist

**Functionality**
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Performance considerations

**Code Quality**
- [ ] Follows TypeScript best practices
- [ ] Proper component structure
- [ ] Consistent naming conventions
- [ ] No code duplication

**Security**
- [ ] Input validation
- [ ] Authentication checks
- [ ] RLS policies updated
- [ ] No sensitive data exposed

**Documentation**
- [ ] Code comments where needed
- [ ] API documentation updated
- [ ] User guide updated
- [ ] Migration notes included

## 🐛 Bug Reports

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. macOS, Windows]
- Browser: [e.g. Chrome, Firefox]
- Version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem
```

## 🎉 Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Screenshots, mockups, or examples
```

## 📊 Performance Guidelines

### Frontend Performance

```typescript
// ✅ Good: Lazy loading
const Documents = lazy(() => import('./pages/Documents'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));

// ✅ Good: Memoization
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return processData(data);
  }, [data]);

  return <div>{processedData}</div>;
});

// ✅ Good: Debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

### Database Performance

```sql
-- ✅ Good: Proper indexing
CREATE INDEX CONCURRENTLY idx_messages_session_created 
ON messages(session_id, created_at DESC);

-- ✅ Good: Efficient queries
SELECT m.*, cs.title
FROM messages m
JOIN chat_sessions cs ON m.session_id = cs.id
WHERE cs.user_id = $1
ORDER BY m.created_at DESC
LIMIT 50;

-- ❌ Bad: N+1 queries
-- Avoid fetching related data in loops
```

## 🔒 Security Guidelines

### Input Validation

```typescript
// ✅ Good: Validate all inputs
const validateMessage = (message: string): boolean => {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  if (message.length > 10000) {
    return false;
  }
  
  // Check for malicious content
  const dangerousPatterns = [/<script/i, /javascript:/i];
  return !dangerousPatterns.some(pattern => pattern.test(message));
};

// ✅ Good: Sanitize file uploads
const validateFile = (file: File): boolean => {
  const allowedTypes = ['application/pdf', 'text/plain'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};
```

### Authentication

```typescript
// ✅ Good: Check authentication
const requireAuth = (handler: Function) => {
  return async (req: Request) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const { data: user, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    return handler(req, user);
  };
};
```

## 📦 Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Pre-release**
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] Migration scripts tested
   - [ ] Security review completed

2. **Release**
   - [ ] Version bumped
   - [ ] Changelog updated
   - [ ] Git tag created
   - [ ] Deployment successful

3. **Post-release**
   - [ ] Monitoring checks
   - [ ] User communication
   - [ ] Feedback collection

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful** and inclusive
- **Be constructive** in feedback
- **Be patient** with newcomers
- **Be collaborative** in problem-solving

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions
- **Email**: security@forwardassisthq.com for security issues

## 📚 Resources

### Learning Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Development Tools

- **VS Code Extensions**
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter

### Useful Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Database
supabase db reset       # Reset local database
supabase db diff        # Show schema differences
supabase functions deploy # Deploy Edge Functions

# Testing
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

---

Thank you for contributing to Forward Assist HQ! Your efforts help us build better tools for veterans. 🇺🇸