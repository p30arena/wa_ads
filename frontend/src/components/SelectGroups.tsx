'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SelectGroupsProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function SelectGroups({ selected, onChange }: SelectGroupsProps) {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([
    'Family Group',
    'Work Team',
    'College Friends',
    // TODO: Fetch actual groups from API
  ]);

  const filteredGroups = groups.filter((group) =>
    group.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheck = (group: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, group]
      : selected.filter((g) => g !== group);
    onChange(newSelected);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-60 overflow-y-auto space-y-1">
        {filteredGroups.map((group) => (
          <div key={group} className="flex items-center space-x-2">
            <Checkbox
              id={group}
              checked={selected.includes(group)}
              onCheckedChange={(checked) =>
                handleCheck(group, checked as boolean)
              }
            />
            <Label htmlFor={group}>{group}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
