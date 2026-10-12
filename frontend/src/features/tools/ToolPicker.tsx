import { Link } from 'react-router-dom';
import { useTools } from './useTools';

export function ToolPicker(): JSX.Element {
  const tools = useTools();

  if (tools.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface-raised p-4 text-sm text-text-secondary">
        No tools are enabled. Ask your administrator to enable at least one in{' '}
        <code className="font-mono text-xs">config/app.php</code>.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <li key={tool.id}>
            <Link
              to={tool.route}
              className="group flex h-full flex-col gap-3 rounded-card border border-border bg-surface-raised p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium leading-5 text-text-primary">{tool.label}</span>
              <span className="text-xs leading-5 text-text-secondary">{tool.description}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}