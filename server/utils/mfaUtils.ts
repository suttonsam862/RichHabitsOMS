import * as speakeasy from 'speakeasy';

export interface MfaSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export function generateMfaSecret(userEmail: string, issuer: string = 'ThreadCraft'): MfaSetupResult {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${userEmail})`,
    issuer: issuer,
    length: 32
  });

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url || '',
    backupCodes
  };
}

export function verifyMfaToken(secret: string, token: string, window: number = 2): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: window
  });
}

export function generateBackupCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}