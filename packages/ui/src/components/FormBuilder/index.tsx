import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

import { cn } from '../../lib/cn';
import { Button } from '../Button';

import { FieldRenderer } from './FieldRenderer';
import type { Field } from './types';

export interface FormBuilderProps<T extends FieldValues> {
  /** Schema Zod (v3 ou v4) usado para validacao via @hookform/resolvers/zod. */
  schema: ZodType<T>;
  /** Lista de fields a renderizar (ordem importa). */
  fields: Field[];
  /** Valores iniciais. */
  defaultValues?: DefaultValues<T>;
  /** Callback executado apos validacao bem sucedida. */
  onSubmit: (values: T) => void | Promise<void>;
  /** Quando passado, renderiza botao de cancelar. */
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Numero de colunas no grid. Em mobile sempre eh 1. */
  cols?: 1 | 2 | 3;
  /** Override externo de loading state — caso o consumer queira controlar. */
  isSubmitting?: boolean;
  className?: string;
}

const COLS_CLASS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export function FormBuilder<T extends FieldValues>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  cols = 1,
  isSubmitting,
  className,
}: FormBuilderProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema as never) as Resolver<T>,
    defaultValues,
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting: rhfSubmitting },
  } = form;

  const submitting = isSubmitting ?? rhfSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)} noValidate>
      <div className={cn('grid gap-4', COLS_CLASS[cols])}>
        {fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            control={control as never}
            register={register as never}
            setValue={setValue as never}
            errors={errors as never}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
FormBuilder.displayName = 'FormBuilder';
