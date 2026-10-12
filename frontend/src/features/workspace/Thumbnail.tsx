import { useEffect, useRef, useState } from 'react';
import { renderPageToCanvas, type FileId } from '../../lib/pdf';

type Props = {
  fileId: FileId;
  bytes: Uint8Array;
  pageIndex: number;
  rotation: number;
  maxWidth: number;
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function Thumbnail({ fileId, bytes, pageIndex, rotation, maxWidth }: Props): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let cancelled = false;
    setStatus('idle');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          if (cancelled) return;
          setStatus('loading');
          renderPageToCanvas({ fileId, bytes, pageIndex, userRotation: rotation, canvas, maxWidth })
            .then(() => {
              if (!cancelled) setStatus('ready');
            })
            .catch(() => {
              if (!cancelled) setStatus('error');
            });
        }
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(wrap);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fileId, bytes, pageIndex, rotation, maxWidth]);

  return (
    <div ref={wrapRef} className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className={`block max-w-full rounded-md shadow-soft ${status === 'ready' ? '' : 'invisible'}`}
        aria-hidden="true"
      />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {status === 'error' ? (
            <span className="text-xs text-text-secondary">Preview unavailable</span>
          ) : (
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}