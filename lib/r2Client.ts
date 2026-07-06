/**
 * Client S3 partagé vers Cloudflare R2 (bucket PRIVÉ) — utilisé uniquement
 * côté serveur (fonctions /api). Les identifiants ne quittent jamais le
 * navigateur : le client React n'appelle que /api/r2-list et /api/r2-file.
 *
 * Vit HORS de api/ : Vercel exclut du déploiement tout fichier api/_* (préfixé
 * underscore), ce qui faisait échouer l'import en production
 * ("Cannot find module '/var/task/api/_r2Client'") alors que tout fonctionnait
 * en local. lib/ est un dossier normal, toujours inclus dans le bundle.
 */
import { S3Client } from "@aws-sdk/client-s3";

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

let client: S3Client | null = null;

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    R2_BUCKET
  );
}

export function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}
