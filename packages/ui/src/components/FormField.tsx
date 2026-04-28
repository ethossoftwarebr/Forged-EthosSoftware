import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '../lib/cn';

import { Label } from './Label';

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Identificador semantico do campo (usado para nome do input quando id ausente) */
  name: string;
  /** Texto da label visual */
  label?: ReactNode;
  /** Texto secundario abaixo do input */
  hint?: ReactNode;
  /** Mensagem de erro — quando presente, aplica aria-invalid no children */
  error?: ReactNode;
  /** Marca visualmente como obrigatorio (asterisco). Nao adiciona required attr no input. */
  required?: boolean;
  /** Sobrescreve o id gerado automaticamente */
  id?: string;
  /** Conteudo (input, textarea, select etc.) — wrapper injeta id/aria-* via cloneElement */
  children: ReactNode;
}

interface InjectedChildProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  name?: string;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, name, label, hint, error, required, id: idProp, children, ...rest }, ref) => {
    const reactId = useId();
    const fieldId = idProp ?? `ff-${name}-${reactId}`;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    const describedBy = useMemo(() => {
      const ids: string[] = [];
      if (hint) ids.push(hintId);
      if (error) ids.push(errorId);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [hint, error, hintId, errorId]);

    const injected = Children.map(children, (child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement<InjectedChildProps>;
      const existingDescribedBy = element.props['aria-describedby'];
      const mergedDescribedBy =
        [existingDescribedBy, describedBy].filter(Boolean).join(' ') || undefined;
      return cloneElement(element, {
        id: element.props.id ?? fieldId,
        name: element.props.name ?? name,
        'aria-describedby': mergedDescribedBy,
        'aria-invalid': error ? true : element.props['aria-invalid'],
      });
    });

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...rest}>
        {label ? (
          <FormFieldLabel htmlFor={fieldId} required={required}>
            {label}
          </FormFieldLabel>
        ) : null}
        {injected}
        {hint ? <FormFieldHint id={hintId}>{hint}</FormFieldHint> : null}
        {error ? <FormFieldError id={errorId}>{error}</FormFieldError> : null}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export interface FormFieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const FormFieldLabel = forwardRef<HTMLLabelElement, FormFieldLabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <Label ref={ref} className={cn('block', className)} {...props}>
      {children}
      {required ? (
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      ) : null}
    </Label>
  ),
);
FormFieldLabel.displayName = 'FormFieldLabel';

const FormFieldHint = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-muted-foreground text-xs', className)} {...props} />
  ),
);
FormFieldHint.displayName = 'FormFieldHint';

const FormFieldError = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      role="alert"
      className={cn('text-destructive text-xs font-medium', className)}
      {...props}
    />
  ),
);
FormFieldError.displayName = 'FormFieldError';

export { FormField, FormFieldLabel, FormFieldHint, FormFieldError };
