export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isMyContact: boolean;
  profilePicUrl?: string;
  lastSeen?: Date;
  status?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  participants: Contact[];
  isAdmin: boolean;
  profilePicUrl?: string;
  createdAt: Date;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GroupsResponse {
  groups: Group[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContactFilter {
  search?: string;
  isMyContact?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GroupFilter {
  search?: string;
  isAdmin?: boolean;
  page?: number;
  pageSize?: number;
}
