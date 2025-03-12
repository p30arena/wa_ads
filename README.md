# WhatsApp Ads Software

A powerful WhatsApp advertising platform that enables sending ads to contacts, groups, and non-contacts via WhatsApp. Features include a moderation panel, real-time updates, and message template management.

## Technology Stack

- **Backend**: Express.js with express-zod-api
- **Frontend**: Next.js (CSR mode, TypeScript)
- **Database**: SQLite
- **WebSocket**: Real-time updates
- **WhatsApp Integration**: whatsapp-web.js

## Features

- Send ads to WhatsApp contacts, groups, and non-contacts
- Real-time updates via WebSocket
- Moderation panel for ad campaign approval
- Message template management
- Audience management (contacts, groups, phone book)
- Live status tracking for ad campaigns

## Project Structure

```
whatsapp-ads/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── entities/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── websocket/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    └── (Next.js structure - coming soon)
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SQLite

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```env
   PORT=8000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

Coming soon...

## Database Schema

The application uses SQLite with the following core tables:

- Users
- Contacts & Groups
- Phone Book
- Message Templates
- Ad Jobs
- Moderation Logs

## WebSocket Events

The application uses WebSocket for real-time updates with the following event types:

- `whatsapp:qr` - QR code for WhatsApp Web authentication
- `whatsapp:ready` - WhatsApp client is ready
- `whatsapp:authenticated` - Successfully authenticated
- `whatsapp:disconnected` - WhatsApp client disconnected
- `ad:status` - Ad job status updates
- `ad:progress` - Ad sending progress updates

## Security Considerations

- WhatsApp sessions are securely stored using LocalAuth
- SQLite database is protected within the application directory
- Rate limiting is implemented to prevent WhatsApp blocking
- WebSocket connections are authenticated

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
