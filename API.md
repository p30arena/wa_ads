# WhatsApp Ads Software API Documentation

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
Authentication details will be handled through request headers. Specific implementation details to be added.

## WebSocket Events
The application uses WebSocket for real-time updates with the following event types:
- `whatsapp_status`: Updates about WhatsApp connection status
- `ad_job_update`: Updates about running ad campaigns
- `moderation_update`: Updates about content moderation activities

## Endpoints

### WhatsApp Management

#### GET /api/whatsapp/contacts
Get a paginated list of WhatsApp contacts.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `search` (optional): Search contacts by name or number
- `isMyContact` (optional): Filter by saved contacts (true/false)

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "phoneNumber": "string",
      "isMyContact": boolean,
      "profilePicUrl": "string (optional)",
      "lastSeen": "date (optional)",
      "status": "string (optional)"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### Ad Campaign Management

#### POST /api/ads/jobs
Create a new ad campaign job.

**Request Body:**
```json
{
  "templateId": "string",
  "targets": {
    "contacts": ["string"],
    "groups": ["string"],
    "numbers": ["string"]
  },
  "schedule": {
    "startAt": "datetime",
    "endAt": "datetime (optional)"
  }
}
```

#### GET /api/ads/jobs
Get a list of ad campaign jobs.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `status` (optional): Filter by job status

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "status": "pending | running | completed | failed",
      "progress": number,
      "createdAt": "datetime",
      "startedAt": "datetime",
      "completedAt": "datetime",
      "stats": {
        "sent": number,
        "failed": number,
        "pending": number
      }
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### Message Templates

#### GET /api/templates
Get message templates.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "content": "string",
      "variables": ["string"],
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### Moderation

#### GET /api/moderation/logs
Get moderation activity logs.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `action` (optional): Filter by moderation action

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "action": "approve | reject | flag",
      "reason": "string",
      "timestamp": "datetime",
      "moderator": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### Contact Groups

#### GET /api/groups
Get contact groups.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "memberCount": number,
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

## Rate Limiting
The API implements rate limiting on message sending operations. Specific limits will be included in API responses through headers.

## Error Responses
All error responses follow this format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {} // Optional additional error context
  }
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error
