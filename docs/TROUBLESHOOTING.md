# Troubleshooting Guide - Forward Assist HQ

This guide helps you diagnose and resolve common issues with Forward Assist HQ.

## 🚨 Common Issues

### Authentication Problems

#### "Cannot connect to Supabase"

**Symptoms:**
- Login fails with network error
- App shows "Loading..." indefinitely
- Console shows connection errors

**Causes & Solutions:**

1. **Invalid Environment Variables**
   ```bash
   # Check your .env file
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   
   **Fix:** Verify URL format and key validity in Supabase dashboard

2. **Project Paused (Free Tier)**
   - Supabase free tier projects pause after inactivity
   
   **Fix:** Visit Supabase dashboard and resume project

3. **Network Connectivity**
   ```bash
   # Test connection
   curl -I https://your-project-ref.supabase.co
   ```
   
   **Fix:** Check internet connection and firewall settings

#### "User not authenticated" Errors

**Symptoms:**
- Redirected to login page unexpectedly
- API calls return 401 errors
- User data not loading

**Debugging Steps:**

1. **Check Browser Storage**
   ```javascript
   // In browser console
   localStorage.getItem('supabase.auth.token')
   ```

2. **Verify Token Validity**
   ```javascript
   // In browser console
   const { data, error } = await supabase.auth.getSession();
   console.log(data, error);
   ```

3. **Clear Auth State**
   ```javascript
   // Clear and retry
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

### Database Issues

#### "RLS policy violation" Errors

**Symptoms:**
- Data not loading for authenticated users
- Insert/update operations fail
- Empty results from queries

**Debugging:**

1. **Check RLS Policies**
   ```sql
   -- In Supabase SQL Editor
   SELECT schemaname, tablename, policyname, cmd, qual 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

2. **Verify User ID**
   ```sql
   -- Check current user
   SELECT auth.uid();
   ```

3. **Test Policy Logic**
   ```sql
   -- Test specific policy
   SELECT * FROM chat_sessions 
   WHERE user_id = auth.uid();
   ```

**Common Fixes:**

```sql
-- Fix missing user_id in policy
CREATE POLICY "Users can view own sessions" ON chat_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix incorrect policy condition
DROP POLICY "old_policy_name" ON table_name;
CREATE POLICY "new_policy_name" ON table_name
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### "Vector extension not found"

**Symptoms:**
- Error: `extension "vector" does not exist`
- Document search not working
- Embedding operations fail

**Fix:**
```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Edge Function Issues

#### "Function not found" or 500 Errors

**Symptoms:**
- Chat responses not working
- Document analysis fails
- API endpoints return errors

**Debugging Steps:**

1. **Check Function Deployment**
   ```bash
   supabase functions list
   ```

2. **View Function Logs**
   ```bash
   supabase functions logs chat --project-ref your-project
   ```

3. **Test Function Locally**
   ```bash
   supabase functions serve chat
   ```

**Common Issues:**

1. **Missing OpenAI API Key**
   ```bash
   # Set in Supabase dashboard or CLI
   supabase secrets set OPENAI_API_KEY=your-key
   ```

2. **CORS Issues**
   ```typescript
   // Ensure CORS headers in function
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };
   ```

3. **Function Timeout**
   - Reduce processing complexity
   - Implement streaming responses
   - Optimize database queries

#### OpenAI API Errors

**Common Error Messages:**

1. **"Insufficient credits"**
   - Check OpenAI billing dashboard
   - Add payment method or credits

2. **"Rate limit exceeded"**
   ```typescript
   // Implement retry logic
   const retryWithBackoff = async (fn: Function, retries = 3) => {
     try {
       return await fn();
     } catch (error) {
       if (retries > 0 && error.status === 429) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return retryWithBackoff(fn, retries - 1);
       }
       throw error;
     }
   };
   ```

3. **"Invalid API key"**
   - Verify key in OpenAI dashboard
   - Check key format (starts with `sk-`)
   - Ensure key has proper permissions

### File Upload Issues

#### "File upload fails"

**Symptoms:**
- Upload progress stops
- Error messages during upload
- Files not appearing in storage

**Debugging:**

1. **Check File Validation**
   ```javascript
   // Verify file meets requirements
   console.log('File type:', file.type);
   console.log('File size:', file.size);
   console.log('Max size:', 10 * 1024 * 1024); // 10MB
   ```

2. **Check Storage Policies**
   ```sql
   -- View storage policies
   SELECT * FROM storage.policies;
   ```

3. **Test Storage Connection**
   ```javascript
   // Test upload directly
   const { data, error } = await supabase.storage
     .from('uploads')
     .upload('test.txt', new Blob(['test']));
   console.log(data, error);
   ```

**Common Fixes:**

1. **File Size Limit**
   ```javascript
   // Increase limit or compress files
   const MAX_SIZE = 10 * 1024 * 1024; // 10MB
   if (file.size > MAX_SIZE) {
     throw new Error('File too large');
   }
   ```

2. **Storage Policy**
   ```sql
   -- Fix storage policy
   CREATE POLICY "Users can upload files" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

