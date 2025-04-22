import React, { useEffect, useState } from 'react';
import { AudienceGroup, Contact, Group } from 'wa-shared';
import { api } from '@/services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { SelectContacts } from './SelectContacts';
import { SelectGroups } from './SelectGroups';

interface AudienceGroupManagerProps {
  onSelect?: (group: AudienceGroup) => void;
  selectedGroupId?: string;
}

export function AudienceGroupManager({ onSelect, selectedGroupId }: AudienceGroupManagerProps) {
  const [groups, setGroups] = useState<AudienceGroup[]>([]);
  const [editing, setEditing] = useState<AudienceGroup | null>(null);
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [groupsIds, setGroupsIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch audience groups
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/audienceGroups/list');
      setGroups(data.data.items);
    } catch (err) {
      setError('Failed to fetch audience groups');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: AudienceGroup) => {
    setEditing(group);
    setName(group.name);
    setContacts(group.contacts);
    setGroupsIds(group.groups);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/api/audienceGroups/delete?id=${id}`);
      fetchGroups();
    } catch {
      setError('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing) {
        await api.put('/api/audienceGroups/update', {
          id: editing.id,
          name,
          contacts,
          groups: groupsIds,
        });
      } else {
        await api.post('/api/audienceGroups/create', {
          name,
          contacts,
          groups: groupsIds,
        });
      }
      setEditing(null);
      setName('');
      setContacts([]);
      setGroupsIds([]);
      fetchGroups();
    } catch {
      setError('Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="text-lg font-bold">Audience Groups</h2>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className={`flex items-center justify-between p-2 rounded ${selectedGroupId === group.id ? 'bg-indigo-50' : ''}`}>
              <div className="flex-1">
                <span className="font-medium">{group.name}</span>
                <span className="ml-2 text-xs text-gray-500">{group.contacts.length} contacts, {group.groups.length} groups</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(group.id)}>Delete</Button>
                {onSelect && (
                  <Button size="sm" onClick={() => onSelect(group)} disabled={selectedGroupId === group.id}>Select</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <hr className="my-4" />
        <h3 className="font-semibold mb-2">{editing ? 'Edit Group' : 'Create New Group'}</h3>
        <Input
          placeholder="Group Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="mb-2"
        />
        <SelectContacts selected={contacts} onChange={setContacts} />
        <SelectGroups selected={groupsIds} onChange={setGroupsIds} />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading || !name.trim()}>
          {editing ? 'Update Group' : 'Create Group'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(null)} className="ml-2">
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
