import { Search } from 'lucide-react';

import { Checkbox } from '../Checkbox';
import { DatePicker } from '../DatePicker';
import { Input } from '../Input';
import { Label } from '../Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select';
import { Slider } from '../Slider';

import type {
  DaterangeFilter,
  FieldsRendererProps,
  Filter,
  FilterValue,
  FiltersValues,
  MultiselectFilter,
  RangeFilter,
  SearchFilter,
  SelectFilter,
} from './types';

function HelperText({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-muted-foreground text-xs">{text}</p>;
}

function SearchField({
  filter,
  value,
  onChange,
}: {
  filter: SearchFilter;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const current = typeof value === 'string' ? value : '';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={filter.key}>{filter.label}</Label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={filter.key}
          className="pl-8"
          placeholder={filter.placeholder}
          value={current}
          onChange={(e) => onChange(e.target.value)}
          disabled={filter.disabled}
        />
      </div>
      <HelperText text={filter.helperText} />
    </div>
  );
}

function SelectField({
  filter,
  value,
  onChange,
}: {
  filter: SelectFilter;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const current = typeof value === 'string' ? value : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={filter.key}>{filter.label}</Label>
      <Select value={current} onValueChange={(v) => onChange(v)} disabled={filter.disabled}>
        <SelectTrigger id={filter.key}>
          <SelectValue placeholder={filter.placeholder ?? 'Selecione'} />
        </SelectTrigger>
        <SelectContent>
          {filter.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <HelperText text={filter.helperText} />
    </div>
  );
}

function MultiselectField({
  filter,
  value,
  onChange,
}: {
  filter: MultiselectFilter;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const current = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => {
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>{filter.label}</Label>
      <div className="space-y-2">
        {filter.options.map((o) => {
          const id = `${filter.key}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={current.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
                disabled={filter.disabled}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {o.label}
              </Label>
            </div>
          );
        })}
      </div>
      <HelperText text={filter.helperText} />
    </div>
  );
}

function RangeField({
  filter,
  value,
  onChange,
}: {
  filter: RangeFilter;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const current: [number, number] = Array.isArray(value)
    ? ([value[0] as number, value[1] as number] as [number, number])
    : [filter.min, filter.max];
  const formatter = filter.formatLabel ?? ((n: number) => String(n));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{filter.label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatter(current[0])} - {formatter(current[1])}
        </span>
      </div>
      <Slider
        min={filter.min}
        max={filter.max}
        step={filter.step ?? 1}
        value={current}
        onValueChange={(arr: number[]) => {
          if (arr.length >= 2) {
            onChange([arr[0] as number, arr[1] as number] as [number, number]);
          }
        }}
        disabled={filter.disabled}
      />
      <HelperText text={filter.helperText} />
    </div>
  );
}

function DaterangeField({
  filter,
  value,
  onChange,
}: {
  filter: DaterangeFilter;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const current =
    value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
      ? (value as { from?: Date; to?: Date })
      : {};
  return (
    <div className="space-y-1.5">
      <Label>{filter.label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={current.from}
          onChange={(d) => onChange({ ...current, from: d })}
          placeholder="De"
          disabled={filter.disabled}
          className="w-full"
        />
        <DatePicker
          value={current.to}
          onChange={(d) => onChange({ ...current, to: d })}
          placeholder="Ate"
          disabled={filter.disabled}
          className="w-full"
        />
      </div>
      <HelperText text={filter.helperText} />
    </div>
  );
}

function FieldsRenderer({ filters, values, onChange }: FieldsRendererProps) {
  const set = (key: string, v: FilterValue) => {
    const next: FiltersValues = { ...values, [key]: v };
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {filters.map((f: Filter) => {
        switch (f.type) {
          case 'search':
            return (
              <SearchField
                key={f.key}
                filter={f}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            );
          case 'select':
            return (
              <SelectField
                key={f.key}
                filter={f}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            );
          case 'multiselect':
            return (
              <MultiselectField
                key={f.key}
                filter={f}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            );
          case 'range':
            return (
              <RangeField
                key={f.key}
                filter={f}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            );
          case 'daterange':
            return (
              <DaterangeField
                key={f.key}
                filter={f}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            );
        }
      })}
    </div>
  );
}

export { FieldsRenderer };
