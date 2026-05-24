# TRD (Technical Requirements Document)
## YouTube Video to Project Documentation Generator

---

## 1. TECHNICAL OVERVIEW

**Project Name:** YouTube to Documentation Generator (YTDG)

**Technology Stack Overview:**
```
Framework:   Next.js 14+ (App Router), TypeScript, Tailwind CSS
Database:    Convex (Real-time Database + File Storage), Redis (optional, for caching)
AI/ML:       Gemini 2.5 Flash API
APIs:        YouTube Data API, Convex Auth / Clerk (OAuth)
Infrastructure: Convex Cloud, Vercel Hosting
```

---

## 2. SYSTEM ARCHITECTURE

### High-Level Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                          │
│  │ Next.js App Router & Convex Client                   │  │
│  │ - URL Input & Download Manager (Single/All)          │  │
│  │ - Document Preview (Monaco Editor)                   │  │
│  │ - Chat interface (positioned below document list)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ (REST API)
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                            │
│  (Authentication, Rate Limiting, Request Validation)        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Transcript Service                                │  │
│  │    - YouTube API Integration                         │  │
│  │    - Transcript Parser                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Document Generation Service                       │  │
│  │    - Claude AI Integration                           │  │
│  │    - Prompt Engineering                              │  │
│  │    - Document Formatter                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. Export Service                                    │  │
│  │    - PDF Generation                                  │  │
│  │    - Markdown Export                                 │  │
│  │    - Zip Creation                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. User Service                                      │  │
│  │    - Authentication                                  │  │
│  │    - Profile Management                              │  │
│  │    - Document History                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        ↓                  ↓                  ↓
┌──────────────────────────────────────────────────────────────┐
│              DATA & EXTERNAL SERVICES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Convex    │  │    Redis     │  │   YouTube    │      │
│  │ (DB & Store) │  │   (Cache)    │  │     API      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   AWS S3     │  │   Gemini     │  │   Google     │      │
│  │  (File Store)│  │     API      │  │    OAuth     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. TECH STACK DETAILS

### Next.js Architecture:
```
Framework:     Next.js 14+ (App Router)
Language:      TypeScript 5.0
Auth:          Auth.js (formerly Next-Auth)
UI Library:    Tailwind CSS 3.4
Component UI:  Shadcn/ui (Radix UI)
State Mgmt:    React Context / Zustand
Validation:    Zod
ORM/Database:  Convex client (TypeScript queries/mutations)
AI SDK:        @google/genai (Gemini SDK)
Export:        html2pdf, JSZip (for downloading all files in a zip)
```

### Database & Storage:
```
Primary DB & File Storage: Convex
  - users (table)
  - documents (table)
  - document_versions (table)
  - transcripts (table)
  - history (table)
  - chat_messages (table)
  - Built-in file storage for PDF / ZIP uploads
```

### External APIs:
```
Gemini API:    Gemini 2.5 Flash (gemini-2.5-flash)
YouTube:       Data API v3
Auth:          Google OAuth 2.0, GitHub OAuth
Email:         SendGrid
File Storage:  Convex File Storage
```

### Infrastructure:
```
Hosting:       Vercel Hosting
Database:      Convex Cloud (Serverless)
Storage:       Convex Storage (Serverless)
CI/CD:         GitHub Actions / Vercel Integration
Monitoring:    Convex Dashboard / LogRocket
```

---

## 4. DATABASE DESIGN

