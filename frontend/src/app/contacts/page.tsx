'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactList } from '@/components/contacts/ContactList';
import { GroupList } from '@/components/contacts/GroupList';
import { Button } from '@/components/ui/button';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { ContactFilter, GroupFilter } from 'wa-shared';

export default function ContactsPage() {
  const [contactFilter, setContactFilter] = useState<ContactFilter>({
    search: '',
    isMyContact: undefined,
    page: 1,
    pageSize: 20,
  });

  const [groupFilter, setGroupFilter] = useState<GroupFilter>({
    search: '',
    isAdmin: undefined,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contacts & Groups</h1>
        <Button>
          <PlusIcon className="w-4 h-4 mr-2" />
          Import Contacts
        </Button>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={contactFilter.search}
                onChange={(e) => setContactFilter({ ...contactFilter, search: e.target.value })}
              />
            </div>
            <Button variant="outline" onClick={() => setContactFilter({ ...contactFilter, isMyContact: !contactFilter.isMyContact })}>
              {contactFilter.isMyContact ? 'All Contacts' : 'My Contacts'}
            </Button>
          </div>
          <ContactList filter={contactFilter} onPageChange={(page) => setContactFilter({ ...contactFilter, page })} />
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search groups..."
                className="pl-10"
                value={groupFilter.search}
                onChange={(e) => setGroupFilter({ ...groupFilter, search: e.target.value })}
              />
            </div>
            <Button variant="outline" onClick={() => setGroupFilter({ ...groupFilter, isAdmin: !groupFilter.isAdmin })}>
              {groupFilter.isAdmin ? 'All Groups' : 'Admin Only'}
            </Button>
          </div>
          <GroupList filter={groupFilter} onPageChange={(page) => setGroupFilter({ ...groupFilter, page })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
