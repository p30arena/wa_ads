## Tasks

### 1. Complete Ad Sending Logic
**Objective**: Enable sending text, images, and videos to WhatsApp contacts, groups, and phone book numbers via `whatsapp-web.js`.

#### Steps
1. **Enhance WhatsAppService** (`backend/src/services/WhatsAppService.ts`):
   - Add a `sendAdCampaign` method:
     ```ts
     async sendAdCampaign(adJob: AdJob): Promise<void> {
       if (!this.client || !this.isReady()) {
         throw new Error('WhatsApp client not ready');
       }
       const audience = JSON.parse(adJob.audience);
       const template = await AppDataSource.getRepository(MessageTemplate).findOneBy({ id: adJob.templateId });
       if (!template) throw new Error('Template not found');

       for (const message of template.messages) {
         // Send to contacts
         for (const contactId of audience.contacts || []) {
           await this.client.sendMessage(`${contactId}@c.us`, message);
           adJob.messagesSent++;
           adJob.messagesDelivered++;
           await AppDataSource.getRepository(AdJob).save(adJob);
           this.wsManager?.broadcast('ad:progress', { jobId: adJob.id, sent: adJob.messagesSent });
         }
         // Send to groups
         for (const groupId of audience.groups || []) {
           await this.client.sendMessage(`${groupId}@g.us`, message);
           adJob.messagesSent++;
           adJob.messagesDelivered++;
           await AppDataSource.getRepository(AdJob).save(adJob);
           this.wsManager?.broadcast('ad:progress', { jobId: adJob.id, sent: adJob.messagesSent });
         }
         // Send to phone book numbers
         for (const number of audience.numbers || []) {
           await this.client.sendMessage(`${number}@c.us`, message);
           adJob.messagesSent++;
           adJob.messagesDelivered++;
           await AppDataSource.getRepository(AdJob).save(adJob);
           this.wsManager?.broadcast('ad:progress', { jobId: adJob.id, sent: adJob.messagesSent });
         }
       }
       adJob.status = 'completed';
       await AppDataSource.getRepository(AdJob).save(adJob);
       this.wsManager?.broadcast('ad:complete', { jobId: adJob.id });
     }
     ```
   - Update `initialize` to set up event listeners for message delivery confirmation if needed.

2. **Integrate with AdJob Endpoint** (`backend/src/routes/index.ts`):
   - Add a `start` endpoint to trigger sending:
     ```ts
     start: e.build({
       method: 'post',
       path: '/ads/start',
       input: z.object({ id: z.number() }),
       output: z.object({ success: z.boolean() }),
       handler: async ({ input, options }) => {
         const adJobRepo = AppDataSource.getRepository(AdJob);
         const adJob = await adJobRepo.findOneBy({ id: input.id });
         if (!adJob || adJob.status !== 'approved') throw new Error('Invalid or unapproved job');
         adJob.status = 'running';
         await adJobRepo.save(adJob);
         options.whatsappService.sendAdCampaign(adJob);
         return { success: true };
       },
     }),
     ```

3. **Support Images/Videos**:
   - Extend `MessageTemplate.messages` to support media (e.g., `{ type: 'text' | 'image' | 'video', content: string, url?: string }`).
   - Update `sendAdCampaign` to handle media using `whatsapp-web.js`’s `MessageMedia`.

#### Deliverables
- Updated `WhatsAppService` with ad sending logic.
- New `/api/ads/start` endpoint.
- Support for multimedia messages.

---

### 2. Build Frontend Pages
**Objective**: Create UI pages for ad campaign creation, moderation, and status monitoring.

#### Steps
1. **Ad Campaign Creation Page** (`frontend/src/app/campaigns/new/page.tsx`):
   - Create a form to select audience and templates:
     ```tsx
     'use client';
     import { useState } from 'react';
     import { templateApi, phoneBookApi, whatsappApi } from '@/services/api';

     export default function NewCampaign() {
       const [audience, setAudience] = useState({ contacts: [], groups: [], numbers: [] });
       const [templateId, setTemplateId] = useState<number | null>(null);

       const handleSubmit = async () => {
         const response = await fetch('/api/ads/create', {
           method: 'POST',
           body: JSON.stringify({ templateId, audience: JSON.stringify(audience), status: 'pending' }),
         });
         if (response.ok) alert('Campaign created!');
       };

       return (
         <div className="p-6">
           <h1 className="text-2xl font-bold">New Campaign</h1>
           <select onChange={(e) => setTemplateId(Number(e.target.value))}>
             {/* Fetch templates via templateApi */}
           </select>
           <div>
             <h2>Audience</h2>
             {/* Fetch contacts, groups, phone book via APIs */}
             <button onClick={handleSubmit}>Submit for Moderation</button>
           </div>
         </div>
       );
     }
     ```

