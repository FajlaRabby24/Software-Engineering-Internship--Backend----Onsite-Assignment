# AI SaaS Platform — Postman Testing Guide

> **Base URL**: `http://localhost:3000`  
> **Swagger UI**: `http://localhost:3000/api/docs`  
> **Environment Variables in Postman**:
> - `baseUrl`: `http://localhost:3000`
> - `userToken`: Bearer JWT token of standard user
> - `adminToken`: Bearer JWT token of admin user
> - `refreshToken`: Refresh token received on login
> - `conversationId`: UUID of a chat conversation
> - `providerId`: UUID of an AI provider

---

## 1. Authentication (`/auth`)

### 1.1 Register User
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/register`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "role": "USER",
    "phoneNumber": "+1234567890"
  }
  ```

---

### 1.2 Register Admin
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/register`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "Super Admin",
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "role": "ADMIN"
  }
  ```

---

### 1.3 Login
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/login`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
> **Tip**: Copy the `accessToken` into `{{userToken}}` and `refreshToken` into `{{refreshToken}}`.

---

### 1.4 Refresh Token
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/refresh`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "refreshToken": "{{refreshToken}}"
  }
  ```

---

### 1.5 Logout (Current Session)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/logout`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "refreshToken": "{{refreshToken}}"
  }
  ```

---

### 1.6 Logout All Devices
- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/logout-all`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

## 2. User Profile (`/users`)

### 2.1 Get Current Profile
- **Method**: `GET`
- **URL**: `{{baseUrl}}/users/profile`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 2.2 Update Profile
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/users/profile`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "Jane Smith",
    "phoneNumber": "+1987654321",
    "avatarUrl": "https://example.com/avatar.jpg"
  }
  ```

---

### 2.3 Change Password
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/users/change-password`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "oldPassword": "Password123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```

---

### 2.4 Delete Account
- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/users/account`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "password": "NewStrongPassword456!"
  }
  ```

---

## 3. Subscriptions & Usage (`/subscriptions`)

### 3.1 Get Subscription Status
- **Method**: `GET`
- **URL**: `{{baseUrl}}/subscriptions/status`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 3.2 Get Remaining Usage Quota
- **Method**: `GET`
- **URL**: `{{baseUrl}}/subscriptions/remaining`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 3.3 Upgrade to PREMIUM
- **Method**: `POST`
- **URL**: `{{baseUrl}}/subscriptions/upgrade`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 3.4 Downgrade to FREE
- **Method**: `POST`
- **URL**: `{{baseUrl}}/subscriptions/downgrade`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

## 4. AI Providers (Admin Only) (`/ai-providers`)

> **Note**: Requires an Admin token (`Authorization: Bearer {{adminToken}}`).

### 4.1 Create Provider (OpenAI)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/ai-providers`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "OpenAI Production",
    "type": "OPENAI",
    "apiKey": "sk-proj-YOUR_API_KEY_HERE",
    "baseUrl": "https://api.groq.com/openai/v1",
    "models": ["gpt-4o", "gpt-4o-mini"],
    "isDefault": true
  }
  ```

---

### 4.2 Create Provider (Claude)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/ai-providers`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "Anthropic Claude",
    "type": "CLAUDE",
    "apiKey": "sk-ant-YOUR_API_KEY_HERE",
    "baseUrl": "https://api.groq.com/openai/v1",
    "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    "isDefault": false
  }
  ```

---

### 4.3 Create Provider (Gemini)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/ai-providers`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "Google Gemini",
    "type": "GEMINI",
    "apiKey": "AIzaSy_YOUR_API_KEY_HERE",
    "baseUrl": "https://api.groq.com/openai/v1",
    "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
    "isDefault": false
  }
  ```

---

### 4.4 List All Providers
- **Method**: `GET`
- **URL**: `{{baseUrl}}/ai-providers`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 4.5 Get Provider by ID
- **Method**: `GET`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 4.6 Update Provider
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "name": "OpenAI Primary",
    "models": ["gpt-4o", "gpt-4o-mini", "o1-mini"]
  }
  ```

---

