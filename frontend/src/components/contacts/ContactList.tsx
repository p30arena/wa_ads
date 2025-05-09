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
import { Contact, ContactFilter } from 'wa-shared';
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
      const params = new URLSearchParams({
        page: String(filter.page || 1),
        pageSize: String(filter.pageSize || 20),
      });
      if (filter.search) params.append('search', filter.search);
      if (filter.isMyContact !== undefined) params.append('isMyContact', String(filter.isMyContact));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/contacts?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch contacts');
      }
      const { items, total } = (await response.json()).data;
      return { items, total };
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
            ) : data?.items?.map((contact: Contact) => (
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
