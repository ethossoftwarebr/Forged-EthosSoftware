import 'react-day-picker/style.css';

import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { DayPicker, type Locale } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';

import { cn } from '../lib/cn';

import { Button } from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  locale?: Locale;
  className?: string;
  /** Forwarded to the trigger button. */
  id?: string;
}

const DEFAULT_PLACEHOLDER = 'Selecione uma data';

function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function DatePicker({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  locale,
  className,
  id,
}: DatePickerProps) {
  const resolvedLocale = useMemo(() => locale ?? ptBR, [locale]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-[240px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon aria-hidden="true" />
          {value ? formatDateBR(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={resolvedLocale}
          showOutsideDays
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
DatePicker.displayName = 'DatePicker';

export { DatePicker };
