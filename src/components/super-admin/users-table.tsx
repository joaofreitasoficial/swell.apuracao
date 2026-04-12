import { ShieldCheck, ShieldX } from "lucide-react";

import { EditUserDialog } from "@/components/super-admin/edit-user-dialog";
import { UserActions } from "@/components/super-admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManagedUser } from "@/types/auth";

export function UsersTable({ users }: { users: ManagedUser[] }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-tight">Usuários</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          CRUD completo com papel, status ativo/inativo e reset de senha via
          Server Actions.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                    {user.role === "super_admin" ? "Super Admin" : "Usuário"}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={user.isActive ? "default" : "outline"}>
                    <span className="mr-1 inline-flex">
                      {user.isActive ? (
                        <ShieldCheck className="size-3.5" />
                      ) : (
                        <ShieldX className="size-3.5" />
                      )}
                    </span>
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(user.updatedAt))}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-wrap justify-end gap-2">
                    <EditUserDialog user={user} />
                    <UserActions user={user} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
