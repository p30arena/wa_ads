import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
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
import { UserIcon, UsersIcon, Search } from 'lucide-react';
import { CustomPagination } from '../ui/custom-pagination';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';

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

export function ContactList({ filter: initialFilter, onPageChange }: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState(initialFilter.search || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  // Memoize the filter to prevent unnecessary re-renders
  const filter = useMemo(() => ({
    ...initialFilter,
    search: debouncedSearchTerm,
  }), [initialFilter, debouncedSearchTerm]);

  // Debounce search term updates
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['contacts', filter],
    queryFn: async () => {
      const response = await whatsappApi.getContacts(
        filter.page || 1,
        filter.pageSize || 20,
        filter.search
      );
      
      // Safely transform the response items to ContactItem
      const items = response.items.map((item) => ({
        id: item.id,
        name: item.name || ('participants' in item ? 'Unnamed Group' : 'Unnamed Contact'),
        phoneNumber: 'participants' in item ? undefined : (item as any).phoneNumber,
        status: 'participants' in item ? undefined : (item as any).status,
        lastSeen: 'participants' in item ? undefined : (item as any).lastSeen,
        profilePicUrl: (item as any).profilePicUrl,
        isGroup: 'participants' in item,
        isMyContact: false,
      }));
      
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
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isLoading || isFetching}
          />
        </div>
      </div>
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
            {(isLoading || isFetching) ? (
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
            ) : transformedData?.items?.length ? (
              transformedData.items.map((item: ContactItem) => (
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No contacts found
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
