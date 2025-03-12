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
import { Contact, ContactFilter } from '@shared/types/contacts';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomPagination } from '@/components/ui/custom-pagination';

interface ContactListProps {
  filter: ContactFilter;
  onPageChange: (page: number) => void;
}

export function ContactList({ filter, onPageChange }: ContactListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.isMyContact !== undefined) params.append('isMyContact', String(filter.isMyContact));
      if (filter.page) params.append('page', String(filter.page));
      if (filter.pageSize) params.append('pageSize', String(filter.pageSize));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contacts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
  });

  if (error) {
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
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : data?.contacts.map((contact: Contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={contact.profilePicUrl} />
                      <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{contact.phoneNumber}</TableCell>
                <TableCell>{contact.status || 'No status'}</TableCell>
                <TableCell>
                  {contact.lastSeen 
                    ? new Date(contact.lastSeen).toLocaleDateString()
                    : 'Unknown'
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={contact.isMyContact ? 'default' : 'secondary'}>
                    {contact.isMyContact ? 'Contact' : 'Non-contact'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && (
        <CustomPagination
          currentPage={filter.page || 1}
          pageSize={filter.pageSize || 20}
          totalItems={data.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
