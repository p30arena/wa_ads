'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsappApi } from '@/services/api';
import type { ContactGroup } from '@/types';

type SelectGroupsProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function SelectGroups({ selected, onChange }: SelectGroupsProps) {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await whatsappApi.getGroups();
      setGroups(response.items);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(search.toLowerCase()) &&
    group.type === 'group'
  );

  const handleCheck = (groupId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, groupId]
      : selected.filter((id) => id !== groupId);
    onChange(newSelected);
  };

  if (error) {
    return (
      <div className="text-sm text-red-500 py-2">
        {error}
        <button
          onClick={fetchGroups}
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
        placeholder="Search groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={isLoading}
      />

      <div className="max-h-60 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="text-sm text-gray-500 py-2">Loading groups...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-sm text-gray-500 py-2">
            {search ? 'No groups found' : 'No groups available'}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.id} className="flex items-center space-x-2">
              <Checkbox
                id={group.id.toString()}
                checked={selected.includes(group.id.toString())}
                onCheckedChange={(checked) =>
                  handleCheck(group.id.toString(), checked as boolean)
                }
              />
              <Label htmlFor={group.id.toString()} className="flex flex-col">
                <span>{group.name}</span>
                {group.groupId && (
                  <span className="text-xs text-gray-400">ID: {group.groupId}</span>
                )}
              </Label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