### 4.7 Toggle Active / Inactive
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}/toggle`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 4.8 Set as Default Provider
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}/set-default`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 4.9 Test Provider Health
- **Method**: `GET`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}/health`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 4.10 Delete Provider (Soft Delete)
- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/ai-providers/{{providerId}}`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

## 5. Chat & Streaming (`/chat`)

### 5.1 Send Prompt (Standard JSON Response)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/chat`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "prompt": "What are 3 practical benefits of TypeScript over vanilla JavaScript?",
    "model": "gpt-4o-mini"
  }
  ```
> **With existing conversation**:
```json
{
  "prompt": "Can you give me a code snippet illustrating the first benefit?",
  "conversationId": "{{conversationId}}"
}
```

---

### 5.2 Stream Prompt (Server-Sent Events / SSE)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/chat/stream`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Accept: text/event-stream
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "prompt": "Write a short poem about coding in TypeScript."
  }
  ```

---

### 5.3 List User Conversations
- **Method**: `GET`
- **URL**: `{{baseUrl}}/chat/conversations`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 5.4 Get Conversation Messages
- **Method**: `GET`
- **URL**: `{{baseUrl}}/chat/conversations/{{conversationId}}/messages`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 5.5 Delete Conversation
- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/chat/conversations/{{conversationId}}`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

## 6. AI Web Search (`/web-search`)

### 6.1 Perform Web Search & AI Synthesis
- **Method**: `POST`
- **URL**: `{{baseUrl}}/web-search`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "query": "NestJS 11 release date and roadmap"
  }
  ```

---

### 6.2 Get Search History
- **Method**: `GET`
- **URL**: `{{baseUrl}}/web-search/history?limit=10`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 6.3 Get Recent Searches (Unique Queries)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/web-search/recent?limit=5`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 6.4 Get Search Autocompletion Suggestions
- **Method**: `GET`
- **URL**: `{{baseUrl}}/web-search/suggestions?q=type`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

### 6.5 Delete Search History Entry
- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/web-search/history/:id`
- **Headers**:
  ```http
  Authorization: Bearer {{userToken}}
  ```

---

## 7. Admin Panel (`/admin`)

> **Note**: All routes require an Admin token (`Authorization: Bearer {{adminToken}}`).

### 7.1 Dashboard Statistics
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/dashboard/stats`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.2 List Users (with Pagination & Search)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/users?page=1&limit=10&search=jane`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.3 Toggle User Status (Activate / Deactivate)
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/admin/users/:userId/status`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.4 Update User Role (USER ⇄ ADMIN)
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/admin/users/:userId/role`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "role": "ADMIN"
  }
  ```

---

### 7.5 List Subscriptions (with Filters & Search)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/subscriptions?page=1&limit=10&plan=PREMIUM&status=ACTIVE&search=jane`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.6 Admin Plan Override
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/admin/subscriptions/:userId`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "plan": "PREMIUM",
    "status": "ACTIVE",
    "durationDays": 60
  }
  ```

---

### 7.7 Usage Analytics & Trends
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/analytics/usage?days=7`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.8 Chronological Request Activity Logs
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/logs/requests?page=1&limit=20&statusCode=200&method=POST`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

### 7.9 System Health Check
- **Method**: `GET`
- **URL**: `{{baseUrl}}/admin/system/health`
- **Headers**:
  ```http
  Authorization: Bearer {{adminToken}}
  ```

---

## 8. Quick Postman Test Flow

1. **Step 1**: Register user via `POST /auth/register`
2. **Step 2**: Login user via `POST /auth/login` ➔ Save `accessToken`
3. **Step 3**: Check profile via `GET /users/profile`
4. **Step 4**: Check quota via `GET /subscriptions/remaining` (shows 50 free requests)
5. **Step 5**: Send AI chat prompt via `POST /chat` ➔ Re-check quota (decreases to 49)
6. **Step 6**: Perform web search via `POST /web-search`
7. **Step 7**: Login admin via `POST /auth/login` with admin credentials ➔ Save `adminToken`
8. **Step 8**: Check dashboard stats via `GET /admin/dashboard/stats`
9. **Step 9**: Inspect request audit log via `GET /admin/logs/requests`
10. **Step 10**: Check system memory & DB health via `GET /admin/system/health`
