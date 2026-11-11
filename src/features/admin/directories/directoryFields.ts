import type { TFunction } from 'i18next';
import type { FieldConfig } from '@/components/forms/FormDialog';
import type { DirectoryRules } from '@/constants/directories';
import type { Schemas, S } from '@/types/api';

export type Entry = S<'DirectoryEntryItem'>;
type Listing = S<'DirectoryListing'>;
type ExtraField = S<'DirectoryField'>;
export type EntryValues = Record<string, unknown> & { number: number | null; name: string | null };
type EnumLabel = (enumName: keyof Schemas, value?: string | null) => string;

/** A base entry (e.g. punishment types 1–3) is never deleted and keeps its locked fields. */
export const isBaseEntry = (rules: DirectoryRules | undefined, e: Pick<Entry, 'number'> | null): boolean => !!e && !!rules?.baseEntries?.numbers.has(e.number);

interface Context {
  rules: DirectoryRules | undefined;
  /** The entry being edited; `null` when adding. */
  entry: Entry | null;
  t: TFunction;
  enumLabel: EnumLabel;
}

function extraField(f: ExtraField, locked: ReadonlySet<string>, ctx: Context): FieldConfig<EntryValues> {
  const name = f.key ?? '';
  const label = f.label ?? name;
  const disabled = locked.has(name);
  const choice = ctx.rules?.choices?.[name];
  if (choice) {
    return {
      name,
      label,
      kind: 'select',
      options: choice.values.map((v) => ({ value: v, label: ctx.enumLabel(choice.enumName, v) })),
      required: !ctx.entry,
      disabled,
      helperText: disabled ? ctx.t('directories.lockedForBase') : undefined,
      half: true,
    };
  }
  if (f.kind === 'Text') return { name, label, kind: 'text', maxLength: f.maxLength || undefined, disabled, half: true };
  return { name, label, kind: 'number', min: 0, disabled, half: true };
}

const NO_LOCKS: ReadonlySet<string> = new Set();

/** Dialog fields of a directory entry: number, name and the list's extra fields, with the list's UI rules applied. */
export function entryFields(listing: Listing, ctx: Context): FieldConfig<EntryValues>[] {
  const numberFixed = !!ctx.entry && !!ctx.rules?.lockNumberOnEdit;
  // Locked extra fields apply to base entries only; looked up once per field through a Set.
  const locked = isBaseEntry(ctx.rules, ctx.entry) ? (ctx.rules?.baseEntries?.lockedFields ?? NO_LOCKS) : NO_LOCKS;
  return [
    {
      name: 'number',
      kind: 'number',
      label: ctx.t('directories.number'),
      required: true,
      half: true,
      min: 1,
      disabled: numberFixed,
      helperText: numberFixed ? ctx.t('directories.numberFixed') : undefined,
    },
    { name: 'name', kind: 'text', label: ctx.t('fields.name'), required: true, half: true, maxLength: 200 },
    ...listing.fields.map((f) => extraField(f, locked, ctx)),
  ];
}

/** Every extra field is sent on update: a missing optional field (e.g. `name-en`) is cleared by the API. */
export function extraValues(listing: Listing, v: EntryValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  listing.fields.forEach((f) => {
    if (f.key) out[f.key] = v[f.key];
  });
  return out;
}
