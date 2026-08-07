export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error?: string }).error
        : 'Image upload failed';
    throw new Error(message || 'Image upload failed');
  }

  const data = (await response.json()) as { id: string; url: string };
  if (!data?.url || !data?.id) {
    throw new Error('Image upload did not return expected data');
  }

  // Return the protected URL to use in the editor
  return data.url;
}
