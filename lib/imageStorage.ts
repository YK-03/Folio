import fs from 'fs';
import path from 'path';

export async function saveImageFile(buffer: ArrayBuffer, originalName: string): Promise<string> {
  // Store files in a non-public directory to keep uploads private by default
  const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const safeExt = getExtension(originalName) || '.png';
  const fileName = `image-${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
  const filePath = path.join(uploadsDir, fileName);

  const data = Buffer.from(buffer);
  await fs.promises.writeFile(filePath, data);

  // Return the internal storage path relative to project root
  return path.join('storage', 'uploads', fileName);
}

const getExtension = (name: string) => {
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (!match) return '';
  return `.${match[1]?.toLowerCase()}`;
};

export async function deleteImageFile(storagePath: string): Promise<void> {
  try {
    const abs = path.join(process.cwd(), storagePath);
    await fs.promises.unlink(abs);
  } catch (err) {
    // Ignore file-not-found errors
  }
}
