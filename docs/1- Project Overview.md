**Title: WhatsApp Ads Software - Project Overview**

#### Purpose
This document provides a high-level summary of the WhatsApp Ads Software project, outlining its goals and core components.

#### Content
The WhatsApp Ads Software is a tool designed to send advertisements via WhatsApp to contacts, groups, and non-contacts. It includes a moderation panel for managing ad campaigns, controlling their execution, and monitoring their status. The system comprises:
- A **backend**: Web-based Express app built with "express-zod-api".
- A **frontend**: Client-Side Rendered (CSR) Next.js app, written exclusively in TypeScript (no JavaScript).
- **Real-time updates**: Achieved through persistent WebSocket connections.
- **WhatsApp integration**: Powered by whatsapp-web.js for sending ads.

The software aims to streamline WhatsApp-based advertising with features like audience selection, message templates, and moderation controls, all stored persistently in an SQLite database.

#### Key Objectives
- Enable efficient ad delivery via WhatsApp.
- Provide real-time status updates and moderation capabilities.
- Ensure scalability and type safety with modern technologies.