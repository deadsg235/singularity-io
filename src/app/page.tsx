'use client';

import { Suspense } from 'react';
import App from './App';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
