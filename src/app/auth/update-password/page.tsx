import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function UpdatePasswordPage() {
  const context = await requireAuthenticatedUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <UpdatePasswordForm
        description={`Você está redefinindo a senha da conta ${context.email}.`}
      />
    </div>
  );
}
