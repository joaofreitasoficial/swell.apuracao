import Link from "next/link";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed bg-card px-6 py-10 text-center">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {ctaHref && ctaLabel ? (
        <div className="mt-6">
          <Button render={<Link href={ctaHref} />}>{ctaLabel}</Button>
        </div>
      ) : null}
    </div>
  );
}
