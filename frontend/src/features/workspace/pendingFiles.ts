/**
 * One-slot handoff for files dropped on the home page. The home drop zone
 * stashes its files here and navigates into the merge tool; the workspace
 * provider picks them up on mount. Not reactive state — a plain module slot
 * is enough for a single navigation.
 */
let pending: File[] | null = null;

export function setPendingFiles(files: readonly File[]): void {
  pending = files.length > 0 ? Array.from(files) : null;
}

export function takePendingFiles(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}
