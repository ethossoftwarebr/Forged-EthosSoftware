export { cn } from './lib/cn';

export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';

// Wave 1 — GRUPO A: Forms
export { Label, type LabelProps } from './components/Label';
export { Textarea, type TextareaProps } from './components/Textarea';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/Select';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupProps,
  type RadioGroupItemProps,
} from './components/RadioGroup';
export { Switch, type SwitchProps } from './components/Switch';
export { Slider, type SliderProps } from './components/Slider';
export { TimePicker, type TimePickerProps } from './components/TimePicker';
export {
  FormField,
  FormFieldLabel,
  FormFieldHint,
  FormFieldError,
  type FormFieldProps,
  type FormFieldLabelProps,
} from './components/FormField';

// Wave 2 — GRUPO B: Feedback
export { Alert, AlertTitle, AlertDescription, type AlertProps } from './components/Alert';
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';
export { Toaster, toast, type ToasterProps } from './components/Toast';
export { Skeleton } from './components/Skeleton';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Progress } from './components/Progress';

// Wave 3 — GRUPO C: Overlays + DatePicker
export { Popover, PopoverTrigger, PopoverContent } from './components/Popover';
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/Dialog';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  sheetVariants,
} from './components/Sheet';
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './components/Tooltip';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './components/DropdownMenu';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuRadioGroup,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from './components/ContextMenu';
export { DatePicker, type DatePickerProps } from './components/DatePicker';

// Wave 4 — GRUPO D: Navegação
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbEllipsis,
} from './components/Breadcrumb';
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  type PaginationLinkProps,
} from './components/Pagination';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from './components/Command';

// Wave 5 — GRUPO E: Estrutura
export { Separator } from './components/Separator';
export { ScrollArea, ScrollBar } from './components/ScrollArea';
export { AspectRatio } from './components/AspectRatio';
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  type AvatarProps,
} from './components/Avatar';
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/Accordion';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/Collapsible';

// Wave 1 (Compostos #5) — atomic
export { StatusBadge, statusBadgeVariants, type StatusBadgeProps } from './components/StatusBadge';
export { UserAvatar, type UserAvatarProps } from './components/UserAvatar';
export { SectionHeader, type SectionHeaderProps } from './components/SectionHeader';
export {
  PageHeader,
  type PageHeaderProps,
  type BreadcrumbItem as PageHeaderBreadcrumbItem,
} from './components/PageHeader';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';

// Wave 2 (Compostos #5) — KpiCard + ConfirmDialog
export {
  KpiCard,
  type KpiCardProps,
  type KpiTrend,
  type KpiTrendDirection,
} from './components/KpiCard';
export {
  ConfirmDialogProvider,
  useConfirm,
  type ConfirmOptions,
  type ConfirmVariant,
} from './components/ConfirmDialog';

// Wave 3 (Compostos #5) — FormBuilder
export { FormBuilder, type FormBuilderProps } from './components/FormBuilder';
export type {
  Field,
  FieldType,
  BaseField,
  TextField,
  SelectField,
  SelectOption,
  CheckboxField,
  DateField,
  FileField,
  CustomField,
  CustomFieldRenderProps,
} from './components/FormBuilder/types';
