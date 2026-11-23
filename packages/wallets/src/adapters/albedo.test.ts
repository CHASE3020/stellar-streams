import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@albedo-link/intent', () => ({
  default: {
    publicKey: vi.fn(),
    tx: vi.fn(),
  },
}));

import albedo from '@albedo-link/intent';
import { AlbedoAdapter } from './albedo';
import type { WalletAdapter } from './adapter';
import { runAdapterConformanceSuite } from './conformance.test';

runAdapterConformanceSuite(() => {
  const adapter = new AlbedoAdapter();
  return {
    name: 'AlbedoAdapter',
    adapter,
    setupAvailable: () => {
      vi.mocked(albedo.publicKey).mockResolvedValue({
        pubkey: 'GB_ALBEDO',
        signature: '',
        signed_message: '',
      } as unknown as Awaited<ReturnType<typeof albedo.publicKey>>);
    },
    setupUnavailable: () => {
      vi.mocked(albedo.publicKey).mockRejectedValue(new Error('Unavailable'));
    },
    setupConnectSuccess: () => {
      vi.mocked(albedo.publicKey).mockResolvedValue({
        pubkey: 'GB_ALBEDO',
        signature: '',
        signed_message: '',
      } as unknown as Awaited<ReturnType<typeof albedo.publicKey>>);
    },
    setupConnectRejection: () => {
      vi.mocked(albedo.publicKey).mockResolvedValue({
        pubkey: '',
        signature: '',
        signed_message: '',
      } as unknown as Awaited<ReturnType<typeof albedo.publicKey>>);
    },
    setupSignSuccess: () => {
      vi.mocked(albedo.tx).mockResolvedValue({
        signed_envelope_xdr: 'signed-albedo-xdr',
        tx_hash: 'hash',
        xdr: 'xdr',
        network: 'testnet',
        result: 'ok',
      } as unknown as Awaited<ReturnType<typeof albedo.tx>>);
    },
    setupSignRejection: () => {
      vi.mocked(albedo.tx).mockRejectedValue(new Error('Rejected'));
    },
    supportsDisconnect: false,
  };
});

describe('AlbedoAdapter Specifics', () => {
  const adapter = new AlbedoAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has id albedo and name Albedo', () => {
    expect(adapter.id).toBe('albedo');
    expect(adapter.name).toBe('Albedo');
  });

  it('does not expose auth-entry signing', () => {
    expect((adapter as WalletAdapter).signAuthEntry).toBeUndefined();
  });
});
