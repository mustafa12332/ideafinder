import { render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import AppProviders from '../app/providers/AppProviders';

function Wrapper({ children }: PropsWithChildren) {
  return <AppProviders>{children}</AppProviders>;
}

export function renderWithProviders(ui: ReactElement, options?: Parameters<typeof render>[1]) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';