3. **MIME Type Issues**
   ```javascript
   // Validate MIME types
   const allowedTypes = ['application/pdf', 'text/plain', 'application/json'];
   if (!allowedTypes.includes(file.type)) {
     throw new Error('Invalid file type');
   }
   ```

### Performance Issues

#### "Slow Response Times"

**Symptoms:**
- Chat responses take too long
- Page loading delays
- Database queries timeout

**Debugging:**

1. **Check Database Performance**
   ```sql
   -- View slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Monitor Function Execution**
   ```bash
   # Check function logs for timing
   supabase functions logs chat --project-ref your-project
   ```

3. **Network Analysis**
   - Use browser DevTools Network tab
   - Check for large payloads
   - Identify slow requests

**Optimization Strategies:**

1. **Database Indexing**
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_messages_session_created 
   ON messages(session_id, created_at DESC);
   ```

2. **Query Optimization**
   ```sql
   -- Use EXPLAIN to analyze queries
   EXPLAIN ANALYZE SELECT * FROM messages 
   WHERE session_id = 'session-id' 
   ORDER BY created_at DESC 
   LIMIT 50;
   ```

3. **Caching**
   ```javascript
   // Implement client-side caching
   const cache = new Map();
   
   const getCachedData = (key) => {
     if (cache.has(key)) {
       return cache.get(key);
     }
     // Fetch and cache data
   };
   ```

### Frontend Issues

#### "White Screen of Death"

**Symptoms:**
- Blank page on load
- No error messages visible
- Console shows JavaScript errors

**Debugging:**

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check for failed network requests
   - Verify environment variables

2. **Check Build Process**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Verify Dependencies**
   ```bash
   # Check for version conflicts
   npm ls
   npm audit
   ```

#### "Component Not Rendering"

**Common Causes:**

1. **Missing Props**
   ```typescript
   // Check required props
   interface ComponentProps {
     requiredProp: string; // Make sure this is provided
     optionalProp?: string;
   }
   ```

2. **Conditional Rendering Issues**
   ```typescript
   // Fix conditional rendering
   {user && <UserComponent user={user} />}
   // Instead of
   {user ? <UserComponent user={user} /> : null}
   ```

3. **State Management Issues**
   ```typescript
   // Check Zustand store state
   console.log(useChatStore.getState());
   ```

### Development Environment Issues

#### "npm install fails"

**Common Solutions:**

1. **Clear npm cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Node version issues**
   ```bash
   # Use correct Node version
   nvm use 18
   # or
   node --version # Should be 18+
   ```

3. **Permission issues**
   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   ```

#### "Vite dev server issues"

**Symptoms:**
- Dev server won't start
- Hot reload not working
- Build errors

**Solutions:**

1. **Port conflicts**
   ```bash
   # Use different port
   npm run dev -- --port 3001
   ```

2. **Clear Vite cache**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Check Vite config**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     plugins: [react()],
     server: {
       port: 5173,
       host: true,
     },
   });
   ```

## 🔧 Diagnostic Tools

### Health Check Script

