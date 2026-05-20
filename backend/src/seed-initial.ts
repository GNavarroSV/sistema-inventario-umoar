import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type MenuSeed = {
  name: string;
  label: string;
  path: string;
  icon: string;
  order: number;
};

const menus: MenuSeed[] = [
  { name: 'dashboard', label: 'Inicio', path: '/dashboard', icon: 'dashboard', order: 1 },
  { name: 'assets', label: 'Activos', path: '/dashboard/assets', icon: 'table', order: 2 },
  { name: 'assignments', label: 'Custodia y prestamos', path: '/dashboard/assignments', icon: 'id-card', order: 3 },
  { name: 'imports', label: 'Carga masiva', path: '/dashboard/imports', icon: 'table', order: 4 },
  { name: 'reports', label: 'Reportes', path: '/dashboard/reports', icon: 'bar-chart', order: 5 },
  { name: 'cost-centers', label: 'Centros de costo', path: '/dashboard/cost-centers', icon: 'gear', order: 6 },
  { name: 'suppliers', label: 'Proveedores', path: '/dashboard/suppliers', icon: 'person', order: 7 },
  { name: 'categories', label: 'Categorias', path: '/dashboard/categories', icon: 'table', order: 8 },
  { name: 'people', label: 'Personas', path: '/dashboard/people', icon: 'person', order: 9 },
  { name: 'roles', label: 'Usuarios y roles', path: '/dashboard/roles', icon: 'person', order: 10 },
  { name: 'menus', label: 'Menus', path: '/dashboard/menus', icon: 'gear', order: 11 },
  { name: 'users', label: 'Usuarios', path: '/dashboard/users', icon: 'person', order: 12 },
];

const categories = [
  { name: 'Computo', description: 'Equipos de computacion y perifericos' },
  { name: 'Mobiliario', description: 'Escritorios, sillas y muebles' },
  { name: 'Laboratorio', description: 'Equipamiento de laboratorio y practica' },
  { name: 'Vehiculos', description: 'Activos vehiculares y transporte' },
  { name: 'Redes', description: 'Infraestructura de red y comunicaciones' },
];



const costCenters = [
  { code: 'ADM-001', name: 'Administracion General', description: 'Centro de costo para administracion central' }
];

async function ensureRole(name: string, type: RoleType, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: { type, description },
    create: { name, type, description },
  });
}

async function ensureMenu(seed: MenuSeed) {
  const existing = await prisma.menu.findFirst({ where: { path: seed.path } });

  if (!existing) {
    return prisma.menu.create({ data: seed });
  }

  return prisma.menu.update({
    where: { id: existing.id },
    data: seed,
  });
}

async function ensureCategory(name: string, description: string) {
  return prisma.category.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function ensureCostCenter(seed: (typeof costCenters)[number]) {
  return prisma.costCenter.upsert({
    where: { code: seed.code },
    update: seed,
    create: seed,
  });
}


async function assignRoleMenus(roleId: number, menuPaths: string[]) {
  await prisma.roleMenu.deleteMany({ where: { roleId } });

  const menusToAssign = await prisma.menu.findMany({
    where: { path: { in: menuPaths } },
    select: { id: true },
  });

  if (menusToAssign.length === 0) return;

  await prisma.roleMenu.createMany({
    data: menusToAssign.map((menu: { id: number }) => ({
      roleId,
      menuId: menu.id,
    })),
    skipDuplicates: true,
  });
}

async function seedInitialData() {
  const adminRole = await ensureRole('Administrador', RoleType.ADMIN, 'Acceso total al sistema');
  const managerRole = await ensureRole('Gestor de inventario', RoleType.MANAGER, 'Opera activos y catalogos operativos');
  const employeeRole = await ensureRole('Consulta', RoleType.EMPLOYEE, 'Solo lectura para seguimiento y revision');

  for (const menu of menus) await ensureMenu(menu);
  for (const category of categories) await ensureCategory(category.name, category.description);
  for (const costCenter of costCenters) await ensureCostCenter(costCenter);

  const adminMenus = menus.map((menu) => menu.path);
  const sharedMenus = [
    '/dashboard',
    '/dashboard/assets',
    '/dashboard/assignments',
    '/dashboard/imports',
    '/dashboard/reports',
    '/dashboard/cost-centers',
    '/dashboard/suppliers',
    '/dashboard/categories',
    '/dashboard/people',
  ];

  await assignRoleMenus(adminRole.id, adminMenus);
  await assignRoleMenus(managerRole.id, sharedMenus);
  await assignRoleMenus(employeeRole.id, sharedMenus);

  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@umoar.edu.sv' },
    update: {
      name: 'Administrador',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      email: 'admin@umoar.edu.sv',
      name: 'Administrador',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log('Seed inicial completado');
  console.log(`Admin: ${adminUser.email} / Admin123!`);
}

async function main() {
  const tableCounts = {
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    categories: await prisma.category.count(),
    suppliers: await prisma.supplier.count(),
    costCenters: await prisma.costCenter.count(),
    people: await prisma.person.count(),
    assets: await prisma.asset.count(),
    assignments: await prisma.assetAssignment.count(),
    imports: await prisma.importBatch.count(),
    stockMovements: await prisma.assetStockMovement.count(),
  };

  const existingData = Object.entries(tableCounts).filter(([, count]) => count > 0);

  if (existingData.length > 0) {
    const summary = existingData.map(([table, count]) => `${table}: ${count}`).join(', ');
    console.log(`Seed inicial omitido: ya existen datos principales (${summary}).`);
    return;
  }

  console.log('No existen datos en tablas principales. Ejecutando seed inicial...');
  await seedInitialData();
}

main()
  .catch((error) => {
    console.error('Error al ejecutar seed inicial', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
