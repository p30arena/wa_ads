import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ContactFilter } from 'wa-shared';
import { whatsappApi } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { UserIcon, UsersIcon } from 'lucide-react';
import { CustomPagination } from '../ui/custom-pagination';

interface ContactListProps {
  filter: ContactFilter;
  onPageChange: (page: number) => void;
}

interface ContactItem {
  id: string | number;
  name: string;
  phoneNumber?: string;
  status?: string;
  lastSeen?: string | Date;
  profilePicUrl?: string;
  isGroup: boolean;
  isMyContact: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export function ContactList({ filter, onPageChange }: ContactListProps) {
  interface ContactResponse {
    items: ContactItem[];
    total: number;
    page: number;
    pageSize: number;
  }

  const isMyContact = (contact: ContactItem) => {
    // This is a simplified check - you might need to adjust based on your actual data structure
    return false; // Simplified for now
  };

  const { data, isLoading, error } = useQuery<ContactResponse>({
    queryKey: ['contacts', filter],
    queryFn: async () => {
      const response = await whatsappApi.getContacts(
        filter.page || 1,
        filter.pageSize || 20,
        filter.search
      );
      
      // Safely transform the response items to ContactItem
      const items = response.items.map((item) => {
        // Handle both Contact and ContactGroup types
        const isGroup = 'participants' in item; // Simple check to determine if it's a group
        
        return {
          id: item.id,
          name: item.name || (isGroup ? 'Unnamed Group' : 'Unnamed Contact'),
          phoneNumber: isGroup ? undefined : (item as any).phoneNumber,
          status: isGroup ? undefined : (item as any).status,
          lastSeen: isGroup ? undefined : (item as any).lastSeen,
          profilePicUrl: (item as any).profilePicUrl,
          isGroup,
          isMyContact: false, // Default value, adjust as needed
        };
      });
      
      return {
        items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      };
    },
  });

  const transformedData = data;

  if (error) {
    if (!transformedData?.items?.length) return <div>No contacts found</div>;
    return (
      <div className="text-center py-4 text-red-500">
        Error loading contacts. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : transformedData?.items.map((item: ContactItem) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={item.profilePicUrl} />
                      <AvatarFallback>
                        {item.name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {item.name || 'Unnamed Contact'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{item.phoneNumber || 'N/A'}</TableCell>
                <TableCell>{item.status || 'No status'}</TableCell>
                <TableCell>
                  {item.lastSeen
                    ? new Date(item.lastSeen).toLocaleDateString()
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge variant={item.isMyContact ? 'default' : 'secondary'}>
                    {item.isMyContact ? 'Contact' : 'Non-contact'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && (
        <CustomPagination
          currentPage={transformedData?.page || 1}
          totalItems={transformedData?.total || 0}
          pageSize={transformedData?.pageSize || 20}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
