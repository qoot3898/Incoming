import type { S } from '@/types/api';

/**
 * Direct user permissions (TL-N9). A user holds (their roles' permissions ∪ what is granted to them
 * directly) − what is denied to them directly, so a denial beats every grant.
 */
export type DirectEffect = 'Grant' | 'Deny' | null;

/** A permission row of the screen: the API item with its text fields filled in (a row without a code cannot be saved and is dropped). */
export interface PermissionRow {
  code: string;
  name: string;
  description: string | null;
  module: string;
  moduleName: string;
  isSensitive: boolean;
  roles: string[];
  direct: DirectEffect;
  isEffective: boolean;
}

export function toRows(items: readonly S<'UserPermissionItem'>[]): PermissionRow[] {
  return items.flatMap((i): PermissionRow[] =>
    i.code
      ? [
          {
            code: i.code,
            name: i.name || i.code,
            description: i.description,
            module: i.module ?? '',
            moduleName: i.moduleName || i.module || '',
            isSensitive: i.isSensitive,
            roles: i.roles.filter(Boolean),
            direct: i.direct,
            isEffective: i.isEffective,
          },
        ]
      : [],
  );
}

export interface PermissionRef {
  code: string;
  direct: DirectEffect;
}

/** Pending changes: permission code → the direct effect it should have (only codes that differ from the server). */
export type Edits = Readonly<Record<string, DirectEffect>>;

/** Whether a user holds a permission given whether a role gives it and the direct effect. */
export const isEffective = (givenByRole: boolean, direct: DirectEffect): boolean => direct !== 'Deny' && (givenByRole || direct === 'Grant');

/**
 * Whether the editor must hold the permission themselves to move it from `from` to `to`: granting a
 * permission and lifting a denial open something up, while denying and withdrawing a grant never do.
 * The API (`PERMISSION_NOT_HELD`) is authoritative; the screen only disables what it would refuse.
 */
export function needsHolding(from: DirectEffect, to: DirectEffect): boolean {
  if (to === 'Grant' && from !== 'Grant') return true;
  return from === 'Deny' && to !== 'Deny';
}

/** The effect a row will have once the pending changes are saved. */
export const finalEffect = (row: PermissionRef, edits: Edits): DirectEffect => (row.code in edits ? edits[row.code] : row.direct);

/** `edits` with `row` set to `next`; the entry is dropped when `next` is what the server already has. */
export function withEdit(edits: Edits, row: PermissionRef, next: DirectEffect): Edits {
  const rest = Object.fromEntries(Object.entries(edits).filter(([code]) => code !== row.code));
  return next === row.direct ? rest : { ...rest, [row.code]: next };
}

/** How many permissions differ from what is saved. */
export const changedCount = (edits: Edits): number => Object.keys(edits).length;

/** The body of `PUT /users/{id}/permissions`: the complete grant and denial lists, in the screen's order. */
export function toRequest(rows: readonly PermissionRef[], edits: Edits): { granted: string[]; denied: string[] } {
  const effects = rows.map((r) => [r.code, finalEffect(r, edits)] as const);
  return {
    granted: effects.filter(([, e]) => e === 'Grant').map(([c]) => c),
    denied: effects.filter(([, e]) => e === 'Deny').map(([c]) => c),
  };
}

/** Rows grouped by module, in the order the API sends them. */
export function groupByModule<T extends { module: string; moduleName: string }>(rows: readonly T[]): { module: string; moduleName: string; rows: T[] }[] {
  const groups = new Map<string, { module: string; moduleName: string; rows: T[] }>();
  rows.forEach((r) => {
    const group = groups.get(r.module) ?? { module: r.module, moduleName: r.moduleName, rows: [] };
    group.rows.push(r);
    groups.set(r.module, group);
  });
  return [...groups.values()];
}
