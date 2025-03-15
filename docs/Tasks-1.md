## Tasks

### 1. Add Audience Group Management Sidebar Item
**Objective**: Add a new sidebar item labeled "Audience Groups" to navigate to a management page.

#### Steps
1. **Update Navigation Component** (`frontend/src/components/Navigation.tsx`):
   - Add "Audience Groups" to the `navigation` array:
     ```tsx
     const navigation = [
       { name: 'Dashboard', href: '/dashboard' },
       { name: 'Contacts & Groups', href: '/contacts-groups' },
       { name: 'Message Templates', href: '/message-templates' },
       { name: 'Ad Jobs', href: '/ad-jobs' },
       { name: 'Analytics', href: '/analytics' },
       { name: 'Schedule', href: '/schedule' },
       { name: 'Audience Groups', href: '/audience-groups' }, // Add this line
     ];
     ```
   - Ensure the active state logic works for the new item.

#### Deliverables
- Updated `Navigation.tsx` with "Audience Groups" item.

---

### 2. Create Audience Groups Management Page
**Objective**: Build a page at `/audience-groups` to create, edit, and delete audience groups by selecting contacts and groups from WhatsApp.

#### Steps
1. **Create New Page** (`frontend/src/app/audience-groups/page.tsx`):
   - Implement a form to manage audience groups:
     ```tsx
     'use client';
     import { useState, useEffect } from 'react';
     import { Button } from '@/components/ui/button';
     import { whatsappApi } from '@/services/api';
     import { Contact, Group } from '@/shared/types/contacts';

     export default function AudienceGroups() {
       const [contacts, setContacts] = useState<Contact[]>([]);
       const [groups, setGroups] = useState<Group[]>([]);
       const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
       const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
       const [audienceGroups, setAudienceGroups] = useState<{ id: string; name: string; contacts: string[]; groups: string[] }[]>([]);
       const [newGroupName, setNewGroupName] = useState('');

       useEffect(() => {
         whatsappApi.getContacts().then((res) => setContacts(res.data));
         whatsappApi.getGroups().then((res) => setGroups(res.data));
       }, []);

       const handleCreateGroup = () => {
         const newGroup = {
           id: Date.now().toString(),
           name: newGroupName,
           contacts: selectedContacts,
           groups: selectedGroups,
         };
         setAudienceGroups([...audienceGroups, newGroup]);
         setNewGroupName('');
         setSelectedContacts([]);
         setSelectedGroups([]);
       };

       const handleEditGroup = (id: string) => {
         // Logic to edit group (TBD: API integration)
         console.log('Edit group', id);
       };

       const handleDeleteGroup = (id: string) => {
         setAudienceGroups(audienceGroups.filter(g => g.id !== id));
       };

       return (
         <div className="p-6">
           <h1 className="text-2xl font-bold mb-4">Audience Groups</h1>
           <div className="mb-4">
             <input
               type="text"
               value={newGroupName}
               onChange={(e) => setNewGroupName(e.target.value)}
               placeholder="Enter group name"
               className="border p-2 mr-2"
             />
             <select
               multiple
               value={selectedContacts}
               onChange={(e) => setSelectedContacts(Array.from(e.target.selectedOptions, option => option.value))}
               className="border p-2 mr-2"
             >
               {contacts.map(contact => (
                 <option key={contact.id} value={contact.id}>{contact.name} ({contact.phoneNumber})</option>
               ))}
             </select>
             <select
               multiple
               value={selectedGroups}
               onChange={(e) => setSelectedGroups(Array.from(e.target.selectedOptions, option => option.value))}
               className="border p-2 mr-2"
             >
               {groups.map(group => (
                 <option key={group.id} value={group.id}>{group.name}</option>
               ))}
             </select>
             <Button onClick={handleCreateGroup}>Create Group</Button>
           </div>
           <table className="w-full border-collapse">
             <thead>
               <tr className="border-b">
                 <th className="p-2">Name</th>
                 <th className="p-2">Contacts</th>
                 <th className="p-2">Groups</th>
                 <th className="p-2">Actions</th>
               </tr>
             </thead>
             <tbody>
               {audienceGroups.map(group => (
                 <tr key={group.id} className="border-b">
                   <td className="p-2">{group.name}</td>
                   <td className="p-2">{group.contacts.length}</td>
                   <td className="p-2">{group.groups.length}</td>
                   <td className="p-2">
                     <Button onClick={() => handleEditGroup(group.id)}>Edit</Button>
                     <Button onClick={() => handleDeleteGroup(group.id)} className="ml-2">Delete</Button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       );
     }
     ```

