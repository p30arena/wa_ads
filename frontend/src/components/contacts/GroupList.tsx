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
import { GroupFilter } from 'wa-shared';
import { whatsappApi } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { UsersIcon } from 'lucide-react';
import { CustomPagination } from '../ui/custom-pagination';

interface GroupListProps {
  filter: GroupFilter;
  onPageChange: (page: number) => void;
}

export function GroupList({ filter, onPageChange }: GroupListProps) {
  interface GroupItem {
    id: string | number;
    name: string;
    profilePicUrl?: string;
    participants: any[];
    isAdmin?: boolean;
    createdAt?: string | Date;
  }

  interface GroupsResponse {
    items: GroupItem[];
    total: number;
    page: number;
    pageSize: number;
  }

  const { data, isLoading, error } = useQuery<GroupsResponse>({
    queryKey: ['groups', filter],
    queryFn: async () => {
      const response = await whatsappApi.getGroups(
        filter.page || 1,
        filter.pageSize || 20
      );
      
      // Transform the response to match our GroupItem interface
      const items = response.items.map((group) => ({
        id: group.id,
        name: group.name || 'Unnamed Group',
        profilePicUrl: (group as any).profilePicUrl,
        participants: (group as any).participants || [],
        isAdmin: (group as any).isAdmin,
        createdAt: (group as any).createdAt,
      }));
      
      return {
        items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      };
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
              <TableHead>Role</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : data?.items?.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={group.profilePicUrl} alt={group.name} />
                      <AvatarFallback>
                        <UsersIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.participants.length} members
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={group.isAdmin ? 'default' : 'secondary'}>
                    {group.isAdmin ? 'Admin' : 'Member'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {group.participants.length}
                </TableCell>
                <TableCell className="text-right">
                  {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && (
        <CustomPagination
          currentPage={data.page}
          pageSize={data.pageSize}
          totalItems={data.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
