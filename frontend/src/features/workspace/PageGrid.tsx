import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useWorkspace } from './useWorkspace';
import { PageCard } from './PageCard';

export function PageGrid(): JSX.Element {
  const { state, move } = useWorkspace();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const from = state.pages.findIndex((p) => p.id === active.id);
    const to = state.pages.findIndex((p) => p.id === over.id);
    if (from === -1 || to === -1) return;
    move(from, to);
  };

  const ids = state.pages.map((p) => p.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-label="Page grid"
        >
          {state.pages.map((page, index) => {
            const source = state.sources.get(page.fileId);
            if (!source) return null;
            return (
              <li key={page.id}>
                <PageCard
                  page={page}
                  index={index}
                  bytes={source.bytes}
                  sourceName={source.fileName}
                />
              </li>
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}