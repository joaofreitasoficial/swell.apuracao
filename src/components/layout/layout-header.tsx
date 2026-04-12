type LayoutHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function LayoutHeader({
  eyebrow,
  title,
  description,
}: LayoutHeaderProps) {
  return (
    <header className="space-y-3">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        {eyebrow}
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </header>
  );
}
