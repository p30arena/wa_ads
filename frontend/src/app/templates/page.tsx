'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateApi } from '@/services/api';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Using a simple toast function until we add a proper toast library
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>>({ 
    title: '', 
    messages: [{ type: 'text' as const, content: '' }] 
  });
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await templateApi.getTemplates();
      
      // The API returns { status: string; data: { items: MessageTemplate[] } }
      const responseData = response.data.data;
      
      if (!responseData || !Array.isArray(responseData.items)) {
        console.error('Unexpected API response format:', responseData);
        return { items: [] };
      }
      
      // Transform the response to ensure messages are in the correct format
      const items = responseData.items.map((template: MessageTemplate) => ({
        ...template,
        messages: template.messages.map((msg) => {
          if (typeof msg === 'string') {
            try {
              // Try to parse stringified JSON objects
              const parsed = JSON.parse(msg);
              return typeof parsed === 'object' ? parsed : { type: 'text', content: msg };
            } catch (e) {
              return { type: 'text', content: msg };
            }
          }
          return msg;
        })
      }));
      return { items };
    },
  });

  const updateMutation = useMutation({    
    mutationFn: async ({ id, template }: { id: number, template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'> }) => {
      // Ensure messages are in the correct format
      const formattedTemplate = {
        ...template,
        messages: template.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          ...(msg.caption && { caption: msg.caption })
        }))
      };
      const response = await templateApi.updateTemplate(id, formattedTemplate);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsUpdateOpen(false);
      setSelectedTemplate(null);
      toast.success('Template updated successfully');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Ensure messages are in the correct format
      const formattedData = {
        ...data,
        messages: data.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          ...(msg.caption && { caption: msg.caption })
        }))
      };
      const response = await templateApi.createTemplate(formattedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsCreateOpen(false);
      setNewTemplate({ title: '', messages: [{ type: 'text', content: '' }] });
      toast.success('Template created successfully');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await templateApi.deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const handleCreate = () => {
    if (!newTemplate.title || !newTemplate.messages[0]) {
      toast.error('Please fill in all fields');
      return;
    }
    createMutation.mutate(newTemplate);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create New Template</Button>
          </DialogTrigger>
          <DialogContent>

            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTemplate.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTemplate({ ...newTemplate, title: e.target.value })
                  }
                  placeholder="Enter template title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Messages</label>
                {newTemplate.messages.map((message, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={message.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newMessages = [...newTemplate.messages];
                        newMessages[index] = { ...message, content: e.target.value };
                        setNewTemplate({ ...newTemplate, messages: newMessages });
                      }}
                      placeholder={`Enter message ${index + 1}`}
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => {
                        const newMessages = newTemplate.messages.filter((_, i) => i !== index);
                        setNewTemplate({ 
                          ...newTemplate, 
                          messages: newMessages.length ? newMessages : [{ type: 'text' as const, content: '' }] 
                        });
                      }}
                      disabled={newTemplate.messages.length === 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewTemplate({
                    ...newTemplate,
                    messages: [...newTemplate.messages, { type: 'text' as const, content: '' }]
                  })}
                >
                  Add Message
                </Button>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedTemplate?.title ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedTemplate(prev => prev ? { ...prev, title: e.target.value } : null)
                  }
                  placeholder="Enter template title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Messages</label>
                {selectedTemplate?.messages.map((message, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={message.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newMessages = [...(selectedTemplate?.messages ?? [])];
                        newMessages[index] = { ...message, content: e.target.value };
                        setSelectedTemplate(prev => prev ? { ...prev, messages: newMessages } : null);
                      }}
                      placeholder={`Enter message ${index + 1}`}
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => {
                        const newMessages = selectedTemplate.messages.filter((_, i) => i !== index);
                        setSelectedTemplate(prev => prev ? { ...prev, messages: newMessages.length ? newMessages : [{ type: 'text' as const, content: '' }] } : null);
                      }}
                      disabled={selectedTemplate.messages.length === 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTemplate(prev => prev ? {
                    ...prev,
                    messages: [...prev.messages, { type: 'text' as const, content: '' }]
                  } : null)}
                >
                  Add Message
                </Button>
              </div>
              <Button
                onClick={() => {
                  if (!selectedTemplate?.title || !selectedTemplate?.messages[0]) {
                    toast.error('Please fill in all fields');
                    return;
                  }
                  updateMutation.mutate({
                    id: selectedTemplate.id,
                    template: {
                      title: selectedTemplate.title,
                      messages: selectedTemplate.messages
                    }
                  });
                }}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates?.items?.map((template: MessageTemplate) => (
            <TableRow key={template.id}>
              <TableCell>{template.title}</TableCell>
              <TableCell className="max-w-md">
                <div className="space-y-1">
                  {template.messages.map((message, index) => (
                    <div key={index} className="truncate text-sm">
                      {index + 1}. {message.content}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {new Date(template.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsUpdateOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
