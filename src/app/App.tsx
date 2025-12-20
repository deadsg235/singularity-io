"use client";

import { DexterAppLayout } from "./components/DexterAppLayout";
import { useDexterAppController } from "./hooks/useDexterAppController";

export type { DexterSessionSummary } from "./hooks/useDexterAppController";

function App() {
  const controller = useDexterAppController();
  return <DexterAppLayout {...controller} />;
}

export default App;
