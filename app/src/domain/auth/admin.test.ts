import { describe, it, expect } from 'vitest';
import { partitionUsers } from './admin';
import type { UserAccount } from './types';

const u = (email: string, status: UserAccount['status'], role: UserAccount['role'] = null): UserAccount => ({
  id: email,
  email,
  status,
  role,
});

describe('partitionUsers', () => {
  it('sépare les comptes en attente des autres, triés par email', () => {
    const users = [
      u('zoe@x.com', 'approved', 'basic'),
      u('bob@x.com', 'pending'),
      u('ana@x.com', 'pending'),
      u('max@x.com', 'suspended'),
    ];
    const { pending, others } = partitionUsers(users);
    expect(pending.map((x) => x.email)).toEqual(['ana@x.com', 'bob@x.com']);
    expect(others.map((x) => x.email)).toEqual(['max@x.com', 'zoe@x.com']);
  });

  it('gère une liste vide', () => {
    expect(partitionUsers([])).toEqual({ pending: [], others: [] });
  });
});
