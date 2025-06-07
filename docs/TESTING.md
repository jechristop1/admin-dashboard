# Testing Guide - Forward Assist HQ

This document outlines testing strategies, procedures, and best practices for Forward Assist HQ.

## 🧪 Testing Strategy

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few)
  /____\    Integration Tests (Some)
 /______\   Unit Tests (Many)
```

**Unit Tests (70%)**
- Individual functions and components
- Fast execution, isolated testing
- Mock external dependencies

**Integration Tests (20%)**
- API endpoints and database operations
- Component integration
- Edge Function testing

**End-to-End Tests (10%)**
- Complete user workflows
- Cross-browser testing
- Critical path validation

## 🔧 Testing Setup

### Test Environment

```bash
# Install testing dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  vitest \
  jsdom \
  msw
```

### Configuration Files

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

#### `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

## 🧩 Unit Testing

### Component Testing

```typescript
// src/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[#FFBA08]');
  });
});
```

### Store Testing

```typescript
// src/store/chatStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';
import { Message } from '../types';

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: [],
      isLoading: false,
      currentSessionId: null,
    });
  });

  it('adds message to store', async () => {
    const message: Message = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    };

    await useChatStore.getState().addMessage(message);
    
    expect(useChatStore.getState().messages).toContain(message);
  });

  it('sets loading state', () => {
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);
  });

  it('clears messages', () => {
    const initialMessage = useChatStore.getState().messages[0]; // System message
    useChatStore.getState().clearMessages();
    
    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe(initialMessage);
  });
});
```

### Utility Function Testing

```typescript
// src/utils/exportUtils.test.ts
import { describe, it, expect } from 'vitest';
import { cleanMarkdown, formatMessages } from './exportUtils';
import { Message } from '../types';

describe('Export Utils', () => {
  describe('cleanMarkdown', () => {
    it('removes markdown formatting', () => {
      const input = '**Bold** and *italic* text with `code`';
      const expected = 'Bold and italic text with code';
      expect(cleanMarkdown(input)).toBe(expected);
    });

    it('handles headers', () => {
      const input = '# Header 1\n## Header 2\n### Header 3';
      const expected = 'Header 1\nHeader 2\nHeader 3';
      expect(cleanMarkdown(input)).toBe(expected);
    });

    it('converts lists to bullet points', () => {
      const input = '- Item 1\n- Item 2\n1. Numbered item';
      const expected = '• Item 1\n• Item 2\n• Numbered item';
      expect(cleanMarkdown(input)).toBe(expected);
    });
  });

  describe('formatMessages', () => {
    it('formats messages correctly', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2024-01-01T12:01:00Z'),
        },
      ];

      const result = formatMessages(messages);
      expect(result).toContain('User (Jan 1, 2024, 12:00 PM):');
      expect(result).toContain('AI Battle Buddy (Jan 1, 2024, 12:01 PM):');
      expect(result).toContain('Hello');
      expect(result).toContain('Hi there!');
    });
  });
});
```

## 🔗 Integration Testing

### API Testing

```typescript
// src/test/api/chat.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Chat API', () => {
  let supabase: any;
  let testUser: any;
  let testSession: any;

  beforeAll(async () => {
    // Setup test environment
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword',
    });
    testUser = user.user;

    // Create test session
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: testUser.id,
        title: 'Test Session',
      })
      .select()
      .single();
    testSession = session;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  it('processes chat message', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message',
        sessionId: testSession.id,
        messages: [],
      }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/plain');

    // Read streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }
    }

    expect(result.length).toBeGreaterThan(0);
  });

  it('handles invalid session ID', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message',
        sessionId: 'invalid-session-id',
        messages: [],
      }),
    });

    expect(response.status).toBe(500);
  });
});
```

### Database Testing

```typescript
// src/test/database/rls.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security', () => {
  let supabase: any;
  let user1: any;
  let user2: any;

  beforeAll(async () => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test users
    const { data: userData1 } = await supabase.auth.admin.createUser({
      email: 'user1@example.com',
      password: 'password',
    });
    user1 = userData1.user;

    const { data: userData2 } = await supabase.auth.admin.createUser({
      email: 'user2@example.com',
      password: 'password',
    });
    user2 = userData2.user;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.auth.admin.deleteUser(user1.id);
    await supabase.auth.admin.deleteUser(user2.id);
  });

  it('prevents users from accessing other users data', async () => {
    // Create session for user1
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user1.id,
        title: 'User 1 Session',
      })
      .select()
      .single();

    // Try to access with user2 credentials
    const user2Client = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Simulate user2 authentication
    await user2Client.auth.setSession({
      access_token: 'user2-token',
      refresh_token: 'user2-refresh',
    });

    const { data: unauthorizedData, error } = await user2Client
      .from('chat_sessions')
      .select('*')
      .eq('id', session.id);

    expect(unauthorizedData).toHaveLength(0);
    expect(error).toBeNull(); // RLS returns empty result, not error
  });
});
```

## 🎭 Mocking

### MSW Setup

```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Mock OpenAI API
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.json({
        choices: [
          {
            message: {
              content: 'Mocked AI response',
            },
          },
        ],
      })
    );
  }),

  // Mock Supabase functions
  rest.post('*/functions/v1/chat', (req, res, ctx) => {
    return res(
      ctx.text('Mocked streaming response')
    );
  }),

  // Mock file upload
  rest.post('*/storage/v1/object/uploads/*', (req, res, ctx) => {
    return res(
      ctx.json({
        Key: 'uploads/test-file.pdf',
      })
    );
  }),
];
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Component Mocking

```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest';

