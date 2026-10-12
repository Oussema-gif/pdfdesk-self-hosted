import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Moon, Sun, Monitor } from 'lucide-react';
import { useConfig } from '../lib/config';
import { useTheme } from '../lib/theme';
import type { ThemePreference } from '../lib/theme';

type Props = { children: ReactNode };

const THEME_ICON: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function Layout({ children }: Props): JSX.Element {
  const { config } = useConfig();
  const { preference, cycle } = useTheme();
  const Icon = THEME_ICON[preference];
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/' || location.pathname === '';

  const onBack = (): void => {
    // React Router labels the initial history entry with key: 'default'.
    // Calling navigate(-1) from there would leave the app; send them home
    // instead.
    if (location.key === 'default') {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          {!isHome && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary shadow-soft transition-all hover:text-text-primary active:scale-[0.97]"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <Link
            to="/"
            className="rounded-control px-2 py-1 text-base font-semibold tracking-tight text-text-primary transition-colors hover:bg-surface-raised"
          >
            {config.appName}
          </Link>
          <button
            type="button"
            onClick={cycle}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-secondary shadow-soft transition-all hover:text-text-primary active:scale-[0.97]"
            aria-label={`Theme: ${preference}. Click to change.`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="capitalize">{preference}</span>
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
