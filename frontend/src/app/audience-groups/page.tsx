'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectContacts } from '@/components/SelectContacts';
import { SelectGroups } from '@/components/SelectGroups';
import { Dialog } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { audienceGroupsApi } from '@/services/audienceGroups';
import { AudienceGroup } from '@/shared/types/audienceGroups';

export default function AudienceGroupsPage() {
  const [audienceGroups, setAudienceGroups] = useState<AudienceGroup[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<AudienceGroup | null>(null);
  const [name, setName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAudienceGroups();
  }, []);

  const fetchAudienceGroups = async () => {
    try {
      setIsLoading(true);
      const groups = await audienceGroupsApi.list();
      setAudienceGroups(groups);
    } catch (error) {
      console.error('Error fetching audience groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) {
      alert('Please enter a name for the audience group');
      return;
    }

    try {
      setIsLoading(true);
      await audienceGroupsApi.create({
        name,
        contacts: selectedContacts,
        groups: selectedGroups,
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      await fetchAudienceGroups();
    } catch (error) {
      console.error('Error creating audience group:', error);
      alert('Failed to create audience group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!currentGroup || !name) return;

    try {
      setIsLoading(true);
      const result = await audienceGroupsApi.update(currentGroup.id, {
        name,
        contacts: selectedContacts,
        groups: selectedGroups,
      });
      
      if (result.success) {
        setIsEditDialogOpen(false);
        resetForm();
        await fetchAudienceGroups();
      }
    } catch (error) {
      console.error('Error updating audience group:', error);
      alert('Failed to update audience group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audience group?')) return;

    try {
      setIsLoading(true);
      const result = await audienceGroupsApi.delete(id);
      
      if (result.success) {
        await fetchAudienceGroups();
      }
    } catch (error) {
      console.error('Error deleting audience group:', error);
      alert('Failed to delete audience group');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedContacts([]);
    setSelectedGroups([]);
    setCurrentGroup(null);
  };

  const openEditDialog = (group: AudienceGroup) => {
    setCurrentGroup(group);
    setName(group.name);
    setSelectedContacts(group.contacts);
    setSelectedGroups(group.groups);
    setIsEditDialogOpen(true);
  };

  const GroupDialog = ({ isOpen, onClose, mode }: { isOpen: boolean; onClose: () => void; mode: 'create' | 'edit' }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            {mode === 'create' ? 'Create New Audience Group' : 'Edit Audience Group'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Contacts</label>
              <SelectContacts
                selected={selectedContacts}
                onChange={setSelectedContacts}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Groups</label>
              <SelectGroups
                selected={selectedGroups}
                onChange={setSelectedGroups}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={mode === 'create' ? handleCreate : handleEdit}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audience Groups</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isLoading}>
          Create New Group
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                Loading...
              </TableCell>
            </TableRow>
          ) : audienceGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                No audience groups found
              </TableCell>
            </TableRow>
          ) : (
            audienceGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.contacts.length} contacts</TableCell>
                <TableCell>{group.groups.length} groups</TableCell>
                <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(group)}
                      disabled={isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                      disabled={isLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <GroupDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
        mode="create"
      />

      <GroupDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          resetForm();
        }}
        mode="edit"
      />
    </div>
  );
}