### Convex Database Schema (`convex/schema.ts`):

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password: v.string(), // hashed
    googleId: v.optional(v.string()),
    githubId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    plan: v.string(), // 'free' | 'pro' | 'enterprise'
    expiryDate: v.optional(v.number()),
    credits: v.number(),
    theme: v.string(), // 'light' | 'dark'
    language: v.string(), // e.g. 'en'
    exportFormat: v.string(), // 'pdf' | 'md'
    isActive: v.boolean(),
  }).index("by_email", ["email"]),

  transcripts: defineTable({
    youtubeId: v.string(),
    rawTranscript: v.string(),
    processedTranscript: v.optional(v.string()),
    language: v.string(),
    duration: v.number(), // seconds
    title: v.optional(v.string()),
    channelName: v.optional(v.string()),
    uploadedDate: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    status: v.string(), // 'pending' | 'completed' | 'failed'
  }).index("by_youtubeId", ["youtubeId"]),

  documents: defineTable({
    userId: v.id("users"),
    projectName: v.string(),
    description: v.optional(v.string()),
    youtubeUrl: v.string(),
    transcriptId: v.optional(v.id("transcripts")),
    companyName: v.optional(v.string()),
    logoStorageId: v.optional(v.string()), // Convex storage ID for brand logo
    brandColor: v.optional(v.string()),
    author: v.optional(v.string()),
    status: v.string(), // 'processing' | 'completed' | 'failed'
    error: v.optional(v.string()),
    tags: v.array(v.string()),
    isPublic: v.boolean(),
    shareableLink: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    zipStorageId: v.optional(v.string()), // Convex storage ID for compiled ZIP
  }).index("by_userId", ["userId"]),

  document_versions: defineTable({
    documentId: v.id("documents"),
    docType: v.string(), // 'prd' | 'trd' | 'srs' | 'apiDocs' | 'testCases' | 'setupGuide' | 'databaseSchema'
    content: v.string(), // Markdown content
    version: v.number(),
    pdfStorageId: v.optional(v.string()), // Convex storage ID for PDF version
  }).index("by_documentId", ["documentId"]),

  chat_messages: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    role: v.string(), // 'user' | 'assistant'
    content: v.string(),
  }).index("by_documentId", ["documentId"]),

  history: defineTable({
    userId: v.id("users"),
    action: v.string(), // 'generated' | 'updated' | 'shared' | 'deleted'
    documentId: v.optional(v.id("documents")),
    projectName: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    duration: v.optional(v.number()), // processing time in ms
  }).index("by_userId", ["userId"]),
});
```

---

## 5. API ENDPOINTS DESIGN

### 1. Authentication APIs:

```
POST   /api/v1/auth/register
       - Body: { email, password, firstName, lastName }
       - Response: { token, user }

POST   /api/v1/auth/login
       - Body: { email, password }
       - Response: { token, user }

POST   /api/v1/auth/google
       - Body: { googleToken }
       - Response: { token, user }

POST   /api/v1/auth/refresh-token
       - Response: { token }

POST   /api/v1/auth/logout
       - Response: { success }
```

### 2. Document Generation APIs:

```
POST   /api/v1/documents/generate
       - Body: { youtubeUrl, customization }
       - Response: { documentId, status, estimatedTime }
       - Note: Async operation, returns job ID

GET    /api/v1/documents/:documentId
       - Response: { document, status, allDocuments }

GET    /api/v1/documents/:documentId/status
       - Response: { status, progress, estimatedTimeRemaining }

POST   /api/v1/documents/:documentId/cancel
       - Response: { success, cancelledAt }
```

### 3. Export APIs:

```
GET    /api/v1/documents/:documentId/export/pdf
       - Query: { format: "single" | "individual" }
       - Response: PDF file (download)

GET    /api/v1/documents/:documentId/export/markdown
       - Response: Markdown files (zip)

GET    /api/v1/documents/:documentId/export/all
       - Response: All formats (zip)

GET    /api/v1/documents/:documentId/preview/:docType
       - Params: docType = "prd" | "trd" | "srs" | etc.
       - Response: { html, markdown }
```

### 4. Document Management APIs:

```
GET    /api/v1/documents
       - Query: { page, limit, sort, filter }
       - Response: { documents[], pagination }

PUT    /api/v1/documents/:documentId
       - Body: { customization, tags }
       - Response: { updatedDocument }

DELETE /api/v1/documents/:documentId
       - Response: { success, deletedAt }

GET    /api/v1/documents/:documentId/history
       - Response: { versions[], timestamps }

POST   /api/v1/documents/:documentId/share
       - Body: { expiresIn, password }
       - Response: { shareableLink, shareId }

GET    /api/v1/shared/:shareId
       - Public endpoint
       - Response: { document, isPublic }
```

### 5. User APIs:

```
GET    /api/v1/users/profile
       - Response: { user, preferences }

PUT    /api/v1/users/profile
       - Body: { firstName, lastName, preferences }
       - Response: { updatedUser }

GET    /api/v1/users/statistics
       - Response: { totalDocuments, totalGenerations, etc }

PUT    /api/v1/users/preferences
       - Body: { theme, language, exportFormat }
       - Response: { updatedPreferences }
```

### 6. Transcript APIs (Internal):

```
POST   /api/v1/transcripts/extract
       - Body: { youtubeUrl }
       - Response: { transcriptId, rawText }

GET    /api/v1/transcripts/:transcriptId
       - Response: { transcript, metadata }
```

### 7. Chat APIs:

```
POST   /api/v1/chat/:documentId/message
       - Body: { message }
       - Response: { reply, messageId }

GET    /api/v1/chat/:documentId/history
       - Response: { messages[] }
