/**
 * Sert un fichier du bucket R2 privé (.pro ou média), par clé exacte. Proxy
 * serveur→serveur : évite d'exposer les identifiants R2 au navigateur.
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, isR2Configured, R2_BUCKET } from "./_r2Client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isR2Configured()) {
    return res.status(501).json({ error: "R2 non configuré." });
  }

  const key = (req.query?.key as string | undefined)?.trim();
  if (!key) {
    return res.status(400).json({ error: 'Le paramètre "key" est requis.' });
  }

  try {
    const client = getR2Client();
    const out = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) return res.status(404).json({ error: "Fichier introuvable." });

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    if (/NoSuchKey|NotFound/i.test(message)) {
      return res.status(404).json({ error: "Fichier introuvable." });
    }
    console.error("Erreur r2-file:", error);
    return res.status(500).json({ error: message });
  }
}
