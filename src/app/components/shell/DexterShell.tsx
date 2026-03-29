import React from "react";
import { motion } from "framer-motion";

interface DexterShellProps {
  topBar: React.ReactNode;
  hero: React.ReactNode;
  heroControls?: React.ReactNode;
  heroWrapperClassName?: string;
  heroCollapsed?: boolean;
  messages: React.ReactNode;
  inputBar: React.ReactNode;
  signals?: React.ReactNode | null;
  statusBar: React.ReactNode;
  mobileOverlay?: React.ReactNode;
}

export function DexterShell({
  topBar,
  hero,
  heroControls,
  heroWrapperClassName,
  heroCollapsed = false,
  messages,
  inputBar,
  signals,
  statusBar,
  mobileOverlay,
}: DexterShellProps) {
  const heroPadding = heroCollapsed ? "pt-2" : "pt-6 sm:pt-8";

  const [chromeReady, setChromeReady] = React.useState(false);
  const [heroReady, setHeroReady] = React.useState(false);
  const [composerReady, setComposerReady] = React.useState(false);
  const [backdropReady, setBackdropReady] = React.useState(false);

  React.useEffect(() => {
    const headerTimer = window.setTimeout(() => setChromeReady(true), 1000);
    const heroTimer = window.setTimeout(() => setHeroReady(true), 1500);
    const composerTimer = window.setTimeout(() => setComposerReady(true), 2600);
    const backdropTimer = window.setTimeout(() => setBackdropReady(true), 650);
    return () => {
      window.clearTimeout(headerTimer);
      window.clearTimeout(heroTimer);
      window.clearTimeout(composerTimer);
      window.clearTimeout(backdropTimer);
    };
  }, []);

  const heroSectionClasses = [
    heroWrapperClassName,
    "flex flex-col lg:flex-row lg:items-start lg:justify-between",
    heroCollapsed ? "gap-1 lg:gap-4" : "gap-6",
    heroPadding,
  ]
    .filter(Boolean)
    .join(" ");

  const heroContentClasses = [
    "flex-1 overflow-hidden transition-all duration-500 ease-out",
    heroCollapsed ? "pointer-events-none max-h-0 opacity-0 -translate-y-2" : "max-h-[360px] opacity-100 translate-y-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dexter-shell relative flex h-[100dvh] flex-col overflow-hidden text-foreground">
      <motion.header
        className="dexter-header relative z-30 flex-shrink-0 overflow-visible backdrop-blur-xl"
        initial={{ opacity: 0, y: -110 }}
        animate={chromeReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -110 }}
        transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-60px] -top-48 h-[calc(100%+192px)] -z-10 rounded-b-[36px]"
          style={{
            background:
              'linear-gradient(125deg, rgba(255, 146, 63, 0.96) 0%, rgba(255, 101, 0, 0.94) 62%, rgba(255, 173, 120, 0.42) 100%)',
            boxShadow: '0 14px 28px rgba(26, 12, 6, 0.26)',
          }}
        />
        {topBar}
      </motion.header>

      <main className="z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex w-full flex-1 flex-col overflow-hidden">
            <div className="relative">
              <motion.div
                className="pointer-events-none absolute -inset-20 sm:-inset-24 lg:-inset-28"
                initial={{ opacity: 0, scale: 0.92, x: '-16%', y: '-18%' }}
                animate={backdropReady && !heroCollapsed
                  ? {
                      opacity: [0.55, 0.82],
                      scale: [0.99, 1.18],
                      x: ['-10%', '-22%'],
                      y: ['-10%', '-21%'],
                    }
                  : {
                      opacity: 0,
                      scale: 0.94,
                      x: '-12%',
                      y: '-16%',
                    }}
                transition={{
                  duration: 13.5,
                  delay: backdropReady ? 0.15 : 0,
                  repeat: backdropReady && !heroCollapsed ? Infinity : 0,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }}
                style={{
                  background:
                    'radial-gradient(140% 120% at 32% 30%, rgba(242, 118, 45, 0.75), transparent 72%)',
                  filter: backdropReady ? 'blur(42px)' : 'blur(26px)',
                  mixBlendMode: 'screen',
                }}
              />
              <motion.div
                className="pointer-events-none absolute -inset-10 sm:-inset-14 lg:-inset-16"
                initial={{ opacity: 0, scale: 0.96, x: '14%', y: '16%' }}
                animate={backdropReady && !heroCollapsed
                  ? {
                      opacity: [0.5, 0.72],
                      scale: [1.02, 1.16],
                      x: ['8%', '22%'],
                      y: ['10%', '24%'],
                    }
                  : {
                      opacity: 0,
                      scale: 0.98,
                      x: '12%',
                      y: '18%',
                    }}
                transition={{
                  duration: 17,
                  delay: backdropReady && !heroCollapsed ? 1.4 : 0,
                  repeat: backdropReady && !heroCollapsed ? Infinity : 0,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }}
                style={{
                  background:
                    'radial-gradient(120% 110% at 68% 58%, rgba(255, 232, 196, 0.62), transparent 70%)',
                  filter: backdropReady ? 'blur(48px)' : 'blur(24px)',
                  mixBlendMode: 'screen',
                }}
              />
              <div className={heroSectionClasses}>
                {hero ? (
                  <div className={heroContentClasses} aria-hidden={heroCollapsed}>
                    <div className="relative pr-0 lg:pr-6">
                      {heroReady ? hero : null}
                    </div>
                  </div>
                ) : null}
                {heroControls ? (
                  <div className="max-w-full lg:w-80 lg:flex-shrink-0">
                    {heroControls}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {messages}
            </div>
          </div>
          {signals ? (
            <aside className="hidden w-full max-w-sm flex-col lg:flex">
              {signals}
            </aside>
          ) : null}
        </div>
      </main>

      {composerReady ? inputBar : null}

      <motion.footer
        className="relative z-10 flex-shrink-0 border-t border-footer-border/50 bg-footer/90 backdrop-blur-xl"
        initial={{ opacity: 0, y: 120 }}
        animate={chromeReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 120 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
      >
        {statusBar}
      </motion.footer>
      {mobileOverlay}
    </div>
  );
}

export default DexterShell;
