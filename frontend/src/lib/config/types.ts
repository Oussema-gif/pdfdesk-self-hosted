export const TOOL_IDS = [
  'merge',
  'split',
  'organize',
  'image_to_pdf',
  'pdf_to_image',
  'watermark',
  'page_numbers',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type Limits = {
  /** Per-file size cap in megabytes, enforced client-side. */
  maxFileSizeMb: number;
  /** Total page cap across the workspace, enforced client-side. */
  maxPages: number;
};

export type ToolFlags = Record<ToolId, boolean>;

export type AppConfig = {
  appName: string;
  /** Hex colour, e.g. "#4f46e5". Applied at runtime as --color-accent. */
  accentColor: string;
  limits: Limits;
  tools: ToolFlags;
};

export const DEFAULT_ACCENT_COLOR = '#4f46e5';