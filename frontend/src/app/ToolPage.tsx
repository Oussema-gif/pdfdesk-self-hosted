import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTool } from '../features/tools';
import { MergeWorkspace } from './MergeWorkspace';
import { SplitWorkspace } from './SplitWorkspace';
import { ImageWorkspace } from '../features/images-to-pdf/ImageWorkspace';
import { PdfToImagesWorkspace } from '../features/pdf-to-images/PdfToImagesWorkspace';
import { WatermarkWorkspace } from '../features/watermark/WatermarkWorkspace';
import { PageNumbersWorkspace } from '../features/page-numbers/PageNumbersWorkspace';

export function ToolPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const tool = useTool(id);

  if (tool === undefined) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Tool not available</h1>
        <p className="mt-2 text-sm text-text-secondary">
          This tool is either disabled by your administrator or doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-text-secondary shadow-soft transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tools
        </Link>
      </div>
    );
  }

  if (tool.id === 'merge' || tool.id === 'organize') {
    return <MergeWorkspace />;
  }

  if (tool.id === 'split') {
    return <SplitWorkspace />;
  }

  if (tool.id === 'image_to_pdf') {
    return <ImageWorkspace />;
  }

  if (tool.id === 'pdf_to_image') {
    return <PdfToImagesWorkspace />;
  }

  if (tool.id === 'watermark') {
    return <WatermarkWorkspace />;
  }

  if (tool.id === 'page_numbers') {
    return <PageNumbersWorkspace />;
  }

  const Icon = tool.icon;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All tools
      </Link>
      <div className="mt-6 flex items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{tool.label}</h1>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{tool.description}</p>
        </div>
      </div>
      <div className="mt-8 rounded-card border border-border bg-surface-raised p-6 shadow-soft">
        <p className="text-sm font-medium text-text-primary">Tool not found</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The link you followed may be out of date. Pick a tool from the home page.
        </p>
      </div>
    </div>
  );
}
