import { del, put } from '@vercel/blob';

export async function saveImageFile(
  buffer: ArrayBuffer,
  originalName: string,
): Promise<string> {
  const safeName = `image-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${originalName}`;

  console.log(
    'Has Blob Token:',
    !!process.env.BLOB_READ_WRITE_TOKEN,
  );

  const blob = await put(safeName, Buffer.from(buffer), {
    access: 'public',
    addRandomSuffix: false,
  });

  // Store the Blob URL in the database
  return blob.url;
}

export async function deleteImageFile(storagePath: string): Promise<void> {
  try {
    await del(storagePath);
  } catch (err) {
    console.error('Failed to delete blob:', err);
  }
}