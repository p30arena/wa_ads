'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SelectContactsProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function SelectContacts({ selected, onChange }: SelectContactsProps) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([
    'John Doe (+1 234 567 8901)',
    'Jane Smith (+1 987 654 3210)',
    // TODO: Fetch actual contacts from API
  ]);

  const filteredContacts = contacts.filter((contact) =>
    contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheck = (contact: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, contact]
      : selected.filter((c) => c !== contact);
    onChange(newSelected);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-60 overflow-y-auto space-y-1">
        {filteredContacts.map((contact) => (
          <div key={contact} className="flex items-center space-x-2">
            <Checkbox
              id={contact}
              checked={selected.includes(contact)}
              onCheckedChange={(checked) =>
                handleCheck(contact, checked as boolean)
              }
            />
            <Label htmlFor={contact}>{contact}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
