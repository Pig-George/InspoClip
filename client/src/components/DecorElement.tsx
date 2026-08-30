import { WorkspaceCardDecoration } from '@inspoclip/workspace-ui';
import type { DecorationType } from '@/types';

interface DecorElementProps {
  type: DecorationType;
}

export function DecorElement({ type }: DecorElementProps) {
  return <WorkspaceCardDecoration type={type} />;
}
