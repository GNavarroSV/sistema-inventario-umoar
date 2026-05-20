declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    [key: string]: any;
  }

  export enum RoleType {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
  }

  export enum AssetStatus {
    OPERATIVO = 'OPERATIVO',
    OBSOLETO = 'OBSOLETO',
    MAL_ESTADO = 'MAL_ESTADO',
    DESUSO = 'DESUSO',
    REPARACION = 'REPARACION',
    DESCARTADO = 'DESCARTADO',
  }

  export enum DepreciationType {
    LINEAR = 'LINEAR',
    ACCELERATED = 'ACCELERATED',
    UNITS_PRODUCED = 'UNITS_PRODUCED',
  }

  export enum AssignmentType {
    CUSTODY = 'CUSTODY',
    LOAN = 'LOAN',
  }

  export enum AssignmentStatus {
    ACTIVE = 'ACTIVE',
    RETURNED = 'RETURNED',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
  }

  export enum AssetHistoryEventType {
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    TRANSFERRED = 'TRANSFERRED',
    CUSTODY_ASSIGNED = 'CUSTODY_ASSIGNED',
    LOANED = 'LOANED',
    RETURNED = 'RETURNED',
    DISPOSED = 'DISPOSED',
  }

  export type Asset = { [key: string]: any };
  export type User = { [key: string]: any };
  export type Person = { [key: string]: any };
  export type Role = { [key: string]: any };
  export type Category = { [key: string]: any };
}
