INSERT INTO "menus" ("name", "label", "path", "icon", "order", "isActive", "createdAt", "updatedAt")
SELECT 'reports', 'Reportes', '/dashboard/reports', 'bar-chart', COALESCE(MAX("order"), -1) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "menus"
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "path" = '/dashboard/reports');

INSERT INTO "role_menus" ("roleId", "menuId", "createdAt")
SELECT role."id", menu."id", CURRENT_TIMESTAMP
FROM "roles" role
JOIN "menus" menu ON menu."path" = '/dashboard/reports'
WHERE role."type" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "role_menus" existing
    WHERE existing."roleId" = role."id" AND existing."menuId" = menu."id"
  );
