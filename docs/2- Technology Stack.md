**Title: WhatsApp Ads Software - Technology Stack**

#### Purpose
This document details the technologies used in the WhatsApp Ads Software project, explaining their roles.

#### Content
The project leverages the following technologies:
- **Backend**: 
  - Framework: Express with "express-zod-api".
  - Purpose: Handles API endpoints, WebSocket connections, and integrates with whatsapp-web.js for ad sending.
- **Frontend**: 
  - Framework: Next.js (CSR mode).
  - Language: TypeScript only (no JavaScript allowed).
  - Purpose: Provides the user interface for ad creation, audience selection, and moderation.
- **Database**: 
  - Type: SQLite.
  - Purpose: Persistent storage for contacts, groups, phone book entries, ad campaigns, templates, and moderation logs.
- **WebSocket**: 
  - Type: Persistent connection between frontend and backend.
  - Purpose: Ensures real-time updates (e.g., connection status, QR code display, ad job progress).
- **WhatsApp Integration**: 
  - Library: whatsapp-web.js.
  - Purpose: Facilitates sending ads to WhatsApp contacts, groups, and non-contacts.

This stack ensures type safety, real-time functionality, and seamless WhatsApp automation.
