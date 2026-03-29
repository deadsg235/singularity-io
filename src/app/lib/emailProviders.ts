export type EmailProviderKey = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'proton';

export type EmailProviderInfo = {
  key: EmailProviderKey;
  label: string;
  inboxUrl: string;
};

const providerMeta: Record<EmailProviderKey, EmailProviderInfo> = {
  gmail: { key: 'gmail', label: 'Gmail', inboxUrl: 'https://gmail.com' },
  outlook: { key: 'outlook', label: 'Outlook', inboxUrl: 'https://outlook.live.com/mail' },
  yahoo: { key: 'yahoo', label: 'Yahoo Mail', inboxUrl: 'https://mail.yahoo.com' },
  icloud: { key: 'icloud', label: 'iCloud Mail', inboxUrl: 'https://www.icloud.com/mail' },
  proton: { key: 'proton', label: 'Proton Mail', inboxUrl: 'https://mail.proton.me' },
};

const domainToProvider: Record<string, EmailProviderKey> = {
  'gmail.com': 'gmail',
  'googlemail.com': 'gmail',
  'outlook.com': 'outlook',
  'hotmail.com': 'outlook',
  'live.com': 'outlook',
  'msn.com': 'outlook',
  'yahoo.com': 'yahoo',
  'yahoo.co.uk': 'yahoo',
  'yahoo.fr': 'yahoo',
  'icloud.com': 'icloud',
  'me.com': 'icloud',
  'mac.com': 'icloud',
  'protonmail.com': 'proton',
  'proton.me': 'proton',
  'pm.me': 'proton',
};

export function resolveEmailProvider(email: string | null | undefined): EmailProviderInfo | null {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  const key = domainToProvider[domain];
  if (!key) return null;
  return providerMeta[key];
}