'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectContacts } from '@/components/SelectContacts';
import { SelectGroups } from '@/components/SelectGroups';

export function AudienceGroupForm() {
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/audience-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          contacts,
          groups,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create audience group');
      }

      // Reset form on success
      setName('');
      setContacts([]);
      setGroups([]);

      // TODO: Show success notification
    } catch (error) {
      console.error('Error creating audience group:', error);
      // TODO: Show error notification
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Contacts</Label>
        <SelectContacts selected={contacts} onChange={setContacts} />
      </div>

      <div>
        <Label>Groups</Label>
        <SelectGroups selected={groups} onChange={setGroups} />
      </div>

      <Button type="submit">Create Audience Group</Button>
    </form>
  );
}
