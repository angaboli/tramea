import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { useSession } from "../stores/session";
import { useAdminUsers } from "../stores/adminUsers";
import { canManageUsers } from "../../domain/auth/access";
import { partitionUsers } from "../../domain/auth/admin";
import type { Role, UserAccount } from "../../domain/auth/types";

const ROLES: Role[] = ["basic", "advanced", "admin"];
const ROLE_LABEL: Record<Role, string> = {
  basic: "Basique",
  advanced: "Avancé",
  admin: "Admin",
};

const select =
  "min-h-[40px] rounded-md border border-border-strong bg-surface px-2 text-sm text-text " +
  "focus-visible:shadow-focus focus-visible:outline-none";

function PendingRow({ user }: { user: UserAccount }) {
  const approve = useAdminUsers((s) => s.approve);
  const [role, setRole] = useState<Role>("basic");
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <span className="flex-1 truncate text-sm font-medium">{user.email}</span>
      <select
        className={select}
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={() => approve(user.id, role)}>
        Approuver
      </Button>
    </li>
  );
}

function UserRow({ user }: { user: UserAccount }) {
  const { setRole, setStatus } = useAdminUsers();
  const suspended = user.status === "suspended";
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <span className="flex-1 truncate text-sm font-medium">{user.email}</span>
      <Badge tone={suspended ? "error" : "success"}>
        {suspended ? "Suspendu" : "Actif"}
      </Badge>
      <select
        className={select}
        value={user.role ?? "basic"}
        onChange={(e) => setRole(user.id, e.target.value as Role)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {suspended ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStatus(user.id, "approved")}
        >
          Réactiver
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatus(user.id, "suspended")}
        >
          Suspendre
        </Button>
      )}
    </li>
  );
}

export function AdminPanel() {
  const { session } = useSession();
  const { users, loading, error, refresh } = useAdminUsers();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!canManageUsers(session)) return <Navigate to="/creator" replace />;

  const { pending, others } = partitionUsers(users);

  return (
    <main className="mx-auto max-w-5xl xl:max-w-5xl px-4 py-8 sm:px-8">
      <Link
        to="/creator"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text"
      >
        ← Tableau de bord
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">
        Utilisateurs
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Approuvez les nouveaux comptes et attribuez les rôles.{" "}
        {loading && "Chargement…"}
      </p>
      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <Card className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">En attente d'approbation</h2>
          <Badge tone="warning">{pending.length}</Badge>
        </div>
        {pending.length === 0 ? (
          <p className="py-3 text-center text-sm text-text-muted">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((u) => (
              <PendingRow key={u.id} user={u} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Comptes</h2>
          <Badge tone="neutral">{others.length}</Badge>
        </div>
        {others.length === 0 ? (
          <p className="py-3 text-center text-sm text-text-muted">
            Aucun compte actif.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {others.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
