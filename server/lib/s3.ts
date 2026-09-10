import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
let bucket: string | null = null;

function getS3() {
  if (!client) {
    const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET"] as const;
    for (const k of required) {
      if (!process.env[k]) throw new Error(`${k} no está configurado — obligatorio para usar S3.`);
    }
    client = new S3Client({ region: process.env.AWS_REGION! });
    bucket = process.env.AWS_S3_BUCKET!;
  }
  return { client: client!, bucket: bucket! };
}

export async function urlSubida(key: string, contentType: string): Promise<string> {
  const { client, bucket } = getS3();
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn: 600 });
}

export async function urlDescarga(key: string, nombreOriginal: string): Promise<string> {
  const { client, bucket } = getS3();
  const nombreSeguro = nombreOriginal.replace(/["\r\n]/g, "");
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${nombreSeguro}"`,
  });
  return getSignedUrl(client, cmd, { expiresIn: 300 });
}

export async function verificarArchivo(key: string): Promise<{ existe: boolean; tamanoBytes?: number }> {
  const { client, bucket } = getS3();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { existe: true, tamanoBytes: res.ContentLength };
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return { existe: false };
    throw err;
  }
}

// Confirmar que el archivo ES un PDF de verdad, no solo que el navegador
// declaró Content-Type/nombre de archivo terminado en .pdf (hallazgo real de
// QA: un .txt renombrado a .pdf pasa el `z.literal(TIPO_PDF)` del input y el
// Content-Type firmado del PUT sin problema, porque ambos confían en lo que
// reporta el cliente). Todo PDF real empieza con la firma ASCII "%PDF-" --
// pedimos solo los primeros 5 bytes con un Range, no el archivo completo.
export async function tieneEncabezadoPDF(key: string): Promise<boolean> {
  const { client, bucket } = getS3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-4" }));
  if (!res.Body) return false;
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes).toString("ascii") === "%PDF-";
}

export async function borrarArchivoSeguro(key: string): Promise<void> {
  try {
    const { client, bucket } = getS3();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error(`No se pudo borrar objeto S3 huérfano: ${key}`, err);
  }
}
