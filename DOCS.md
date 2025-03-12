**# WhatsApp Ads Software - Project Documentation**

## **Overview**
This project is a **WhatsApp Ads Software** designed for sending advertisements to contacts, groups, and non-contacts via WhatsApp. It includes a **moderation panel** to manage ad jobs, control sending, and monitor status. The backend is a **web-based Express app ("express-zod-api")**, while the frontend is a **Client-Side Rendered (CSR) Next.js app**, strictly using TypeScript. The system ensures real-time updates through persistent **WebSocket connections** and utilizes **whatsapp-web.js** for ad delivery.

## **Technology Stack**
- **Backend:** Express with "express-zod-api"
- **Frontend:** Next.js (CSR mode, TypeScript only, no JavaScript)
- **Database:** SQLite (persistent storage)
- **WebSocket:** Persistent WebSocket connection between frontend and backend
- **WhatsApp Integration:** whatsapp-web.js

---

## **Core Features**
### **1. WhatsApp Ad Sending System**
- Send ads to:
  - Contacts
  - Groups joined
  - Non-contacts (via Phone Book)
- Supports sending:
  - Text messages
  - Images
  - Videos
  - Multiple messages in a single campaign
- UI for creating **message templates**, displayed as a chatbox-style preview

### **2. Persistent WebSocket Connection**
- WebSocket ensures:
  - Client connection status is displayed in real-time
  - QR Code authentication for WhatsApp Web when needed (first login, re-authentication)
  - Live updates for ad jobs

### **3. Moderation Panel (Web-Based)**
- Admin can:
  - Approve or reject ad campaigns
  - Start or stop running ad jobs
  - Monitor sent messages and delivery status

### **4. Audience Management**
#### **4.1 Contacts & Groups Management**
- Fetch and display **WhatsApp contacts** and **groups joined**
- Select contacts/groups when creating an ad campaign

#### **4.2 Phone Book Management**
- Store non-contacts (manual entry of phone numbers)
- Ability to **create groups** within the phone book
- Select numbers or groups from the phone book for ad sending

### **5. Storage & Persistence**
- SQLite database for storing:
  - Contacts
  - Groups
  - Phone book entries
  - Ad campaigns
  - Message templates
  - Moderation status

---

## **System Architecture**
### **Backend (Express with express-zod-api)**
- Manages API endpoints for:
  - Contacts & Groups fetching
  - Phone Book Management
  - Ad Job Management
  - Moderation Panel Operations
- Maintains WebSocket connection with the frontend
- Integrates with whatsapp-web.js for ad sending
- Uses SQLite for persistent data storage

### **Frontend (Next.js - CSR with TypeScript)**
- Implements UI for:
  - WhatsApp authentication (QR Code display on login)
  - Message Template Creation (chatbox-style)
  - Audience Selection (Contacts, Groups, Phone Book)
  - Moderation Panel (Job Approval, Start/Stop Control)
- Connects via WebSocket for real-time updates

---

## **Database Schema (SQLite)**
### **1. Users**
| Column       | Type      | Description               |
|-------------|----------|---------------------------|
| id          | INTEGER  | Primary Key               |
| name        | TEXT     | User's Name               |
| phone       | TEXT     | WhatsApp Phone Number     |
| session     | TEXT     | WhatsApp Session Data     |

### **2. Contacts & Groups**
| Column       | Type      | Description                    |
|-------------|----------|--------------------------------|
| id          | INTEGER  | Primary Key                    |
| name        | TEXT     | Contact/Group Name             |
| phone       | TEXT     | Contact Number (if applicable) |
| group_id    | TEXT     | WhatsApp Group ID (if any)     |

### **3. Phone Book**
| Column       | Type      | Description              |
|-------------|----------|--------------------------|
| id          | INTEGER  | Primary Key              |
| name        | TEXT     | Name in Phone Book       |
| phone       | TEXT     | Phone Number             |
| group_name  | TEXT     | Custom Group Name        |

### **4. Message Templates**
| Column       | Type      | Description             |
|-------------|----------|-------------------------|
| id          | INTEGER  | Primary Key             |
| title       | TEXT     | Template Name           |
| content     | TEXT     | Message Content (JSON)  |

### **5. Ad Jobs**
| Column       | Type      | Description                         |
|-------------|----------|-------------------------------------|
| id          | INTEGER  | Primary Key                         |
| user_id     | INTEGER  | Creator of the ad job               |
| template_id | INTEGER  | Message template used               |
| status      | TEXT     | Pending / Running / Completed      |
| audience    | TEXT     | JSON (selected contacts/groups)    |

### **6. Moderation Logs**
| Column       | Type      | Description                      |
|-------------|----------|----------------------------------|
| id          | INTEGER  | Primary Key                      |
| job_id      | INTEGER  | Related Ad Job                   |
| moderator   | TEXT     | Admin/moderator name             |
| action      | TEXT     | Approved / Rejected / Modified   |

---

## **Workflow**
### **1. Authentication & Connection**
1. User logs in
2. WebSocket connection is established
3. If the session is not found, a QR Code is displayed for WhatsApp login
4. Once authenticated, WebSocket keeps tracking connection status

### **2. Creating an Ad Campaign**
1. User selects audience (Contacts, Groups, Phone Book)
2. User selects a message template or creates a new one
3. Submits for moderation
4. Admin approves/rejects

### **3. Sending Ads**
1. Approved ad jobs are started
2. Messages are sent via whatsapp-web.js
3. WebSocket updates the frontend with the status

### **4. Moderation**
1. Admin views pending jobs
2. Can approve/reject
3. If approved, jobs are sent; otherwise, they are archived

---

## **Security Considerations**
- **WhatsApp Session Management:** Sessions should be securely stored to avoid repeated logins
- **Data Privacy:** SQLite database should be encrypted or access-controlled
- **Rate Limiting:** Implement a sending limit to prevent WhatsApp from blocking the number
- **WebSocket Security:** Authenticate users before establishing WebSocket connections

---

## **Future Enhancements**
- Support for multiple WhatsApp accounts per user
- Analytics dashboard for tracking ad performance
- Scheduling feature for automated ad sending
- AI-powered message optimization

---

## **Conclusion**
This WhatsApp Ads Software enables efficient **WhatsApp-based advertising** with **real-time moderation**, **audience selection**, and **message template management**. Built with **TypeScript, Express, and Next.js**, it ensures scalability, security, and ease of use while integrating seamlessly with **whatsapp-web.js** for WhatsApp automation.

