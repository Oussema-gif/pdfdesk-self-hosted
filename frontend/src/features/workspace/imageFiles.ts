export const IMAGE_ACCEPT_ATTR = 'image/png,image/jpeg,.png,.jpg,.jpeg';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'] as const;

export function filterImageFiles(files: readonly File[]): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    const lower = file.name.toLowerCase();
    const hasExt = IMAGE_EXTS.some((ext) => lower.endsWith(ext));
    const hasType = file.type === 'image/png' || file.type === 'image/jpeg';
    if (hasExt || hasType) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}
