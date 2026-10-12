import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Props = { children: ReactNode };

/**
 * Fade + slide on every route change, including the very first load.
 *
 * Why the state flip instead of just putting `animate-page-in` on the div
 * directly: on the initial mount, the element is often in the DOM before
 * Vite has injected the CSS that defines the keyframes, so the animation
 * starts and finishes before the browser paints. Deferring the class by one
 * requestAnimationFrame guarantees the stylesheet is applied when the
 * animation triggers — the first-load fade is then visible, not theoretical.
 *
 * `key={location.pathname}` forces a fresh mount per route so the animation
 * replays even when the component instance would otherwise be reused.
 */
export function PageTransition({ children }: Props): JSX.Element {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={visible ? 'animate-page-in' : 'opacity-0'}
    >
      {children}
    </div>
  );
}
