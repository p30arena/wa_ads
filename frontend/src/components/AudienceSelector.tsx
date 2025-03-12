import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Contact {
  id: number;
  name: string;
  phone: string;
}

interface Group {
  id: number;
  name: string;
  groupId: string;
}

interface PhoneBookEntry {
  id: number;
  name: string;
  phone: string;
  groupName?: string;
}

interface AudienceSelectorProps {
  onSelectionChange: (selection: {
    contacts: Contact[];
    groups: Group[];
    phoneBook: PhoneBookEntry[];
  }) => void;
  contacts: Contact[];
  groups: Group[];
  phoneBook: PhoneBookEntry[];
}

export function AudienceSelector({
  onSelectionChange,
  contacts,
  groups,
  phoneBook,
}: AudienceSelectorProps) {
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [selectedPhoneBook, setSelectedPhoneBook] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [phoneBookGroups, setPhoneBookGroups] = useState<string[]>([]);
  const [selectedPhoneBookGroup, setSelectedPhoneBookGroup] = useState<string>('all');

  useEffect(() => {
    // Extract unique group names from phone book entries
    const groups = [...new Set(phoneBook.map((entry) => entry.groupName).filter(Boolean))];
    setPhoneBookGroups(groups);
  }, [phoneBook]);

  useEffect(() => {
    onSelectionChange({
      contacts: contacts.filter((c) => selectedContacts.has(c.id)),
      groups: groups.filter((g) => selectedGroups.has(g.id)),
      phoneBook: phoneBook.filter((p) => selectedPhoneBook.has(p.id)),
    });
  }, [selectedContacts, selectedGroups, selectedPhoneBook]);

  const filterBySearch = <T extends { name: string }>(items: T[]) => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredPhoneBook = phoneBook.filter((entry) => {
    const matchesSearch = !searchQuery || entry.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedPhoneBookGroup === 'all' || entry.groupName === selectedPhoneBookGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <Tab.Group>
        <Tab.List className="flex space-x-1 p-1 bg-indigo-50 rounded-t-lg">
          {['Contacts', 'Groups', 'Phone Book'].map((category) => (
            <Tab
              key={category}
              className={({ selected }) =>
                clsx(
                  'w-full py-2.5 text-sm font-medium leading-5 rounded-lg',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-indigo-400 ring-white ring-opacity-60',
                  selected
                    ? 'bg-white shadow text-indigo-700'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-indigo-600'
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>

        <div className="p-4">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Tab.Panels>
            {/* Contacts Panel */}
            <Tab.Panel className="space-y-2">
              {filterBySearch(contacts).map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    const newSelection = new Set(selectedContacts);
                    if (newSelection.has(contact.id)) {
                      newSelection.delete(contact.id);
                    } else {
                      newSelection.add(contact.id);
                    }
                    setSelectedContacts(newSelection);
                  }}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-md cursor-pointer',
                    selectedContacts.has(contact.id)
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.phone}</p>
                  </div>
                  {selectedContacts.has(contact.id) && (
                    <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  )}
                </div>
              ))}
            </Tab.Panel>

            {/* Groups Panel */}
            <Tab.Panel className="space-y-2">
              {filterBySearch(groups).map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    const newSelection = new Set(selectedGroups);
                    if (newSelection.has(group.id)) {
                      newSelection.delete(group.id);
                    } else {
                      newSelection.add(group.id);
                    }
                    setSelectedGroups(newSelection);
                  }}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-md cursor-pointer',
                    selectedGroups.has(group.id)
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <p className="font-medium text-gray-900">{group.name}</p>
                  {selectedGroups.has(group.id) && (
                    <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  )}
                </div>
              ))}
            </Tab.Panel>

            {/* Phone Book Panel */}
            <Tab.Panel>
              <div className="mb-4">
                <select
                  value={selectedPhoneBookGroup}
                  onChange={(e) => setSelectedPhoneBookGroup(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Groups</option>
                  {phoneBookGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {filteredPhoneBook.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      const newSelection = new Set(selectedPhoneBook);
                      if (newSelection.has(entry.id)) {
                        newSelection.delete(entry.id);
                      } else {
                        newSelection.add(entry.id);
                      }
                      setSelectedPhoneBook(newSelection);
                    }}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-md cursor-pointer',
                      selectedPhoneBook.has(entry.id)
                        ? 'bg-indigo-50'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{entry.name}</p>
                      <p className="text-sm text-gray-500">{entry.phone}</p>
                      {entry.groupName && (
                        <p className="text-xs text-indigo-600">{entry.groupName}</p>
                      )}
                    </div>
                    {selectedPhoneBook.has(entry.id) && (
                      <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                ))}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  );
}
