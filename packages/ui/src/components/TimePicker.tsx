import { forwardRef, useCallback, type ChangeEvent } from 'react';

import { cn } from '../lib/cn';

import { Input } from './Input';

export interface TimePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

// Permite digitar progressivamente; aceita apenas digitos e ":" no formato HH:mm.
const PARTIAL_TIME_RE = /^([0-2]?\d?)(:?[0-5]?\d?)?$/;

function sanitizeInput(raw: string): string {
  // Mantem apenas digitos e ":" — descarta o resto.
  const cleaned = raw.replace(/[^0-9:]/g, '');
  // Garante no maximo um ":" e maximo 5 chars (HH:mm).
  const trimmed = cleaned.slice(0, 5);
  // Auto-insere ":" apos 2 digitos quando o usuario nao colocou.
  if (trimmed.length >= 3 && !trimmed.includes(':')) {
    return `${trimmed.slice(0, 2)}:${trimmed.slice(2, 4)}`;
  }
  return trimmed;
}

const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      placeholder = 'HH:mm',
      disabled,
      name,
      id,
      className,
      ...ariaProps
    },
    ref,
  ) => {
    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = sanitizeInput(event.target.value);
        if (next === '' || PARTIAL_TIME_RE.test(next)) {
          onChange?.(next);
        }
      },
      [onChange],
    );

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        id={id}
        maxLength={5}
        className={cn('w-[7rem] tabular-nums', className)}
        {...ariaProps}
      />
    );
  },
);
TimePicker.displayName = 'TimePicker';

export { TimePicker };
