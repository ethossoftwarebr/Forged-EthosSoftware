import { Controller, type ControllerRenderProps, type FieldValues } from 'react-hook-form';

import { cn } from '../../lib/cn';
import { Checkbox } from '../Checkbox';
import { DatePicker } from '../DatePicker';
import { FormField } from '../FormField';
import { Input } from '../Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select';
import { Switch } from '../Switch';
import { Textarea } from '../Textarea';

import type { Field, FieldRendererProps, SelectOption } from './types';

/**
 * Mapeia FieldType de texto para o atributo `type` do <input>.
 * Nao inclui textarea (renderiza Textarea, nao Input).
 */
function mapInputType(type: 'text' | 'number' | 'email' | 'password'): string {
  return type;
}

function getErrorMessage(field: Field, errors: FieldRendererProps['errors']): string | undefined {
  const err = errors[field.name];
  if (!err) return undefined;
  const msg = err.message;
  return typeof msg === 'string' ? msg : undefined;
}

function MultiselectControl({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-input bg-background flex flex-col gap-2 rounded-md border p-3">
      {options.map((opt) => {
        const checked = value.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-2 text-sm',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => {
                if (next === true) {
                  if (!checked) onChange([...value, opt.value]);
                } else {
                  onChange(value.filter((v) => v !== opt.value));
                }
              }}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxControl({
  field,
  rhfField,
}: {
  field: Field & { type: 'checkbox' | 'switch' };
  rhfField: ControllerRenderProps<FieldValues, string>;
}) {
  const Toggle = field.type === 'switch' ? Switch : Checkbox;
  return (
    <div className="flex items-center gap-2 pt-1">
      <Toggle
        checked={Boolean(rhfField.value)}
        disabled={field.disabled}
        onCheckedChange={(next) => rhfField.onChange(next === true)}
      />
      {field.placeholder ? (
        <span className="text-muted-foreground text-sm">{field.placeholder}</span>
      ) : null}
    </div>
  );
}

export function FieldRenderer({ field, control, register, setValue, errors }: FieldRendererProps) {
  const error = getErrorMessage(field, errors);
  const wrapperProps = {
    name: field.name,
    label: field.label,
    hint: field.helperText,
    error,
    required: field.required,
  };

  switch (field.type) {
    case 'text':
    case 'number':
    case 'email':
    case 'password': {
      return (
        <FormField {...wrapperProps}>
          <Input
            type={mapInputType(field.type)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            {...register(field.name)}
          />
        </FormField>
      );
    }

    case 'textarea': {
      return (
        <FormField {...wrapperProps}>
          <Textarea
            placeholder={field.placeholder}
            disabled={field.disabled}
            {...register(field.name)}
          />
        </FormField>
      );
    }

    case 'select': {
      return (
        <FormField {...wrapperProps}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <Select
                value={typeof f.value === 'string' ? f.value : ''}
                onValueChange={f.onChange}
                disabled={field.disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      );
    }

    case 'multiselect': {
      return (
        <FormField {...wrapperProps}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <MultiselectControl
                options={field.options}
                value={Array.isArray(f.value) ? (f.value as string[]) : []}
                onChange={f.onChange}
                disabled={field.disabled}
              />
            )}
          />
        </FormField>
      );
    }

    case 'checkbox':
    case 'switch': {
      return (
        <FormField {...wrapperProps}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => <CheckboxControl field={field} rhfField={f} />}
          />
        </FormField>
      );
    }

    case 'date': {
      return (
        <FormField {...wrapperProps}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <DatePicker
                value={f.value instanceof Date ? f.value : undefined}
                onChange={f.onChange}
                disabled={field.disabled}
                placeholder={field.placeholder}
              />
            )}
          />
        </FormField>
      );
    }

    case 'file': {
      return (
        <FormField {...wrapperProps}>
          <input
            type="file"
            accept={field.accept}
            disabled={field.disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setValue(field.name, file ?? null, { shouldValidate: true, shouldDirty: true });
            }}
            className={cn(
              'border-input bg-background ring-offset-background flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm',
              'file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:mr-3 file:rounded-sm file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        </FormField>
      );
    }

    case 'custom': {
      return (
        <FormField {...wrapperProps}>
          {field.render({
            control,
            name: field.name,
            error,
            disabled: field.disabled,
          })}
        </FormField>
      );
    }

    default: {
      // Exhaustive check — TS forca cobertura completa do union
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}
