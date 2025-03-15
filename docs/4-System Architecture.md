**Title: WhatsApp Ads Software - System Architecture**

#### Purpose
This document describes the architecture of the WhatsApp Ads Software, detailing backend and frontend responsibilities.

#### Content
- **Backend (Express with express-zod-api)**
  - Responsibilities:
    - API endpoints for fetching contacts/groups, managing phone book, ad jobs, and moderation tasks.
    - Maintains WebSocket connection with the frontend.
    - Integrates whatsapp-web.js for sending ads.
    - Uses SQLite for data persistence.
  - Key Interactions: Receives frontend requests, processes them, and communicates with WhatsApp.

- **Frontend (Next.js - CSR with TypeScript)**
  - Responsibilities:
    - Displays UI for WhatsApp authentication (QR Code on login).
    - Provides chatbox-style message template creation.
    - Allows audience selection (contacts, groups, phone book).
    - Hosts moderation panel (approve, start/stop jobs).
  - Key Interactions: Connects to backend via WebSocket for real-time updates and API calls for data.

The architecture ensures a clear separation of concerns, with the backend handling logic and the frontend focusing on user interaction.