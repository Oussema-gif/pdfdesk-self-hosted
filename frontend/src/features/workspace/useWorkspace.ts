import { useContext } from 'react';
import { WorkspaceContext, type WorkspaceContextValue } from './context';

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (value === null) {
    throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  }
  return value;
}