export const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));
```

## 🌐 End-to-End Testing

### Playwright Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    await page.waitForURL('/');
  });

  test('sends and receives messages', async ({ page }) => {
    // Type a message
    await page.fill('[data-testid=chat-input]', 'Hello AI Battle Buddy');
    await page.click('[data-testid=send-button]');

    // Wait for user message to appear
    await expect(page.locator('[data-testid=user-message]')).toContainText('Hello AI Battle Buddy');

    // Wait for AI response
    await expect(page.locator('[data-testid=assistant-message]')).toBeVisible({ timeout: 10000 });
  });

  test('uploads and analyzes document', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-files/sample.pdf');

    // Wait for upload to complete
    await expect(page.locator('[data-testid=upload-success]')).toBeVisible();

    // Check that analysis starts
    await expect(page.locator('[data-testid=analysis-loading]')).toBeVisible();

    // Wait for analysis to complete
    await expect(page.locator('[data-testid=analysis-complete]')).toBeVisible({ timeout: 30000 });
  });

  test('exports chat transcript', async ({ page }) => {
    // Send a message first
    await page.fill('[data-testid=chat-input]', 'Test message for export');
    await page.click('[data-testid=send-button]');

    // Wait for response
    await expect(page.locator('[data-testid=assistant-message]')).toBeVisible();

    // Open export menu
    await page.click('[data-testid=export-button]');

    // Download PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=export-pdf]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/forward-assist-chat-.*\.pdf/);
  });
});
```

## 📊 Test Coverage

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

## 🚀 Performance Testing

### Load Testing

```typescript
// src/test/performance/load.test.ts
import { describe, it, expect } from 'vitest';

describe('Performance Tests', () => {
  it('handles multiple concurrent chat requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      fetch('/functions/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test message ${i}`,
          sessionId: 'test-session',
          messages: [],
        }),
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
  });
});
```

## 🔍 Testing Best Practices

### Test Organization

```typescript
// Good: Descriptive test names
describe('ChatInput Component', () => {
  describe('when user types a message', () => {
    it('should enable the send button', () => {
      // Test implementation
    });

    it('should call onSendMessage when form is submitted', () => {
      // Test implementation
    });
  });

  describe('when file is uploaded', () => {
    it('should validate file type', () => {
      // Test implementation
    });

    it('should show upload progress', () => {
      // Test implementation
    });
  });
});
```

### Test Data Management

```typescript
// src/test/fixtures/messages.ts
export const mockMessages = {
  userMessage: {
    id: '1',
    role: 'user' as const,
    content: 'Hello',
    timestamp: new Date('2024-01-01T12:00:00Z'),
  },
  assistantMessage: {
    id: '2',
    role: 'assistant' as const,
    content: 'Hi there!',
    timestamp: new Date('2024-01-01T12:01:00Z'),
  },
};

export const mockChatSession = {
  id: 'session-1',
  user_id: 'user-1',
  title: 'Test Session',
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
};
```

### Async Testing

```typescript
// Good: Proper async testing
it('should load chat history', async () => {
  const { result } = renderHook(() => useChatStore());

  await act(async () => {
    await result.current.loadSession('session-1');
  });

  expect(result.current.messages).toHaveLength(2);
});

// Good: Testing error states
it('should handle API errors gracefully', async () => {
  // Mock API to return error
  server.use(
    rest.post('/functions/v1/chat', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Server error' }));
    })
  );

  const { result } = renderHook(() => useChatStore());

  await act(async () => {
    await result.current.sendMessage('Test message');
  });

  expect(result.current.error).toBe('Server error');
});
```

## 📋 Testing Checklist

### Pre-commit Checklist

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Code coverage meets threshold
- [ ] No console errors or warnings
- [ ] TypeScript compilation successful

### Pre-deployment Checklist

- [ ] All tests pass in CI/CD
- [ ] E2E tests pass
- [ ] Performance tests pass
- [ ] Security tests pass
- [ ] Manual testing completed

### Test Categories

**Unit Tests**
- [ ] Component rendering
- [ ] User interactions
- [ ] State management
- [ ] Utility functions
- [ ] Error handling

**Integration Tests**
- [ ] API endpoints
- [ ] Database operations
- [ ] Authentication flow
- [ ] File upload/download
- [ ] Real-time features

**E2E Tests**
- [ ] User registration/login
- [ ] Chat functionality
- [ ] Document upload/analysis
- [ ] Export features
- [ ] Navigation

## 🛠️ Debugging Tests

### Common Issues

```typescript
// Issue: Test timeout
// Solution: Increase timeout for async operations
it('should process large document', async () => {
  // Increase timeout for this test
  vi.setConfig({ testTimeout: 30000 });
  
  await processDocument(largeDocument);
}, 30000);

// Issue: Flaky tests
// Solution: Use waitFor for async assertions
it('should show loading state', async () => {
  render(<ChatInterface />);
  
  fireEvent.click(screen.getByText('Send'));
  
  await waitFor(() => {
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// Issue: Memory leaks
// Solution: Cleanup after tests
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

### Test Debugging Tools

```bash
# Run tests in debug mode
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- src/components/Button.test.tsx

# Run tests in watch mode
npm run test -- --watch

# Debug with browser
npm run test -- --ui
```

---

This testing guide ensures comprehensive coverage and reliable testing practices for Forward Assist HQ. Regular testing helps maintain code quality and prevents regressions as the application evolves.