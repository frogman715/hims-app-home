import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
  children,
}: WorkspaceHeroProps) {
  return (
    <section
      className={cn(
        "mb-6 overflow-hidden rounded-3xl border border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_40%,#f0f9ff_100%)] p-6 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {description ? <div className="mt-3 text-sm leading-7 text-slate-600">{description}</div> : null}
          {meta ? <div className="mt-4 text-sm text-slate-500">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export default WorkspaceHero;
