# Setup Guide - Forward Assist HQ

This guide will walk you through setting up Forward Assist HQ from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed
- **Git** for version control
- **Supabase account** (free tier available)
- **OpenAI API key** with GPT-4 access
- **Code editor** (VS Code recommended)

## Step 1: Project Setup

### 1.1 Clone Repository
```bash
git clone <repository-url>
cd forward-assist-hq
```

### 1.2 Install Dependencies
```bash
npm install
```

### 1.3 Environment Configuration
Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Development settings
VITE_DEBUG=true
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Create a new project
5. Choose a region close to your users
6. Set a strong database password

### 2.2 Get Project Credentials
1. Go to Project Settings → API
2. Copy the Project URL and Anon key
3. Update your `.env` file with these values

### 2.3 Enable Vector Extension
In the Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.4 Run Database Migrations
Execute all migration files in order from `supabase/migrations/`:

1. Open Supabase SQL Editor
2. Copy and paste each migration file content
3. Execute them in chronological order (by filename)

**Important migrations to run:**
- `20250605184001_rustic_portal.sql` - Core chat system
- `20250605205609_silent_band.sql` - Knowledge base tables
- `20250605215048_sparkling_tooth.sql` - File storage
- `20250606061957_nameless_meadow.sql` - Document embeddings
- All subsequent migrations for optimizations

### 2.5 Configure Storage
The migrations should create the storage bucket automatically. Verify in Supabase Dashboard → Storage that the `uploads` bucket exists.

## Step 3: OpenAI Setup

### 3.1 Get OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (you won't see it again)

### 3.2 Add to Supabase Secrets
In your Supabase project dashboard:
1. Go to Edge Functions
2. Click on "Manage secrets"
3. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

## Step 4: Deploy Edge Functions

### 4.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 4.2 Login to Supabase
```bash
supabase login
```

### 4.3 Link Your Project
```bash
supabase link --project-ref your-project-ref
```

### 4.4 Deploy Functions
```bash
supabase functions deploy chat
supabase functions deploy analyze-document
supabase functions deploy generate-title
supabase functions deploy train
```

## Step 5: Authentication Setup

### 5.1 Configure Auth Settings
In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: Set to your domain (for development: `http://localhost:5173`)
2. **Redirect URLs**: Add your domain
3. **Email Templates**: Customize if needed
4. **Providers**: Email/Password should be enabled by default

### 5.2 Create Test User
1. Go to Authentication → Users
2. Click "Add user"
3. Create a test account with email/password

### 5.3 Create Admin User (Optional)
For knowledge base access, create a user with email ending in `@forwardassisthq.com`

## Step 6: Development Server

### 6.1 Start Development Server
```bash
npm run dev
```

### 6.2 Access Application
Open [http://localhost:5173](http://localhost:5173) in your browser

### 6.3 Test Basic Functionality
1. **Login**: Use your test account
2. **Chat**: Send a message to AI Battle Buddy
3. **Upload**: Try uploading a PDF document
4. **Navigation**: Test sidebar and page navigation

## Step 7: Verification Checklist

### ✅ Database
- [ ] All migrations executed successfully
- [ ] Vector extension enabled
- [ ] Tables created with proper RLS policies
- [ ] Storage bucket configured

### ✅ Authentication
- [ ] User can register/login
- [ ] Session persistence works
- [ ] RLS policies prevent unauthorized access

### ✅ Edge Functions
- [ ] Chat function responds to messages
- [ ] Document analysis processes files
- [ ] Title generation works
- [ ] No CORS errors in browser console

### ✅ File Upload
- [ ] PDF files upload successfully
- [ ] Document analysis completes
- [ ] Embeddings are generated
- [ ] Files are accessible via URL

### ✅ AI Features
- [ ] Chat responses are generated
- [ ] Document context is used in responses
- [ ] Streaming responses work
- [ ] Export functionality works

## Step 8: Production Deployment

### 8.1 Build for Production
```bash
npm run build
```

### 8.2 Deploy to Hosting Provider

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### 8.3 Update Environment Variables
Set production environment variables in your hosting provider:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 8.4 Update Supabase Settings
1. Add production URL to Site URL and Redirect URLs
2. Update CORS settings if needed

## Troubleshooting

### Common Setup Issues

#### "Cannot connect to Supabase"
- Verify URL and API key in `.env`
- Check if project is paused (free tier limitation)
- Ensure network connectivity

#### "Vector extension not found"
- Run `CREATE EXTENSION IF NOT EXISTS vector;` in SQL Editor
- Ensure you have proper permissions

#### "Edge Functions not working"
- Verify OpenAI API key is set in Supabase secrets
- Check function logs in Supabase dashboard
- Ensure functions are deployed correctly

#### "File upload fails"
- Check storage policies in database
- Verify bucket exists and is public
- Check file size limits

#### "RLS policy errors"
- Ensure all migrations ran successfully
- Check user authentication status
- Verify policy syntax in migrations

### Getting Help

If you encounter issues:

1. **Check the logs**: Browser console and Supabase function logs
2. **Verify configuration**: Double-check all environment variables
3. **Test incrementally**: Test each feature separately
4. **Review documentation**: Check API documentation for edge functions
5. **Create an issue**: If problems persist, create a GitHub issue

## Next Steps

After successful setup:

1. **Customize branding**: Update colors, logos, and text
2. **Add content**: Upload knowledge base documents
3. **Configure monitoring**: Set up error tracking and analytics
4. **Optimize performance**: Review and optimize database queries
5. **Security review**: Audit RLS policies and access controls

---

Your Forward Assist HQ installation should now be ready for use! 🎉