/**
 * Liste les clés du bucket R2 (bibliothèque ProPresenter) — miroir de
 * l'indexation faite localement par FileSystemAccessAdapter (.pro sous
 * Libraries/, médias sous Media/), mais depuis le bucket PRIVÉ. Aucun
 * identifiant exposé : le client ne reçoit que la liste des clés.
 */
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client, isR2Configured, R2_BUCKET } from "./_r2Client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isR2Configured()) {
    return res.status(501).json({ error: "R2 non configuré." });
  }

  try {
    const client = getR2Client();
    const keys: string[] = [];
    let ContinuationToken: string | undefined;
    do {
      const out = await client.send(
        new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken }),
      );
      for (const obj of out.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return res.status(200).json({ keys });
  } catch (error) {
    console.error("Erreur r2-list:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur inconnue lors de la liste R2",
    });
  }
}
