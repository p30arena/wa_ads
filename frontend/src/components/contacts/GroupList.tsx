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
import { Group, GroupFilter } from 'wa-shared';
import { Skeleton } from '@/components/ui/skeleton';
import { UsersIcon } from 'lucide-react';
import { CustomPagination } from '../ui/custom-pagination';

interface GroupListProps {
  filter: GroupFilter;
  onPageChange: (page: number) => void;
}

export function GroupList({ filter, onPageChange }: GroupListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['groups', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.isAdmin !== undefined) params.append('isAdmin', String(filter.isAdmin));
      if (filter.page) params.append('page', String(filter.page));
      if (filter.pageSize) params.append('pageSize', String(filter.pageSize));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/groups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      return response.json();
    },
  });

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading groups. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Role</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : data?.groups.map((group: Group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={group.profilePicUrl} />
                      <AvatarFallback>{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{group.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">
                    {group.description || 'No description'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    {group.participants.length}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(group.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={group.isAdmin ? 'default' : 'secondary'}>
                    {group.isAdmin ? 'Admin' : 'Member'}
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
