'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuthContext } from '../../contexts/auth-context';
import { useRoleMenusQuery, type MenuDto } from '../../hooks/menus/use-menus';

const MAIN_CARDS = [
  {
    href: '/dashboard/assets',
    title: 'Activos',
    description: 'Consulta y administra los bienes registrados en el sistema.',
  },
  {
    href: '/dashboard/assignments',
    title: 'Custodia y prestamos',
    description: 'Controla entregas, devoluciones y responsables de activos.',
  },
  {
    href: '/dashboard/imports',
    title: 'Carga masiva',
    description: 'Descarga plantillas y registra inventario desde archivos.',
  },
  {
    href: '/dashboard/reports',
    title: 'Reportes',
    description: 'Revisa informacion gerencial y exportaciones del inventario.',
  },
];

function collectMenuOrder(menus: MenuDto[] | undefined, fallbackPaths: string[]) {
  const orderByPath = new Map<string, number>();

  fallbackPaths.forEach((path, index) => orderByPath.set(path, index));

  const visit = (items: MenuDto[] | undefined) => {
    items?.forEach((menu, index) => {
      if (menu.path) {
        orderByPath.set(menu.path, menu.order ?? index);
      }
      if (menu.children?.length) {
        visit(menu.children as MenuDto[]);
      }
    });
  };

  visit(menus);

  return orderByPath;
}

export default function DashboardHomePage() {
  const auth = useAuthContext();
  const roleMenusQuery = useRoleMenusQuery(auth.session?.user.role?.id);

  const visibleCards = useMemo(() => {
    const orderByPath = collectMenuOrder(roleMenusQuery.data, auth.session?.menus ?? []);

    return MAIN_CARDS.filter((card) => orderByPath.has(card.href)).sort(
      (left, right) => (orderByPath.get(left.href) ?? 0) - (orderByPath.get(right.href) ?? 0),
    );
  }, [auth.session?.menus, roleMenusQuery.data]);

  return (
    <main className="dashboard-home">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Bienvenido</p>
          <h1>Gestion de inventario</h1>
          <p>Administra activos, prestamos, movimientos y reportes desde un solo lugar.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        {visibleCards.map((card) => (
          <Link key={card.href} href={card.href} className="dashboard-card">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Link>
        ))}

        {!visibleCards.length && (
          <div className="dashboard-empty">
            No hay opciones principales asignadas para este rol.
          </div>
        )}
      </section>
    </main>
  );
}
