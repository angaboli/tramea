import { describe, it, expect } from 'vitest';
import {
  hasAccess,
  isPending,
  atLeast,
  canCreateProgramme,
  canCreateTrame,
  canManageUsers,
} from './access';
import type { Session } from './types';

const s = (over: Partial<Session>): Session => ({
  email: 'a@b.c',
  status: 'approved',
  role: 'basic',
  ...over,
});

describe('hasAccess (deny-by-default)', () => {
  it('refuse null', () => expect(hasAccess(null)).toBe(false));
  it('refuse un compte pending', () =>
    expect(hasAccess(s({ status: 'pending', role: null }))).toBe(false));
  it('refuse un approuvé sans rôle', () =>
    expect(hasAccess(s({ role: null }))).toBe(false));
  it('accepte approuvé avec rôle', () => expect(hasAccess(s({}))).toBe(true));
});

describe('isPending', () => {
  it('vrai si pending', () =>
    expect(isPending(s({ status: 'pending', role: null }))).toBe(true));
  it('faux sinon', () => expect(isPending(s({}))).toBe(false));
});

describe('atLeast (hiérarchie)', () => {
  it('admin couvre tout', () => {
    expect(atLeast('admin', 'basic')).toBe(true);
    expect(atLeast('admin', 'advanced')).toBe(true);
    expect(atLeast('admin', 'admin')).toBe(true);
  });
  it('basic ne couvre pas advanced', () =>
    expect(atLeast('basic', 'advanced')).toBe(false));
  it('null ne couvre rien', () => expect(atLeast(null, 'basic')).toBe(false));
});

describe('capacités métier', () => {
  it('basic : programme oui, trame non, users non', () => {
    const sess = s({ role: 'basic' });
    expect(canCreateProgramme(sess)).toBe(true);
    expect(canCreateTrame(sess)).toBe(false);
    expect(canManageUsers(sess)).toBe(false);
  });
  it('advanced : programme + trame, users non', () => {
    const sess = s({ role: 'advanced' });
    expect(canCreateProgramme(sess)).toBe(true);
    expect(canCreateTrame(sess)).toBe(true);
    expect(canManageUsers(sess)).toBe(false);
  });
  it('admin : tout', () => {
    const sess = s({ role: 'admin' });
    expect(canManageUsers(sess)).toBe(true);
  });
  it('pending : aucune capacité', () => {
    const sess = s({ status: 'pending', role: null });
    expect(canCreateProgramme(sess)).toBe(false);
  });
});
