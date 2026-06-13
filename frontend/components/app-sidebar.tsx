'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Separator from '@radix-ui/react-separator';
import { DashboardIcon, ExitIcon, PersonIcon } from '@radix-ui/react-icons';
import { getVisibleNavigation } from '../lib/navigation';
import type { AuthSession } from '../types/auth';
import { useLogout } from '../hooks/auth/use-logout';
import { useRoleMenusQuery } from '../hooks/menus/use-menus';

interface AppSidebarProps {
  session: AuthSession;
  onNavigate?: () => void;
}

export function AppSidebar({ session, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const logout = useLogout();
  const roleMenusQuery = useRoleMenusQuery(session.user.role?.id);
  const sections = getVisibleNavigation(roleMenusQuery.data ?? session.menus);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__header">
        <div className="app-sidebar__logo" aria-hidden="true">
          <Image src="/umoar-logo.svg" alt="UMOAR" width={40} height={40} className="app-sidebar__logo-image" />
        </div>
      </div>

      <nav className="app-sidebar__nav" aria-label="Navegacion principal">
        {sections.map((section) => (
          <div key={section.title} className="app-sidebar__section">
            <p className="app-sidebar__section-title">{section.title}</p>
            {section.items.map((item) => {
              const ActiveIcon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
                  onClick={onNavigate}
                >
                  <span className="nav-link__icon">
                    <ActiveIcon />
                  </span>
                  <span className="nav-link__text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <div className="app-sidebar__user">
          <div className="avatar">{session.avatar}</div>
          <div className="app-sidebar__user-info">
            <p className="app-sidebar__user-name">{session.user.name}</p>
            <p className="app-sidebar__user-role">{session.roleLabel}</p>
          </div>
        </div>

        <button className="app-sidebar__logout" type="button" onClick={logout}>
          <ExitIcon />
          Cerrar sesion
        </button>        
      </div>
    </aside>
  );
}
