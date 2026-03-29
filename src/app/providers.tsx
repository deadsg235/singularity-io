"use client";

import type { PropsWithChildren } from "react";
import { AuthProvider } from "./auth-context";
import { EventProvider } from "./contexts/EventContext";
import { TranscriptProvider } from "./contexts/TranscriptContext";

export function Providers({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <EventProvider>
        <TranscriptProvider>
          {children}
        </TranscriptProvider>
      </EventProvider>
    </AuthProvider>
  );
}

export default Providers;