```javascript
// src/utils/healthCheck.ts
export async function runHealthCheck() {
  const checks = {
    supabase: false,
    openai: false,
    storage: false,
    functions: false,
  };

  try {
    // Test Supabase connection
    const { data } = await supabase.from('chat_sessions').select('count').limit(1);
    checks.supabase = true;
  } catch (error) {
    console.error('Supabase health check failed:', error);
  }

  try {
    // Test Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/health`);
    checks.functions = response.ok;
  } catch (error) {
    console.error('Functions health check failed:', error);
  }

  try {
    // Test Storage
    const { data } = await supabase.storage.from('uploads').list('', { limit: 1 });
    checks.storage = true;
  } catch (error) {
    console.error('Storage health check failed:', error);
  }

  return checks;
}
```

### Debug Console Commands

```javascript
// Add to browser console for debugging

// Check authentication state
window.debugAuth = async () => {
  const { data, error } = await supabase.auth.getSession();
  console.log('Auth session:', data, error);
};

// Check store state
window.debugStore = () => {
  console.log('Chat store:', useChatStore.getState());
  console.log('Auth store:', useAuthStore.getState());
};

// Test API endpoints
window.testAPI = async (endpoint, payload) => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    console.log('API response:', await response.text());
  } catch (error) {
    console.error('API error:', error);
  }
};
```

### Log Analysis

```bash
# View application logs
supabase functions logs --project-ref your-project

# Filter by function
supabase functions logs chat --project-ref your-project

# View real-time logs
supabase functions logs --follow --project-ref your-project

# View database logs (if available)
supabase logs --type database --project-ref your-project
```

## 📊 Monitoring Setup

### Error Tracking

```typescript
// src/utils/errorTracking.ts
class ErrorTracker {
  static track(error: Error, context?: any) {
    console.error('Error tracked:', error, context);
    
    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket, etc.
    }
  }

  static trackPerformance(metric: string, value: number) {
    console.log(`Performance metric: ${metric} = ${value}ms`);
    
    // Send to analytics
    if (process.env.NODE_ENV === 'production') {
      // Google Analytics, etc.
    }
  }
}

// Usage in components
try {
  await riskyOperation();
} catch (error) {
  ErrorTracker.track(error, { component: 'ChatInterface', action: 'sendMessage' });
}
```

### Performance Monitoring

```typescript
// src/utils/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();
    
    try {
      const result = await fn();
      const end = performance.now();
      
      console.log(`${name} took ${end - start} milliseconds`);
      resolve(result);
    } catch (error) {
      const end = performance.now();
      console.error(`${name} failed after ${end - start} milliseconds`, error);
      reject(error);
    }
  });
}

// Usage
const result = await measurePerformance('Document Analysis', () =>
  analyzeDocument(content)
);
```

## 🆘 Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide**
2. **Search existing GitHub issues**
3. **Review the documentation**
4. **Try the diagnostic tools**

### Creating a Bug Report

Include the following information:

```markdown
**Environment:**
- OS: [e.g., macOS 12.0]
- Browser: [e.g., Chrome 96.0]
- Node.js: [e.g., 18.17.0]
- App version: [e.g., 1.0.0]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What you expected to happen

**Actual Behavior:**
What actually happened

**Error Messages:**
```
Paste any error messages here
```

**Console Logs:**
```
Paste relevant console output here
```

**Additional Context:**
Any other relevant information
```

### Support Channels

1. **GitHub Issues**: Bug reports and feature requests
2. **GitHub Discussions**: Questions and community help
3. **Email**: security@forwardassisthq.com (security issues only)

### Emergency Procedures

For critical production issues:

1. **Check system status**
   - Supabase status page
   - OpenAI status page
   - CDN status

2. **Rollback if necessary**
   ```bash
   # Revert to previous deployment
   git revert HEAD
   # Deploy previous version
   ```

3. **Communicate with users**
   - Status page update
   - Social media notification
   - Email notification

---

This troubleshooting guide covers the most common issues you might encounter with Forward Assist HQ. Keep it bookmarked for quick reference during development and deployment.