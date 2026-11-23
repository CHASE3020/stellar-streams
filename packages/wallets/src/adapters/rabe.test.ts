import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RabetAdapter } from './rabe';
import { WalletCancelledError, WalletRejectedError } from '../errors';
import { runAdapterConformanceSuite } from './conformance.test';

const originalWindow = globalThis.window;

runAdapterConformanceSuite(() => {
  const adapter = new RabetAdapter();
  return {
    name: 'RabetAdapter',
    adapter,
    setupAvailable: () => {
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: 'GB_RABET' }),
        sign: vi.fn().mockResolvedValue('signed-rabet-xdr'),
        disconnect: vi.fn().mockResolvedValue(undefined),
      };
    },
    setupUnavailable: () => {
      delete (globalThis.window as Window & { rabet?: unknown }).rabet;
    },
    setupConnectSuccess: () => {
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: 'GB_RABET' }),
        sign: vi.fn().mockResolvedValue('signed-rabet-xdr'),
        disconnect: vi.fn().mockResolvedValue(undefined),
      };
    },
    setupConnectRejection: () => {
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockRejectedValue(new Error('Rejected')),
        sign: vi.fn(),
      };
    },
    setupSignSuccess: () => {
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: 'GB_RABET' }),
        sign: vi.fn().mockResolvedValue('signed-rabet-xdr'),
      };
    },
    setupSignRejection: () => {
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: 'GB_RABET' }),
        sign: vi.fn().mockRejectedValue({ error: 'User rejected the request.' }),
      };
    },
    setupDisconnect: () => {
      const disconnect = vi.fn().mockResolvedValue(undefined);
      (globalThis.window as Window & { rabet?: unknown }).rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: 'GB_RABET' }),
        sign: vi.fn(),
        disconnect,
      };
    },
    supportsDisconnect: true,
  };
});

describe('RabetAdapter Specifics', () => {
  const adapter = new RabetAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { window?: unknown }).window = {};
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('has id rabe and name Rabet', () => {
    expect(adapter.id).toBe('rabe');
    expect(adapter.name).toBe('Rabet');
  });

  it('maps a rejected signing request to a typed rejection error', async () => {
    (globalThis.window as Window & { rabet?: unknown }).rabet = {
      connect: vi.fn(),
      sign: vi.fn().mockRejectedValue({ error: 'User rejected the request.' }),
    };

    const error = await adapter.signTransaction('xdr').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(WalletRejectedError);
    expect(error).toMatchObject({
      name: 'WalletRejectedError',
      code: 'WALLET_REJECTED',
      message: 'User rejected the request.',
    });
  });

  it('maps a cancelled signing request to a typed cancellation error', async () => {
    (globalThis.window as Window & { rabet?: unknown }).rabet = {
      connect: vi.fn(),
      sign: vi.fn().mockRejectedValue(new Error('Request cancelled by the user.')),
    };

    const error = await adapter.signTransaction('xdr').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(WalletCancelledError);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(WalletRejectedError);
    expect(error).toMatchObject({
      name: 'WalletCancelledError',
      code: 'WALLET_CANCELLED',
      message: 'Request cancelled by the user.',
    });
  });
});