2. **Backend Integration** (`backend/src/routes/index.ts`):
   - Add endpoints for audience group management:
     ```ts
     audienceGroups: {
       create: e.build({
         method: 'post',
         input: z.object({
           name: z.string(),
           contacts: z.array(z.string()),
           groups: z.array(z.string()),
         }),
         output: z.object({ id: z.string(), name: z.string(), contacts: z.array(z.string()), groups: z.array(z.string()) }),
         handler: async ({ input }) => {
           const id = Date.now().toString();
           // Store in database (TBD: Create AudienceGroup entity)
           return { id, ...input };
         },
       }),
       list: e.build({
         method: 'get',
         output: z.object({ items: z.array(z.object({ id: z.string(), name: z.string(), contacts: z.array(z.string()), groups: z.array(z.string()) })) }),
         handler: async () => ({ items: [] }), // Placeholder until entity is created
       }),
       update: e.build({
         method: 'put',
         input: z.object({ id: z.string(), name: z.string().optional(), contacts: z.array(z.string()).optional(), groups: z.array(z.string()).optional() }),
         output: z.object({ success: z.boolean() }),
         handler: async ({ input }) => ({ success: true }), // Placeholder
       }),
       delete: e.build({
         method: 'delete',
         input: z.object({ id: z.string() }),
         output: z.object({ success: z.boolean() }),
         handler: async ({ input }) => ({ success: true }), // Placeholder
       }),
     },
     ```

3. **Create AudienceGroup Entity** (`backend/src/entities/AudienceGroup.ts`):
   - Define a new entity:
     ```ts
     import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

     @Entity("audience_groups")
     export class AudienceGroup {
       @PrimaryGeneratedColumn()
       id!: number;

       @Column()
       name!: string;

       @Column("simple-array")
       contacts!: string[];

       @Column("simple-array")
       groups!: string[];

       @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
       createdAt!: Date;

       @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
       updatedAt!: Date;
     }
     ```
   - Update `database.ts` to include `AudienceGroup` in `entities`.

#### Deliverables
- New `/audience-groups` page with create/edit/delete functionality.
- Backend endpoints and `AudienceGroup` entity.

---

### 3. Update Contacts & Groups Page
**Objective**: Enhance the existing "Contacts & Groups" page to integrate with audience groups.

#### Steps
1. **Modify Page** (`frontend/src/app/contacts-groups/page.tsx` - create if not exists):
   - Add a button or link to navigate to "Audience Groups":
     ```tsx
     'use client';
     import { useEffect, useState } from 'react';
     import { Button } from '@/components/ui/button';
     import { whatsappApi } from '@/services/api';
     import { Contact } from '@/shared/types/contacts';
     import Link from 'next/link';

     export default function ContactsGroups() {
       const [contacts, setContacts] = useState<Contact[]>([]);

       useEffect(() => {
         whatsappApi.getContacts().then((res) => setContacts(res.data));
       }, []);

       return (
         <div className="p-6">
           <h1 className="text-2xl font-bold mb-4">Contacts & Groups</h1>
           <div className="mb-4 flex justify-between">
             <input type="text" placeholder="Search contacts..." className="border p-2" />
             <div>
               <Button className="mr-2">Import Contacts</Button>
               <Link href="/audience-groups">
                 <Button>Manage Audience Groups</Button>
               </Link>
             </div>
           </div>
           <table className="w-full border-collapse">
             <thead>
               <tr className="border-b">
                 <th className="p-2">Contact</th>
                 <th className="p-2">Phone Number</th>
                 <th className="p-2">Status</th>
                 <th className="p-2">Last Seen</th>
                 <th className="p-2">Type</th>
               </tr>
             </thead>
             <tbody>
               {contacts.map(contact => (
                 <tr key={contact.id} className="border-b">
                   <td className="p-2">{contact.name}</td>
                   <td className="p-2">{contact.phoneNumber}</td>
                   <td className="p-2">{contact.status || 'No status'}</td>
                   <td className="p-2">{contact.lastSeen ? contact.lastSeen.toString() : 'Unknown'}</td>
                   <td className="p-2">{contact.isMyContact ? 'Contact' : 'Non-contact'}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       );
     }
     ```

#### Deliverables
- Updated "Contacts & Groups" page with a link to "Audience Groups".

---

### 4. Test the Implementation
**Objective**: Verify the new audience group management works as expected.

#### Steps
1. Test creating a group with selected contacts and groups.
2. Test editing and deleting a group.
3. Ensure navigation from "Contacts & Groups" to "Audience Groups" works.
4. Verify data persistence (once backend storage is implemented).

#### Deliverables
- Test results and any bug fixes.

---

## Priorities
1. **Sidebar Item**: Quick addition to navigation.
2. **Audience Groups Page**: Core feature implementation.
3. **Backend Integration**: Essential for persistence.
4. **Page Update**: Enhances user flow.
5. **Testing**: Ensures functionality.

## Conclusion
This implementation will enable users to create and manage audience groups, addressing the current limitation. Proceed step-by-step and let me know if further clarification or approval is needed!
