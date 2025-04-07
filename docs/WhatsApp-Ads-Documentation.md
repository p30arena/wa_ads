# WhatsApp Ads Software - Documentation

## Project Overview

The WhatsApp Ads Software is a tool designed to send advertisements via WhatsApp to contacts, groups, and non-contacts. It includes a moderation panel for managing ad campaigns, controlling their execution, and monitoring their status.

### Key Objectives
- Enable efficient ad delivery via WhatsApp
- Provide real-time status updates and moderation capabilities
- Ensure scalability and type safety with modern technologies

## Technology Stack

The project leverages the following technologies:

### Backend
- **Framework**: Express with "express-zod-api"
- **Purpose**: Handles API endpoints, WebSocket connections, and integrates with whatsapp-web.js for ad sending

### Frontend
- **Framework**: Next.js (CSR mode)
- **Language**: TypeScript only
- **Purpose**: Provides the user interface for ad creation, audience selection, and moderation

### Database
- **Type**: SQLite with Prisma ORM
- **Purpose**: Persistent storage for contacts, groups, phone book entries, ad campaigns, templates, audience groups, and moderation logs

### WebSocket
- **Type**: Persistent connection between frontend and backend
- **Purpose**: Ensures real-time updates (e.g., connection status, QR code display, ad job progress)

### WhatsApp Integration
- **Library**: whatsapp-web.js
- **Purpose**: Facilitates sending ads to WhatsApp contacts, groups, and non-contacts

### Shared Code Structure
- **Type**: Local module (wa-shared)
- **Purpose**: Provides unified types and utilities shared between frontend and backend

## Core Features

### 1. WhatsApp Ad Sending System
- **Targets**: Contacts, joined groups, non-contacts (via Phone Book)
- **Supported Content**: Text messages, images, videos, multiple messages per campaign
- **UI**: Chatbox-style preview for creating message templates

### 2. Persistent WebSocket Connection
- Displays client connection status in real-time
- Shows QR Code for WhatsApp Web authentication (initial login or re-authentication)
- Provides live updates for ad job progress

### 3. Moderation Panel (Web-Based)
- **Features**:
  - Approve or reject ad campaigns
  - Start or stop active ad jobs
  - Monitor sent messages and delivery status
  - Schedule jobs for future execution

### 4. Audience Management
- **Contacts & Groups**: Fetch and display WhatsApp contacts and joined groups; allow selection for campaigns
- **Phone Book**: Store non-contact phone numbers, create custom groups, and select for ad sending
- **Audience Groups**: Create and manage reusable audience groups for targeting ad campaigns

### 5. Job Scheduling
- Schedule ads for future delivery
- Set specific date and time for job execution
- Control job execution with start/stop functionality

### 6. Storage & Persistence
- Uses SQLite with Prisma ORM to store:
  - Contacts and groups
  - Phone book entries
  - Ad campaigns, message templates, and moderation status
  - Audience groups

## System Architecture

### Backend (Express with express-zod-api)
- **Responsibilities**:
  - API endpoints for fetching contacts/groups, managing phone book, ad jobs, and moderation tasks
  - Maintains WebSocket connection with the frontend
  - Integrates whatsapp-web.js for sending ads
  - Uses SQLite with Prisma ORM for data persistence
  - Provides job scheduling and control functionality
- **Key Interactions**: Receives frontend requests, processes them, and communicates with WhatsApp

### Frontend (Next.js - CSR with TypeScript)
- **Responsibilities**:
  - Displays UI for WhatsApp authentication (QR Code on login)
  - Provides chatbox-style message template creation
  - Allows audience selection (contacts, groups, phone book, audience groups)
  - Hosts moderation panel (approve, start/stop jobs, schedule jobs)
- **Key Interactions**: Connects to backend via WebSocket for real-time updates and API calls for data

### Shared Code Module (wa-shared)
- **Responsibilities**:
  - Provides unified type definitions used by both frontend and backend
  - Contains shared utilities and constants
  - Ensures type consistency across the application
- **Key Interactions**: Imported by both frontend and backend to maintain type safety

## Database Schema

### 1. Users
- **Columns**: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `session (TEXT)`
- **Purpose**: Stores user data and WhatsApp session info

### 2. Contacts & Groups
- **Columns**: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `group_id (TEXT)`
- **Purpose**: Tracks WhatsApp contacts and groups

### 3. Phone Book
- **Columns**: `id (INTEGER, PK)`, `name (TEXT)`, `phone (TEXT)`, `group_name (TEXT)`
- **Purpose**: Manages non-contact phone numbers and custom groups

### 4. Message Templates
- **Columns**: `id (INTEGER, PK)`, `title (TEXT)`, `content (TEXT, JSON)`
- **Purpose**: Stores reusable ad message templates

### 5. Ad Jobs
- **Columns**: `id (INTEGER, PK)`, `user_id (INTEGER)`, `template_id (INTEGER)`, `status (TEXT)`, `audience (TEXT, JSON)`
- **Purpose**: Tracks ad campaigns, their status, and target audience

### 6. Moderation Logs
- **Columns**: `id (INTEGER, PK)`, `job_id (INTEGER)`, `moderator (TEXT)`, `action (TEXT)`
- **Purpose**: Logs moderation actions for auditing

### 7. Audience Groups
- **Columns**: `id (INTEGER, PK)`, `name (TEXT)`, `contacts (TEXT, JSON)`, `groups (TEXT, JSON)`, `createdAt (DATETIME)`, `updatedAt (DATETIME)`
- **Purpose**: Manages reusable audience groups for targeting ad campaigns

## Workflow

### 1. Authentication & Connection
- User logs in
- WebSocket connection is established
- If no session exists, QR Code is displayed for WhatsApp login
- WebSocket tracks connection status

### 2. Creating an Ad Campaign
- User selects audience (contacts, groups, phone book, or audience groups)
- User picks or creates a message template
- User can schedule the job for future execution
- Submits campaign for moderation
- Admin approves or rejects

### 3. Sending Ads
- Approved jobs start immediately or at scheduled time
- whatsapp-web.js sends messages
- WebSocket updates frontend with progress

### 4. Moderation
- Admin reviews pending jobs
- Approves or rejects them
- Can start, stop, or reschedule approved jobs
- Approved jobs proceed; rejected ones are archived

## Future Enhancements

- Support multiple WhatsApp accounts per user
- Add an analytics dashboard for ad performance tracking
- Integrate AI for message optimization

## Rate Limiting

- Limit ad sending rates to avoid WhatsApp bans
- Implement configurable rate limits for different types of messages