```

---

## 6. MICROSERVICES ARCHITECTURE

### Service 1: Transcript Service
```
Responsibility: YouTube transcript extraction & processing
Tech: Node.js + Express
External APIs: YouTube Data API
Database: PostgreSQL, Redis cache
Key Functions:
  - extractTranscript(youtubeUrl)
  - processTranscript(rawText)
  - cacheTranscript(transcriptId)
  - validateYoutubeUrl(url)
```

### Service 2: Document Generation Service
```
Responsibility: AI-powered document generation
Tech: Node.js + Express
External APIs: Gemini API
Database: PostgreSQL
Key Functions:
  - generatePRD(transcript)
  - generateTRD(transcript)
  - generateSRS(transcript)
  - generateAPIDocumentation(transcript)
  - generateTestCases(transcript)
  - formatDocument(content, template)
```

### Service 3: Export Service
```
Responsibility: PDF, Markdown, ZIP generation
Tech: Node.js + Express
Libraries: html2pdf, markdown-it, archiver
Storage: AWS S3
Key Functions:
  - generatePDF(content)
  - generateMarkdown(documents)
  - createZip(files[])
  - uploadToS3(file)
  - generateDownloadLink(fileId)
```

### Service 4: Auth Service
```
Responsibility: User authentication & authorization
Tech: Node.js + Express + JWT
External APIs: Google OAuth, GitHub OAuth
Database: MongoDB
Key Functions:
  - registerUser(email, password)
  - generateJWT(userId)
  - validateToken(token)
  - refreshToken(oldToken)
  - socialLogin(provider, code)
```

### Service 5: User Service
```
Responsibility: User profile & preferences management
Tech: Node.js + Express
Database: MongoDB
Cache: Redis
Key Functions:
  - getUserProfile(userId)
  - updateProfile(userId, data)
  - getDocumentHistory(userId)
  - updatePreferences(userId, prefs)
```

---

## 7. EXTERNAL INTEGRATIONS

### YouTube Data API:
```
Purpose: Extract video transcripts
Endpoint: https://www.googleapis.com/youtube/v3/
Required Methods:
  - videos.list (get video metadata)
  - captions.list (get available captions)
  - captions.download (download transcript)

Rate Limits: 10,000 quota units/day
Error Handling: Quota exceeded, invalid URL, video not found
```

### Gemini 2.5 Flash API:
```
Purpose: Generate documents from transcripts
Model: gemini-2.5-flash
API Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash
Token Limits: 
  - Input: 1,000,000 tokens
  - Output: 8,192 tokens per request

Prompts Templates:
  - PRD Prompt Template
  - TRD Prompt Template
  - SRS Prompt Template
  - API Documentation Prompt
  - Test Cases Prompt Template
```

### Google OAuth:
```
Purpose: Social login
Client ID: [from GCP console]
Scopes: email, profile, openid
Callback: https://yourdomain.com/auth/google/callback
```

### AWS S3:
```
Purpose: Store exported documents
Bucket: ytdg-documents
Region: us-east-1
Policy: Private (signed URLs for download)
File Structure:
  /users/{userId}/
  /documents/{documentId}/
  /temp/{tempFileId}/ (auto-delete after 24h)
```

---

## 8. DEPLOYMENT & INFRASTRUCTURE

### Docker Configuration:

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Kubernetes Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ytdg-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: ytdg-backend
  template:
    metadata:
      labels:
        app: ytdg-backend
    spec:
      containers:
      - name: backend
        image: ytdg-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### Environment Variables:

```
NODE_ENV=production
PORT=5000
CONVEX_DEPLOYMENT_KEY=your_key
NEXT_PUBLIC_CONVEX_URL=your_url
REDIS_URL=redis://...
JWT_SECRET=your_jwt_secret
YOUTUBE_API_KEY=your_key
GEMINI_API_KEY=your_key
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=ytdg-documents
SENDGRID_API_KEY=your_key
```

---

## 9. SECURITY ARCHITECTURE

### Authentication & Authorization:
```
Method: JWT + OAuth 2.0
Token Expiry: 1 hour
Refresh Token: 7 days
Storage: HttpOnly cookies
CORS: Configured
HTTPS: Enforced
```

### Data Protection:
```
Encryption:
  - In Transit: TLS 1.3
  - At Rest: Convex / S3 encryption
  - Sensitive Fields: AES-256

API Key Security:
  - Never expose in frontend
  - Rotate every 90 days
  - Use environment variables
  - Rate limiting: 100 req/hour (free), unlimited (paid)
