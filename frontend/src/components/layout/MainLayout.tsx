'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  HomeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CalendarIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WhatsAppQRCode } from '@/components/WhatsAppQRCode';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/app/theme-context';
import { useLocale } from '@/app/locale-context';
import { t } from '@/i18n';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Audience Groups', href: '/audience-groups', icon: ListBulletIcon },
  { name: 'Contacts & Groups', href: '/contacts', icon: UsersIcon },
  { name: 'Message Templates', href: '/templates', icon: ChatBubbleLeftRightIcon },
  { name: 'Ad Jobs', href: '/jobs', icon: ClipboardDocumentListIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { status } = useWebSocket();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background dark:bg-gray-900 px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                      <img
                        className="h-8 w-auto"
                        src="/logo.svg"
                        alt="WhatsApp Ads"
                      />
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => (
                              <li key={t(item.name, locale)}>
                                <Link
                                  href={item.href}
                                  className={cn(
                                    pathname === item.href
                                      ? 'bg-gray-50 text-indigo-600'
                                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                >
                                  <item.icon
                                    className={cn(
                                      pathname === item.href
                                        ? 'text-indigo-600'
                                        : 'text-gray-400 group-hover:text-indigo-600',
                                      'h-6 w-6 shrink-0'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {t(item.name, locale)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background dark:bg-gray-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <img
                className="h-8 w-auto"
                src="/logo.svg"
                alt="WhatsApp Ads"
              />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={t(item.name, locale)}>
                        <Link
                          href={item.href}
                          className={cn(
                            pathname === item.href
                              ? 'bg-muted text-indigo-600 dark:bg-gray-800'
                              : 'text-foreground hover:text-indigo-600 hover:bg-muted dark:hover:bg-gray-800',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={cn(
                              pathname === item.href
                                ? 'text-indigo-600'
                                : 'text-gray-400 group-hover:text-indigo-600',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {t(item.name, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                  <div className="px-2 py-3">
                    <div className="flex items-center gap-x-3 text-sm font-semibold leading-6 text-gray-900">
                      <div className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        status.connected ? 'bg-green-500' : status.qrCode ? 'bg-yellow-500' : 'bg-red-500'
                      )} />
                      <span>{t('WhatsApp Status', locale)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {status.connected ? t('Connected and ready', locale) :
                       status.qrCode ? t('Scan QR code in dashboard', locale) :
                       t('Initializing connection...', locale)}
                    </p>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className={cn("lg:pl-72", locale === 'fa' && 'rtl font-sans')}> 
          <div className={cn("sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8", "dark:bg-gray-900 dark:border-gray-700")}> 
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 lg:hidden dark:bg-gray-700" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1" />
              {/* Theme Switcher */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-300">{t('Theme', locale)}</label>
                <select
                  className="rounded border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 text-xs px-2 py-1"
                  value={theme}
                  onChange={e => setTheme(e.target.value as any)}
                >
                  <option value="light">{t('Light', locale)}</option>
                  <option value="dark">{t('Dark', locale)}</option>
                  <option value="system">{t('System', locale)}</option>
                </select>
              </div>
              {/* Language Switcher */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-300">{t('Language', locale)}</label>
                <select
                  className="rounded border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 text-xs px-2 py-1"
                  value={locale}
                  onChange={e => setLocale(e.target.value as any)}
                >
                  <option value="en">English</option>
                  <option value="fa">فارسی</option>
                </select>
              </div>
            </div>
          </div>

          <main className={cn("py-10", locale === 'fa' && 'rtl')}> 
            <div className={cn("px-4 sm:px-6 lg:px-8", locale === 'fa' && 'rtl')}> 
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
