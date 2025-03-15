**Title: WhatsApp Ads Software - Database Schema**

#### Purpose
This document defines the SQLite database schema used for persistent storage.

#### Content
1. **Users**
   - Columns: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `session (TEXT)`.
   - Purpose: Stores user data and WhatsApp session info.

2. **Contacts & Groups**
   - Columns: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `group_id (TEXT)`.
   - Purpose: Tracks WhatsApp contacts and groups.

3. **Phone Book**
   - Columns: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `group_name (TEXT)`.
   - Purpose: Manages non-contact phone numbers and custom groups.

4. **Message Templates**
   - Columns: `id (INTEGER, PK)`, `title (TEXT)`, `content (TEXT, JSON)`.
   - Purpose: Stores reusable ad message templates.

5. **Ad Jobs**
   - Columns: `id (INTEGER, PK)`, `user_id (INTEGER)`, `template_id (INTEGER)`, `status (TEXT)`, `audience (TEXT, JSON)`.
   - Purpose: Tracks ad campaigns, their status, and target audience.

6. **Moderation Logs**
   - Columns: `id (INTEGER, PK)`, `job_id (INTEGER)`, `moderator (TEXT)`, `action (TEXT)`.
   - Purpose: Logs moderation actions for auditing.

This schema supports all core features with relational integrity.