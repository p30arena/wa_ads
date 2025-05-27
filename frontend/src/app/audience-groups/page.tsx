'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectContacts } from '@/components/SelectContacts';
import { SelectGroups } from '@/components/SelectGroups';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { audienceGroupsApi } from '@/services/audienceGroups';
import { AudienceGroup } from 'wa-shared';

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

  // Create a separate component for the dialog to better manage its state
  const GroupDialog = React.memo(({ isOpen, onClose, mode }: { isOpen: boolean; onClose: () => void; mode: 'create' | 'edit' }) => {
    const [localName, setLocalName] = React.useState(name);
    const [localSelectedContacts, setLocalSelectedContacts] = React.useState<string[]>(selectedContacts);
    const [localSelectedGroups, setLocalSelectedGroups] = React.useState<string[]>(selectedGroups);

    // Update local state when props change
    React.useEffect(() => {
      setLocalName(name);
      setLocalSelectedContacts(selectedContacts);
      setLocalSelectedGroups(selectedGroups);
    }, [isOpen, name, selectedContacts, selectedGroups]);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Update parent state
      setName(localName);
      setSelectedContacts(localSelectedContacts);
      setSelectedGroups(localSelectedGroups);
      
      // Call the appropriate handler
      if (mode === 'create') {
        handleCreate();
      } else {
        handleEdit();
      }
    };

    // Only render when open
    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <form 
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              // Prevent form submission on Enter key
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {mode === 'create' ? 'Create New Audience Group' : 'Edit Audience Group'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder="Enter group name"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      // Prevent form submission on Enter key
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Select Contacts</label>
                  <SelectContacts
                    selected={localSelectedContacts}
                    onChange={setLocalSelectedContacts}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Select Groups</label>
                  <SelectGroups
                    selected={localSelectedGroups}
                    onChange={setLocalSelectedGroups}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audience Groups</h1>
        <Button 
          type="button"
          onClick={() => setIsCreateDialogOpen(true)} 
          disabled={isLoading}
        >
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
