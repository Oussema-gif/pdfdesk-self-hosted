import {
  GitMerge,
  Scissors,
  LayoutGrid,
  ImagePlus,
  FileImage,
  Stamp,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import type { ToolId, ToolFlags } from '../../lib/config';

export type Tool = {
  id: ToolId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Derived. Always `/tool/${id}` — keeps registry and router in sync. */
  route: string;
};

export const TOOLS: readonly Tool[] = [
  {
    id: 'merge',
    label: 'Merge',
    description: 'Combine pages from several PDFs into a single document.',
    icon: GitMerge,
    route: '/tool/merge',
  },
  {
    id: 'split',
    label: 'Split & extract',
    description: 'Split by page ranges or extract selected pages.',
    icon: Scissors,
    route: '/tool/split',
  },
  {
    id: 'organize',
    label: 'Organize',
    description: 'Reorder, rotate, and delete pages across files.',
    icon: LayoutGrid,
    route: '/tool/organize',
  },
  {
    id: 'image_to_pdf',
    label: 'Images to PDF',
    description: 'Turn JPG and PNG files into a PDF with page size and margins.',
    icon: ImagePlus,
    route: '/tool/image_to_pdf',
  },
  {
    id: 'pdf_to_image',
    label: 'PDF to images',
    description: 'Export pages as PNG or JPG at a chosen scale and quality.',
    icon: FileImage,
    route: '/tool/pdf_to_image',
  },
  {
    id: 'watermark',
    label: 'Watermark',
    description: 'Add a text watermark to all or selected pages.',
    icon: Stamp,
    route: '/tool/watermark',
  },
  {
    id: 'page_numbers',
    label: 'Page numbers',
    description: 'Stamp page numbers with position, start value, and format.',
    icon: Hash,
    route: '/tool/page_numbers',
  },
] as const;

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function filterEnabledTools(flags: ToolFlags): Tool[] {
  return TOOLS.filter((tool) => flags[tool.id]);
}