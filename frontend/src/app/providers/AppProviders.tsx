import { PropsWithChildren, StrictMode } from 'react';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <StrictMode>
      {children}
    </StrictMode>
  );
}

export default AppProviders;


