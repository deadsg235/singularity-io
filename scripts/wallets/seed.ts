import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore -- prisma runtime client is only available in deployed environments
import prisma from '../../src/prisma.js';
// @ts-ignore -- logger entrypoint is compiled to JS at runtime
import { logger } from '../../src/logger.js';

const log = logger.child('walletSeed');

type SeedWalletInput = {
  publicKey: string;
  encryptedPrivateKey: string;
  label?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
};

function usage(): never {
  console.error('Usage: tsx scripts/wallets/seed.ts <wallets.json>');
  process.exit(1);
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) usage();

  const resolvedPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Input file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let entries: SeedWalletInput[];
  try {
    entries = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    process.exit(1);
  }

  if (!Array.isArray(entries) || !entries.length) {
    console.error('Input file must be a JSON array with at least one entry.');
    process.exit(1);
  }

  let inserted = 0;
  for (const entry of entries) {
    const publicKey = entry.publicKey?.trim();
    const encrypted = entry.encryptedPrivateKey?.trim();
    if (!publicKey || !encrypted) {
      log.warn('Skipping entry missing publicKey or encryptedPrivateKey');
      continue;
    }
    try {
      await prisma.managed_wallets.upsert({
        where: { public_key: publicKey },
        update: {
          encrypted_private_key: encrypted,
          label: entry.label ?? null,
          memo: entry.memo ?? null,
          metadata: entry.metadata ?? {},
          status: 'available',
          assigned_supabase_user_id: null,
          assigned_provider: null,
          assigned_subject: null,
          assigned_email: null,
          assigned_at: null,
        },
        create: {
          public_key: publicKey,
          encrypted_private_key: encrypted,
          label: entry.label ?? null,
          memo: entry.memo ?? null,
          metadata: entry.metadata ?? {},
          status: 'available',
        },
      });
      inserted += 1;
    } catch (error: any) {
      log.error('Failed to upsert wallet', { publicKey, error: error?.message || error });
    }
  }

  log.info('Wallet seeding completed', { inserted, total: entries.length });
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  prisma.$disconnect().finally(() => process.exit(1));
});
