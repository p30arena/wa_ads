**Title: WhatsApp Ads Software - Workflow**

#### Purpose
This document explains the operational workflow of the WhatsApp Ads Software.

#### Content
1. **Authentication & Connection**
   - User logs in.
   - WebSocket connection is established.
   - If no session exists, QR Code is displayed for WhatsApp login.
   - WebSocket tracks connection status.

2. **Creating an Ad Campaign**
   - User selects audience (contacts, groups, phone book).
   - User picks or creates a message template.
   - Submits campaign for moderation.
   - Admin approves or rejects.

3. **Sending Ads**
   - Approved jobs start.
   - whatsapp-web.js sends messages.
   - WebSocket updates frontend with progress.

4. **Moderation**
   - Admin reviews pending jobs.
   - Approves or rejects them.
   - Approved jobs proceed; rejected ones are archived.

This workflow ensures a smooth process from login to ad delivery.