2. **Moderation Panel** (`frontend/src/app/moderation/page.tsx`):
   - List pending jobs and add approve/reject controls:
     ```tsx
     'use client';
     import { useEffect, useState } from 'react';
     import { adJobApi, moderationApi } from '@/services/api';

     export default function ModerationPanel() {
       const [jobs, setJobs] = useState<AdJob[]>([]);

       useEffect(() => {
         adJobApi.getJobs().then((res) => setJobs(res.data.filter(j => j.status === 'pending')));
       }, []);

       const moderate = (jobId: number, action: 'approved' | 'rejected') => {
         moderationApi.moderateJob(jobId, action).then(() => {
           setJobs(jobs.filter(j => j.id !== jobId));
         });
       };

       return (
         <div className="p-6">
           <h1 className="text-2xl font-bold">Moderation Queue</h1>
           {jobs.map(job => (
             <div key={job.id}>
               <p>Job #{job.id} - Template: {job.templateId}</p>
               <button onClick={() => moderate(job.id, 'approved')}>Approve</button>
               <button onClick={() => moderate(job.id, 'rejected')}>Reject</button>
             </div>
           ))}
         </div>
       );
     }
     ```

3. **Status Dashboard** (`frontend/src/app/dashboard/page.tsx`):
   - Display running/completed jobs with WebSocket updates:
     ```tsx
     'use client';
     import { useWebSocket } from '@/hooks/useWebSocket';

     export default function Dashboard() {
       const { status, sendMessage } = useWebSocket();

       return (
         <div className="p-6">
           <h1 className="text-2xl font-bold">Dashboard</h1>
           <p>WhatsApp: {status.isConnected ? 'Connected' : 'Disconnected'}</p>
           {/* Add job list with real-time updates */}
         </div>
       );
     }
     ```

#### Deliverables
- New campaign creation page.
- Moderation panel with job controls.
- Dashboard with real-time status.

---

### 3. Implement Scheduling
**Objective**: Allow ad jobs to run at scheduled times.

#### Steps
1. **Add Scheduler Dependency**:
   - Install `node-schedule`: `npm install node-schedule`.
2. **Update AdJob Entity** (`backend/src/entities/AdJob.ts`):
   - Ensure `schedule` is parsed as JSON: `{ startAt: string, endAt?: string }`.
3. **Create Scheduler Service** (`backend/src/services/SchedulerService.ts`):
   ```ts
   import { scheduleJob } from 'node-schedule';
   import { AppDataSource } from '../config/database';
   import { AdJob } from '../entities/AdJob';
   import { WhatsAppService } from './WhatsAppService';

   export class SchedulerService {
     constructor(private whatsappService: WhatsAppService) {
       this.schedulePendingJobs();
     }

     async schedulePendingJobs() {
       const adJobRepo = AppDataSource.getRepository(AdJob);
       const jobs = await adJobRepo.find({ where: { status: 'approved' } });
       jobs.forEach(job => {
         const schedule = JSON.parse(job.schedule || '{}');
         if (schedule.startAt) {
           scheduleJob(new Date(schedule.startAt), () => {
             job.status = 'running';
             adJobRepo.save(job);
             this.whatsappService.sendAdCampaign(job);
           });
         }
       });
     }
   }
   ```
4. **Integrate with Server** (`backend/src/index.ts`):
   - Initialize `SchedulerService` after `WhatsAppService`.

#### Deliverables
- Scheduling functionality for ad jobs.

---

### 4. Enhance Security
**Objective**: Secure WhatsApp sessions and WebSocket connections.

#### Steps
1. **Encrypt User Sessions** (`backend/src/entities/User.ts`):
   - Use `crypto` to encrypt `session`:
     ```ts
     import { encrypt, decrypt } from 'crypto'; // Configure with a secret key
     @Column({ type: 'text', nullable: true, transformer: {
       to: (value: string) => encrypt(value, process.env.SESSION_SECRET),
       from: (value: string) => decrypt(value, process.env.SESSION_SECRET),
     } })
     session!: string;
     ```
2. **WebSocket Authentication** (`backend/src/services/WebSocketManager.ts`):
   - Add a token check on connection:
     ```ts
     this.wss.on('connection', (ws, req) => {
       const token = req.headers['authorization'];
       if (!token || !verifyToken(token)) {
         ws.close(1008, 'Unauthorized');
         return;
       }
       this.clients.add(ws);
       // ...
     });
     ```

#### Deliverables
- Encrypted session storage.
- Authenticated WebSocket connections.

---

### 5. Test and Refine
**Objective**: Ensure reliability and stability.

#### Steps
1. **Test Ad Sending**:
   - Simulate sending to contacts, groups, and numbers; verify WebSocket updates.
2. **Test WebSocket**:
   - Disconnect/reconnect scenarios; ensure QR code persists correctly.
3. **Test Rate Limiting**:
   - Send messages rapidly to confirm `RateLimiterService` works.

#### Deliverables
- Test reports and bug fixes.

---

## Priorities
1. **Ad Sending Logic**: Core feature, critical for functionality.
2. **Frontend Pages**: Essential for user interaction.
3. **Scheduling**: Adds flexibility to campaigns.
4. **Security**: Protects the system long-term.
5. **Testing**: Ensures stability.
