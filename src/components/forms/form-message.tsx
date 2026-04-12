import { cn } from "@/lib/utils";

type FormMessageProps = {
  message?: string;
  variant?: "error" | "success";
};

export function FormMessage({
  message,
  variant = "error",
}: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-primary/20 bg-primary/10 text-primary",
      )}
    >
      {message}
    </div>
  );
}
