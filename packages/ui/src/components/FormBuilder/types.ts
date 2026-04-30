import type { ReactNode } from 'react';
import type {
  Control,
  FieldValues,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'file'
  | 'custom';

export interface BaseField {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface TextField extends BaseField {
  type: 'text' | 'number' | 'email' | 'password' | 'textarea';
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectField extends BaseField {
  type: 'select' | 'multiselect';
  options: SelectOption[];
}

export interface CheckboxField extends BaseField {
  type: 'checkbox' | 'switch';
}

export interface DateField extends BaseField {
  type: 'date';
}

export interface FileField extends BaseField {
  type: 'file';
  accept?: string;
}

export interface CustomFieldRenderProps {
  control: Control<FieldValues>;
  name: string;
  error?: string;
  disabled?: boolean;
}

export interface CustomField extends BaseField {
  type: 'custom';
  render: (props: CustomFieldRenderProps) => ReactNode;
}

export type Field = TextField | SelectField | CheckboxField | DateField | FileField | CustomField;

/**
 * Props passados para FieldRenderer. Mantemos as referencias do form hook
 * (control/register/setValue) explicitas em vez de useFormContext —
 * mais testavel e sem magia implicita.
 */
export interface FieldRendererProps {
  field: Field;
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  errors: FieldErrors<FieldValues>;
}
