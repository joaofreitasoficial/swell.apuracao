import { CreateUserCard } from "@/components/super-admin/create-user-card";
import { UsersTable } from "@/components/super-admin/users-table";
import { listManagedUsers } from "@/lib/auth/queries";

export default async function SuperAdminUsersPage() {
  const users = await listManagedUsers();

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <CreateUserCard />
      <UsersTable users={users} />
    </div>
  );
}
