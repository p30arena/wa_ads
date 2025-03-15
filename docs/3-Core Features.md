**Title: WhatsApp Ads Software - Core Features**

#### Purpose
This document outlines the primary features of the WhatsApp Ads Software, focusing on functionality.

#### Content
1. **WhatsApp Ad Sending System**
   - Targets: Contacts, joined groups, non-contacts (via Phone Book).
   - Supported Content: Text messages, images, videos, multiple messages per campaign.
   - UI: Chatbox-style preview for creating message templates.

2. **Persistent WebSocket Connection**
   - Displays client connection status in real-time.
   - Shows QR Code for WhatsApp Web authentication (initial login or re-authentication).
   - Provides live updates for ad job progress.

3. **Moderation Panel (Web-Based)**
   - Features:
     - Approve or reject ad campaigns.
     - Start or stop active ad jobs.
     - Monitor sent messages and delivery status.

4. **Audience Management**
   - **Contacts & Groups**: Fetch and display WhatsApp contacts and joined groups; allow selection for campaigns.
   - **Phone Book**: Store non-contact phone numbers, create custom groups, and select for ad sending.

5. **Storage & Persistence**
   - Uses SQLite to store:
     - Contacts and groups.
     - Phone book entries.
     - Ad campaigns, message templates, and moderation status.

These features enable flexible ad creation, audience targeting, and administrative control.