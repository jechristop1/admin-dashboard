# Deployment Guide - Forward Assist HQ

This guide covers deploying Forward Assist HQ to production environments.

## Overview

Forward Assist HQ is a static React application that can be deployed to any static hosting provider. The backend services (database, authentication, Edge Functions) are hosted on Supabase.

## Pre-Deployment Checklist

### ✅ Development Complete
- [ ] All features tested locally
- [ ] No console errors or warnings
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Edge Functions deployed and tested

### ✅ Production Environment
- [ ] Production Supabase project created
- [ ] OpenAI API key configured
- [ ] Domain name registered (if using custom domain)
- [ ] SSL certificate ready (usually automatic)

### ✅ Security Review
- [ ] RLS policies tested
- [ ] API keys secured
- [ ] CORS settings configured
- [ ] File upload limits verified

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides excellent React support with automatic deployments.

#### 1.1 Setup Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Install Vercel CLI: `npm install -g vercel`

#### 1.2 Configure Project
Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### 1.3 Deploy
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

#### 1.4 Configure Domain
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain

---

### Option 2: Netlify

Netlify offers great static site hosting with form handling.

#### 2.1 Setup Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub account
3. Install Netlify CLI: `npm install -g netlify-cli`

#### 2.2 Configure Project
Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_SUPABASE_URL = "your-production-supabase-url"
  VITE_SUPABASE_ANON_KEY = "your-production-supabase-anon-key"
```

#### 2.3 Deploy
```bash
# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist

# Or connect GitHub repository for automatic deployments
netlify init
```

---

### Option 3: AWS S3 + CloudFront

For enterprise deployments requiring AWS infrastructure.

#### 3.1 Create S3 Bucket
```bash
aws s3 mb s3://your-app-bucket-name
aws s3 website s3://your-app-bucket-name --index-document index.html
```

#### 3.2 Build and Upload
```bash
npm run build
aws s3 sync dist/ s3://your-app-bucket-name --delete
```

#### 3.3 Configure CloudFront
1. Create CloudFront distribution
2. Set S3 bucket as origin
3. Configure custom error pages for SPA routing
4. Set up SSL certificate

---

### Option 4: Docker Deployment

For containerized deployments.

#### 4.1 Create Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 4.2 Create nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### 4.3 Build and Run
```bash
docker build -t forward-assist-hq .
docker run -p 80:80 forward-assist-hq
```

## Production Configuration

### Environment Variables

Set these in your hosting provider:

```env
# Required
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Optional
VITE_DEBUG=false
VITE_ANALYTICS_ID=your-analytics-id
```

### Supabase Production Setup

#### 1. Create Production Project
1. Create new Supabase project for production
2. Use different project from development
3. Apply all database migrations
4. Deploy Edge Functions

#### 2. Configure Authentication
```sql
-- Update auth settings
UPDATE auth.config SET
  site_url = 'https://your-domain.com',
  redirect_urls = '["https://your-domain.com/**"]';
```

#### 3. Set Environment Variables
In Supabase Edge Functions settings:
```
OPENAI_API_KEY=your-production-openai-key
```

#### 4. Configure CORS
```sql
-- Allow your domain
INSERT INTO storage.cors (bucket_id, allowed_origins, allowed_methods)
VALUES ('uploads', '["https://your-domain.com"]', '["GET", "POST", "PUT", "DELETE"]');
```

### Performance Optimization

#### 1. Build Optimization
```json
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', '@tailwindcss/typography'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

#### 2. Asset Optimization
- Enable gzip compression
- Set proper cache headers
- Optimize images and fonts
- Use CDN for static assets

#### 3. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_messages_session_created 
ON messages(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_documents_user_status 
ON user_documents(user_id, status);

-- Analyze tables
ANALYZE messages;
ANALYZE user_documents;
ANALYZE document_embeddings;
```

## Monitoring and Maintenance

### Health Checks

Create health check endpoints:

```typescript
// src/utils/healthCheck.ts
export async function checkHealth() {
  const checks = {
    supabase: false,
    openai: false,
    storage: false
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
    checks.openai = response.ok;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
  }

  return checks;
}
```

### Error Tracking

#### Sentry Integration
```bash
npm install @sentry/react @sentry/tracing
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

#### Custom Error Boundary
```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    return this.props.children;
  }
}
```

### Analytics

#### Google Analytics 4
```typescript
// src/utils/analytics.ts
export function trackEvent(eventName: string, parameters?: object) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, parameters);
  }
}

// Usage
trackEvent('document_upload', {
  document_type: 'c&p_exam',
  file_size: file.size
});
```

### Backup Strategy

#### Database Backups
- Supabase automatically backs up your database
- Set up additional backups for critical data
- Test restore procedures regularly

#### File Storage Backups
```bash
# Backup Supabase storage
supabase storage download --recursive uploads/ ./backups/
```

### Security Monitoring

#### 1. Monitor Failed Logins
```sql
-- Create function to track failed logins
CREATE OR REPLACE FUNCTION track_failed_login()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_logs (event_type, user_email, ip_address, created_at)
  VALUES ('failed_login', NEW.email, NEW.ip_address, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2. Rate Limiting
Implement rate limiting in Edge Functions:

```typescript
const rateLimiter = new Map();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = userRequests.filter(
    (timestamp: number) => now - timestamp < 60000
  );
  
  if (recentRequests.length >= 60) { // 60 requests per minute
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}
```

## Rollback Strategy

### Quick Rollback
1. **Vercel/Netlify**: Use dashboard to rollback to previous deployment
2. **AWS**: Update CloudFront to point to previous S3 version
3. **Docker**: Deploy previous container version

### Database Rollback
```sql
-- Create migration rollback scripts
-- Example: rollback_20250606_feature.sql
DROP TABLE IF EXISTS new_feature_table;
ALTER TABLE existing_table DROP COLUMN new_column;
```

### Edge Function Rollback
```bash
# Deploy previous version
supabase functions deploy chat --project-ref your-project
```

## Troubleshooting Production Issues

### Common Issues

#### 1. "Failed to load resource" errors
- Check CORS configuration
- Verify environment variables
- Check network connectivity

#### 2. Authentication issues
- Verify JWT token validity
- Check RLS policies
- Confirm user permissions

#### 3. Slow performance
- Check database query performance
- Monitor Edge Function execution time
- Verify CDN configuration

#### 4. File upload failures
- Check storage bucket policies
- Verify file size limits
- Monitor storage quota

### Debug Tools

#### 1. Supabase Logs
```bash
# View Edge Function logs
supabase functions logs chat --project-ref your-project
```

#### 2. Browser DevTools
- Network tab for API calls
- Console for JavaScript errors
- Application tab for storage/auth

#### 3. Database Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Maintenance Schedule

### Daily
- [ ] Monitor error rates
- [ ] Check system health
- [ ] Review security logs

### Weekly
- [ ] Review performance metrics
- [ ] Check storage usage
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Security audit
- [ ] Backup verification
- [ ] Performance optimization review
- [ ] Cost analysis

### Quarterly
- [ ] Disaster recovery test
- [ ] Security penetration testing
- [ ] Architecture review
- [ ] Capacity planning

---

This deployment guide ensures a robust, secure, and maintainable production deployment of Forward Assist HQ. Follow the monitoring and maintenance procedures to keep your application running smoothly.