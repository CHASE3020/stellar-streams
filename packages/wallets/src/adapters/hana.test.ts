import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HanaAdapter } from './hana';
import { runAdapterConformanceSuite } from './conformance.test';

const originalWindow = globalThis.window;

runAdapterConformanceSuite(() => {
  const adapter = new HanaAdapter();
  return {
    name: 'HanaAdapter',
    adapter,
    setupAvailable: () => {
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
        send: vi.fn().mockResolvedValue({ publicKey: 'GB_HANA' }),
      };
    },
    setupUnavailable: () => {
      delete (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet;
    },
    setupConnectSuccess: () => {
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
        send: vi.fn().mockResolvedValue({ publicKey: 'GB_HANA' }),
      };
    },
    setupConnectRejection: () => {
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
        send: vi.fn().mockRejectedValue(new Error('User rejected')),
      };
    },
    setupSignSuccess: () => {
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
        send: vi.fn().mockResolvedValue({ signedTransaction: 'signed-hana-xdr' }),
      };
    },
    setupSignRejection: () => {
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
        send: vi.fn().mockRejectedValue(new Error('Signing rejected')),
      };
    },
    supportsDisconnect: false,
  };
});

describe('HanaAdapter Specifics', () => {
  const adapter = new HanaAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { window?: unknown }).window = {};
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('has id hana and name Hana', () => {
    expect(adapter.id).toBe('hana');
    expect(adapter.name).toBe('Hana');
  });

  it('connect handles string publicKey result', async () => {
    (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
      send: vi.fn().mockResolvedValue('GB_HANA_STRING'),
    };
    const key = await adapter.connect();
    expect(key).toBe('GB_HANA_STRING');
  });

  it('signTransaction delegates to hana send', async () => {
    (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
      send: vi.fn().mockResolvedValue({ signedTransaction: 'signed-hana-xdr' }),
    };
    const signed = await adapter.signTransaction('xdr', { network: 'MAINNET' });
    expect(signed).toBe('signed-hana-xdr');
    expect(
      (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet!.send,
    ).toHaveBeenCalledWith('stellar:signTransaction', {
      xdr: 'xdr',
      network: 'mainnet',
    });
  });

  it('signTransaction returns string directly when hana returns a string', async () => {
    (globalThis.window as Window & { hanaWallet?: unknown }).hanaWallet = {
      send: vi.fn().mockResolvedValue('signed-hana-string'),
    };
    const signed = await adapter.signTransaction('xdr');
    expect(signed).toBe('signed-hana-string');
  });
});
