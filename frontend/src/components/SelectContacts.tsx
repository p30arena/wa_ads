'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsappApi } from '@/services/api';
import type { ContactGroup } from '@/types';

type SelectContactsProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function SelectContacts({ selected, onChange }: SelectContactsProps) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await whatsappApi.getContacts();
      setContacts(data.data.items);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    (contact.phone && contact.phone.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCheck = (contactId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, contactId]
      : selected.filter((id) => id !== contactId);
    onChange(newSelected);
  };

  if (error) {
    return (
      <div className="text-sm text-red-500 py-2">
        {error}
        <button
          onClick={fetchContacts}
          className="ml-2 text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={isLoading}
      />

      <div className="max-h-60 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="text-sm text-gray-500 py-2">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-sm text-gray-500 py-2">
            {search ? 'No contacts found' : 'No contacts available'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={contact.id.toString()}
                checked={selected.includes(contact.id.toString())}
                onCheckedChange={(checked) =>
                  handleCheck(contact.id.toString(), checked as boolean)
                }
              />
              <Label htmlFor={contact.id.toString()} className="flex items-center space-x-2">
                <span>{contact.name}</span>
                {contact.phone && (
                  <span className="text-sm text-gray-500">{contact.phone}</span>
                )}
              </Label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
