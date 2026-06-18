import { describe, it, expect } from 'vitest';
import { authErrorMessage } from './authErrorMessage';

describe('authErrorMessage', () => {
  it('mappe par code Supabase (stable)', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toMatch(/incorrect/i);
    expect(authErrorMessage({ code: 'weak_password' })).toMatch(/faible/i);
    expect(authErrorMessage({ code: 'signup_disabled' })).toMatch(/désactivées/i);
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' })).toMatch(/emails/i);
  });

  it('gère le rate limit par statut 429', () => {
    expect(authErrorMessage({ status: 429, message: 'Too Many Requests' })).toMatch(/tentatives/i);
  });

  it('extrait le délai « after N seconds »', () => {
    expect(authErrorMessage({ message: 'you can only request this after 31 seconds' })).toBe(
      'Patientez 31 s avant de réessayer.',
    );
  });

  it('repli heuristique sans code', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toMatch(/incorrect/i);
    expect(authErrorMessage(new Error('User already registered'))).toMatch(/existe déjà/i);
  });

  it('signal local CONFIRMATION_REQUIRED', () => {
    expect(authErrorMessage(new Error('CONFIRMATION_REQUIRED'))).toMatch(/Vérifiez votre email/i);
  });

  it('cas inconnu : message brut, sinon générique', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('Échec : boom');
    expect(authErrorMessage(null)).toBe('Échec de la connexion. Réessayez.');
  });
});
