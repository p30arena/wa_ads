'use client';

import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsappApi } from '@/services/api';
import type { ContactGroup } from '@/types';

// Simple debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

type SelectContactsProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function SelectContacts({ selected, onChange }: SelectContactsProps) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch contacts with pagination and search
  const fetchContacts = useCallback(async (searchQuery: string = '') => {
    try {
      const loadingState = searchQuery ? isSearching : isLoading;
      if (loadingState) return;

      if (searchQuery) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Call the API with search query as a URL parameter
      const response = await whatsappApi.getContacts(1, 100, searchQuery);
      setContacts(response.items || []);
      
      if (initialLoad) setInitialLoad(false);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [isLoading, isSearching, initialLoad]);

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      fetchContacts('');
    }
  }, [fetchContacts, initialLoad]);
  
  // Handle retry button click
  const handleRetry = useCallback(() => {
    fetchContacts(search);
  }, [fetchContacts, search]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      fetchContacts(searchQuery);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  // Filter already selected contacts
  const filteredContacts = contacts.filter(contact => 
    !selected.includes(contact.id.toString())
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
          onClick={handleRetry}
          className="ml-2 text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={handleSearchChange}
          disabled={isLoading}
        />
        {(isSearching || (isLoading && !initialLoad)) && (
          <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1">
        {isLoading && initialLoad ? (
          <div className="text-sm text-gray-500 py-2">Loading contacts...</div>
        ) : contacts.length === 0 ? (
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
        {isSearching && (
          <div className="text-sm text-gray-500 py-2">Searching...</div>
        )}
      </div>
    </div>
  );
}
