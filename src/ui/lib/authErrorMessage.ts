/**
 * Traduit une erreur d'authentification (Supabase ou locale) en message FR clair.
 *
 * Stratégie robuste, du plus fiable au moins fiable :
 *   1) `error.code` — identifiants STABLES de Supabase (indépendants de la langue).
 *   2) `error.status` — code HTTP (ex. 429 = rate limit).
 *   3) heuristiques sur le message (anciennes erreurs sans code, adapter local).
 *   4) message brut de Supabase (pour diagnostiquer un cas inconnu).
 *
 * Réf. codes Supabase : https://supabase.com/docs/guides/auth/debugging/error-codes
 */

interface AuthLikeError {
  code?: string;
  status?: number;
  message?: string;
}

function asAuthError(err: unknown): AuthLikeError {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    return {
      code: typeof e.code === 'string' ? e.code : undefined,
      status: typeof e.status === 'number' ? e.status : undefined,
      message: typeof e.message === 'string' ? e.message : undefined,
    };
  }
  return {};
}

// Codes d'erreur Supabase → message FR.
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect (ou compte pas encore créé).',
  email_not_confirmed: 'Email non confirmé. Confirmez-le via l’email reçu, puis connectez-vous.',
  user_already_exists: 'Un compte existe déjà pour cet email — connectez-vous.',
  email_exists: 'Un compte existe déjà pour cet email — connectez-vous.',
  weak_password: 'Mot de passe trop faible (au moins 6 caractères).',
  signup_disabled: 'Inscriptions désactivées sur Supabase (Authentication → Sign Up → « Allow new users to sign up »).',
  email_provider_disabled: 'Connexion par email désactivée sur Supabase (Authentication → Providers → Email).',
  email_address_invalid: 'Adresse email invalide.',
  validation_failed: 'Adresse email ou requête invalide.',
  user_not_found: 'Aucun compte pour cet email.',
  same_password: 'Le nouveau mot de passe doit être différent de l’ancien.',
  otp_expired: 'Le lien a expiré. Redemandez un lien de connexion.',
  over_email_send_rate_limit:
    'Trop d’emails envoyés. Réessayez dans quelques minutes, ou connectez-vous par mot de passe.',
  over_request_rate_limit: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
};

/** Message FR pour une erreur d'authentification. */
export function authErrorMessage(err: unknown): string {
  const { code, status, message } = asAuthError(err);
  const msg = (message ?? '').toLowerCase();

  // Cas local (adapter dev) : inscription en attente de confirmation.
  if (message === 'CONFIRMATION_REQUIRED' || code === 'confirmation_required') {
    return 'Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.';
  }

  // 1) Par code stable.
  if (code && BY_CODE[code]) return BY_CODE[code];

  // 2) Rate limit avec délai précis (« after N seconds »).
  const after = msg.match(/after (\d+) seconds/);
  if (after) return `Patientez ${after[1]} s avant de réessayer.`;

  // 3) Par statut HTTP.
  if (status === 429) {
    return 'Trop de tentatives. Réessayez dans quelques minutes, ou connectez-vous par mot de passe.';
  }

  // 4) Heuristiques de repli (erreurs anciennes sans code).
  if (msg.includes('rate limit')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes, ou connectez-vous par mot de passe.';
  }
  if (msg.includes('invalid login') || msg.includes('credentials')) return BY_CODE.invalid_credentials;
  if (msg.includes('already registered') || msg.includes('already exists')) return BY_CODE.user_already_exists;
  if (msg.includes('email not confirmed')) return BY_CODE.email_not_confirmed;
  if (msg.includes('password') && (msg.includes('6') || msg.includes('least') || msg.includes('short'))) {
    return BY_CODE.weak_password;
  }
  if (msg.includes('signup') && (msg.includes('disabled') || msg.includes('not allowed'))) {
    return BY_CODE.signup_disabled;
  }
  if (msg.includes('redirect')) {
    return 'URL de redirection non autorisée — ajoutez l’URL de l’app dans Supabase (Authentication → URL Configuration).';
  }
  if (msg.includes('invalid') && msg.includes('email')) return BY_CODE.email_address_invalid;

  // 5) Cas inconnu : message brut pour diagnostiquer, sinon générique.
  return message ? `Échec : ${message}` : 'Échec de la connexion. Réessayez.';
}