```

### Input Validation:
```
- URL validation: URL parser + regex
- File upload: Type, size, virus scan
- API Input: Joi schema validation
- SQL Injection Prevention: Parameterized queries
- XSS Prevention: Input sanitization
```

---

## 10. PERFORMANCE OPTIMIZATION

### Caching Strategy:
```
Layer 1: Redis Cache
  - User sessions (24 hours)
  - Transcript data (30 days)
  - Generated documents (7 days)

Layer 2: Browser Cache
  - Static assets (1 year)
  - API responses (5 minutes)

Layer 3: CDN
  - Frontend assets via CloudFront
  - Exported documents via CloudFront
```

### Database Optimization:
```
Indexes: (as mentioned in schema section)
Query Optimization:
  - Column selection (avoid SELECT *)
  - Pagination (OFFSET & LIMIT)
  - SQL Joins & CTEs for report aggregation
Database Connection Pooling:
  - Min: 5, Max: 100
  - Timeout: 30 seconds
```

### API Optimization:
```
Response Compression: gzip, brotli
Pagination: 20 items per page
Field Filtering: Client can select fields
Batch Operations: Support bulk operations
Async Processing: Long-running tasks in queue (Bull/RabbitMQ)
```

---

## 11. MONITORING & LOGGING

### Logging:
```
Tool: Winston
Levels: error, warn, info, debug
Destination: CloudWatch, Local Files
Format: JSON with timestamps
Retention: 30 days
```

### Monitoring:
```
Tool: DataDog / New Relic
Metrics:
  - API response time
  - Database query performance
  - Error rate
  - Memory usage
  - CPU usage
Alerts:
  - Error rate > 5%
  - Response time > 2s
  - Memory usage > 80%
```

### Health Checks:
```
GET /health
GET /health/database
GET /health/redis
GET /health/youtube-api
GET /health/gemini-api
```

---

## 12. TESTING STRATEGY

### Unit Tests:
```
Tool: Jest
Coverage: 80% minimum
Files: Service layer, utilities
Command: npm run test:unit
```

### Integration Tests:
```
Tool: Jest + Supertest
Coverage: API endpoints, database operations
Command: npm run test:integration
Test Database: MongoDB (test instance)
```

### Load Testing:
```
Tool: Apache JMeter / K6
Scenario: 1000 concurrent users
Duration: 10 minutes
Success Rate: > 99%
```

### Security Testing:
```
Tool: OWASP ZAP
Checks:
  - SQL Injection
  - XSS Vulnerabilities
  - CORS Issues
  - API Rate Limiting
```

---

## 13. SCALABILITY PLAN

### Horizontal Scaling:
```
Load Balancer: AWS ALB
Auto-Scaling:
  - Min instances: 2
  - Max instances: 10
  - Scale up: When CPU > 70%
  - Scale down: When CPU < 30%
  - Cooldown: 5 minutes
```

### Database Scaling:
```
MongoDB Atlas:
  - Sharding: By userId
  - Replication: 3-node cluster
  - Backup: Automated daily
```

### Queue System (for async jobs):
```
Tool: Bull (Redis-based)
Queues:
  - documentGeneration (high priority)
  - exportTasks (medium priority)
  - emailNotifications (low priority)
Workers: 5 concurrent jobs
Retry: 3 attempts with exponential backoff
```

---

## 14. TECHNOLOGY DECISIONS & RATIONALE

| Decision | Alternative | Rationale |
|----------|-----------|-----------|
| Convex | MongoDB, Postgres | Real-time, file storage built-in, serverless functions native |
| Node.js | Python/Java | JavaScript ecosystem, fast development |
| React | Vue/Angular | Large community, ecosystem |
| Gemini API | GPT-4, LLaMA, Claude | Fast, high context window, cost-effective |
| Redis | Memcached | Support for complex data structures |
| AWS | GCP/Azure | Cost-effective, better India region |

---

## 15. TECHNICAL RISKS & MITIGATION

**Risk 1: YouTube API Shutdown/Changes**
- Mitigation: Manual transcript upload fallback
- Backup: Alternative transcript providers

**Risk 2: Gemini API Rate Limiting**
- Mitigation: Queue system with retry logic
- Backup: Caching of similar transcripts

**Risk 3: Database Performance**
- Mitigation: Proper indexing, query optimization
- Monitoring: Performance alerts

**Risk 4: Large File Processing**
- Mitigation: Async jobs, chunked processing
- Limits: Max 6 hour transcript length

---

**Document Version:** 1.0
**Last Updated:** May 2026
**Status:** DRAFT
**Technical Lead:** [Name]