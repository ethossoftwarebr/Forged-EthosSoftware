import { Fragment, forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemPrimitive,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../Breadcrumb';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, breadcrumbs, actions, ...props }, ref) => {
    const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

    return (
      <div ref={ref} className={cn('mb-6 border-b pb-6', className)} {...props}>
        {hasBreadcrumbs ? (
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              {breadcrumbs!.map((crumb, index) => {
                const isLast = index === breadcrumbs!.length - 1;
                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    <BreadcrumbItemPrimitive>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItemPrimitive>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    );
  },
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
