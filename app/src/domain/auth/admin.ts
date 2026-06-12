import type { UserAccount } from './types';

/** Partitionne les comptes : en attente d'abord, puis les autres. */
export function partitionUsers(users: readonly UserAccount[]): {
  pending: UserAccount[];
  others: UserAccount[];
} {
  const pending: UserAccount[] = [];
  const others: UserAccount[] = [];
  for (const u of users) {
    (u.status === 'pending' ? pending : others).push(u);
  }
  const byEmail = (a: UserAccount, b: UserAccount) => a.email.localeCompare(b.email);
  pending.sort(byEmail);
  others.sort(byEmail);
  return { pending, others };
}
