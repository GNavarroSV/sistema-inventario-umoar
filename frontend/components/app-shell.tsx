'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon, Cross2Icon, ExitIcon, HamburgerMenuIcon, PersonIcon } from '@radix-ui/react-icons';
import { AppSidebar } from './app-sidebar';
import { getSectionMeta } from '../lib/navigation';
import { useAuth } from '../hooks/auth/use-auth';
import { useLogout } from '../hooks/auth/use-logout';

interface AppShellProps {
  children: ReactNode;
}

function getSectionFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[1] ?? 'dashboard';
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session, isHydrated } = useAuth();
  const logout = useLogout();

  useEffect(() => {
    if (isHydrated && !session) {
      router.replace('/');
    }
  }, [isHydrated, router, session]);

  const sectionKey = getSectionFromPath(pathname);
  const sectionMeta = getSectionMeta(sectionKey) ?? getSectionMeta('dashboard');

  if (!isHydrated || !session) {
    return (
      <div className="app-shell app-shell--loading">
        <div className="loading-card">
          <div className="loading-ring" />
          <p>Cargando interfaz segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell__desktop-sidebar">
        <AppSidebar session={session} />
      </div>

      <div className="app-shell__content">
        <header className="topbar">
          <div className="topbar__left">
            <div className="topbar__brand">
              <span className="topbar__brand-mark" aria-hidden="true">
                <Image src="/umoar-logo.svg" alt="UMOAR" width={40} height={40} priority className="topbar__brand-image" />
              </span>
            </div>

            <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <Dialog.Trigger asChild>
                <button className="icon-button icon-button--mobile" type="button" aria-label="Abrir menu lateral">
                  <HamburgerMenuIcon />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content dialog-content--sidebar">
                  <div className="dialog-header">
                    <div>
                      <p className="eyebrow">Navegacion</p>
                      <Dialog.Title className="dialog-title">Menu lateral</Dialog.Title>
                    </div>
                    <Dialog.Close asChild>
                      <button className="icon-button" type="button" aria-label="Cerrar menu">
                        <Cross2Icon />
                      </button>
                    </Dialog.Close>
                  </div>
                  <AppSidebar session={session} onNavigate={() => setMobileMenuOpen(false)} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div>
              <p className="eyebrow">Sistema de inventario universitario</p>
              <h2>{sectionMeta?.title ?? 'Dashboard'}</h2>
              <p className="topbar__description">{sectionMeta?.description}</p>
            </div>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="profile-button" type="button">
                <div className="avatar">{session.avatar}</div>
                <div className="profile-button__text">
                  <strong>{session.user.name}</strong>
                  <span>{session.roleLabel}</span>
                </div>
                <ChevronDownIcon />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-content" align="end" sideOffset={10}>
                <DropdownMenu.Label className="dropdown-label">
                  <div className="profile-button profile-button--menu">
                    <div className="avatar">{session.avatar}</div>
                    <div className="profile-button__text">
                      <strong>{session.user.name}</strong>
                      <span>{session.user.email}</span>
                    </div>
                  </div>
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="dropdown-separator" />
                <DropdownMenu.Item className="dropdown-item" asChild>
                  <Link href="/dashboard">
                    <PersonIcon />
                    Ir al inicio
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="dropdown-item dropdown-item--danger" onSelect={() => logout()}>
                  <ExitIcon />
                  Cerrar sesion
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
