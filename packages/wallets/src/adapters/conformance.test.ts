import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletAdapter } from './adapter.js';
import { FreighterAdapter } from './freighter.js';
import { AlbedoAdapter } from './albedo.js';
import { RabetAdapter } from './rabe.js';
import { HanaAdapter } from './hana.js';
import { LedgerAdapter } from './ledger.js';

/** Behaviours every adapter must implement correctly, run against each adapter. */
function conformanceTests(create: () => WalletAdapter, setup: () => void): void {
  beforeEach(() => {
    setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connect throws when the wallet is unavailable or the user rejects', async () => {
    const adapter = create();
    await expect(adapter.connect()).rejects.toThrow();
  });

  it('disconnect resolves without throwing when present', async () => {
    const adapter = create();
    if (typeof adapter.disconnect === 'function') {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    }
  });

  it('signTransaction throws when the wallet fails to sign', async () => {
    const adapter = create();
    await expect(adapter.signTransaction('invalid-xdr')).rejects.toThrow();
  });
}

// =========================================================================
// Freighter — mocks @stellar/freighter-api
// =========================================================================
const freighterApi = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
  signAuthEntry: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => {
  const api = {
    isConnected: freighterApi.isConnected,
    getAddress: freighterApi.getAddress,
    requestAccess: freighterApi.requestAccess,
    signTransaction: freighterApi.signTransaction,
    signAuthEntry: freighterApi.signAuthEntry,
  };
  return { ...api, default: api };
});

describe('FreighterAdapter (conformance)', () => {
  beforeEach(() => {
    vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: false });
    vi.mocked(freighterApi.getAddress).mockResolvedValue({ address: '' });
    vi.mocked(freighterApi.requestAccess).mockRejectedValue(new Error('denied'));
    vi.mocked(freighterApi.signTransaction).mockRejectedValue(new Error('sign failed'));
    vi.mocked(freighterApi.signAuthEntry).mockRejectedValue(new Error('sign failed'));
  });

  conformanceTests(
    () => new FreighterAdapter(),
    () => {
      // setup runs in describe beforeEach
    },
  );

  it('isAvailable reports false when not connected', async () => {
    const adapter = new FreighterAdapter();
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('connect retrieves address via requestAccess when available', async () => {
    vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(freighterApi.requestAccess).mockResolvedValue({ address: 'GB_FREIGHTER' });
    vi.mocked(freighterApi.getAddress).mockResolvedValue({ address: 'GB_FREIGHTER' });
    const adapter = new FreighterAdapter();
    const key = await adapter.connect();
    expect(key).toBe('GB_FREIGHTER');
  });
});

// =========================================================================
// Albedo — mocks @albedo-link/intent
// =========================================================================
const albedoApi = vi.hoisted(() => ({
  publicKey: vi.fn(),
  tx: vi.fn(),
}));

vi.mock('@albedo-link/intent', () => ({
  default: { publicKey: albedoApi.publicKey, tx: albedoApi.tx },
}));

describe('AlbedoAdapter (conformance)', () => {
  beforeEach(() => {
    vi.mocked(albedoApi.publicKey).mockResolvedValue({ pubkey: '' });
    vi.mocked(albedoApi.tx).mockRejectedValue(new Error('sign failed'));
  });

  conformanceTests(
    () => new AlbedoAdapter(),
    () => {
      // setup runs in describe beforeEach
    },
  );

  it('connect returns the public key from albedo.publicKey', async () => {
    vi.mocked(albedoApi.publicKey).mockResolvedValue({ pubkey: 'GB_ALBEDO' });
    const adapter = new AlbedoAdapter();
    const key = await adapter.connect();
    expect(key).toBe('GB_ALBEDO');
  });
});

// =========================================================================
// Rabet — mocks window.rabet
// =========================================================================
const rabetApi = vi.hoisted(() => ({
  connect: vi.fn(),
  sign: vi.fn(),
  disconnect: vi.fn(),
}));

describe('RabetAdapter (conformance)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'rabet', {
      value: {
        connect: rabetApi.connect,
        sign: rabetApi.sign,
        disconnect: rabetApi.disconnect,
      },
      configurable: true,
    });
    vi.mocked(rabetApi.connect).mockResolvedValue({ publicKey: '' });
    vi.mocked(rabetApi.sign).mockRejectedValue(new Error('sign failed'));
    vi.mocked(rabetApi.disconnect).mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete (window as Window & { rabet?: unknown }).rabet;
  });

  conformanceTests(
    () => new RabetAdapter(),
    () => {
      // setup runs in describe beforeEach
    },
  );

  it('isAvailable reports false when window.rabet is absent', async () => {
    delete (window as Window & { rabet?: unknown }).rabet;
    const adapter = new RabetAdapter();
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('connect returns the public key from rabet.connect', async () => {
    vi.mocked(rabetApi.connect).mockResolvedValue({ publicKey: 'GB_RABET' });
    const adapter = new RabetAdapter();
    const key = await adapter.connect();
    expect(key).toBe('GB_RABET');
  });

  it('disconnect clears the cached key and calls rabet.disconnect', async () => {
    vi.mocked(rabetApi.connect).mockResolvedValue({ publicKey: 'GB_RABET' });
    const adapter = new RabetAdapter();
    await adapter.connect();
    await adapter.disconnect();
    expect(rabetApi.disconnect).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// Hana — mocks window.hanaWallet
// =========================================================================
const hanaApi = vi.hoisted(() => ({
  send: vi.fn(),
}));

describe('HanaAdapter (conformance)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'hanaWallet', {
      value: { send: hanaApi.send },
      configurable: true,
    });
    vi.mocked(hanaApi.send).mockRejectedValue(new Error('sign failed'));
  });

  afterEach(() => {
    delete (window as Window & { hanaWallet?: unknown }).hanaWallet;
  });

  conformanceTests(
    () => new HanaAdapter(),
    () => {
      // setup runs in describe beforeEach
    },
  );

  it('isAvailable reports false when window.hanaWallet is absent', async () => {
    delete (window as Window & { hanaWallet?: unknown }).hanaWallet;
    const adapter = new HanaAdapter();
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('connect returns the public key from hana.send', async () => {
    vi.mocked(hanaApi.send).mockResolvedValue('GB_HANA');
    const adapter = new HanaAdapter();
    const key = await adapter.connect();
    expect(key).toBe('GB_HANA');
  });

  it('signTransaction returns the signed transaction string', async () => {
    vi.mocked(hanaApi.send).mockResolvedValue('signed-xdr');
    const adapter = new HanaAdapter();
    const signed = await adapter.signTransaction('xdr');
    expect(signed).toBe('signed-xdr');
  });
});

// =========================================================================
// Ledger — mocks @ledgerhq/hw-transport-webhid and @ledgerhq/hw-app-str
// =========================================================================
const ledgerTransport = vi.hoisted(() => ({
  close: vi.fn().mockResolvedValue(undefined),
}));

const ledgerApp = vi.hoisted(() => ({
  getPublicKey: vi.fn().mockRejectedValue(new Error('device error')),
  signTransaction: vi.fn().mockResolvedValue({ signature: new Uint8Array(64) }),
}));

vi.mock('@ledgerhq/hw-transport-webhid', () => ({
  default: { create: vi.fn().mockResolvedValue(ledgerTransport) },
}));

vi.mock('@ledgerhq/hw-app-str', () => ({
  default: class {
    constructor(_t: unknown) {}
    getPublicKey = ledgerApp.getPublicKey;
    signTransaction = ledgerApp.signTransaction;
  },
}));

describe('LedgerAdapter (conformance)', () => {
  conformanceTests(
    () => new LedgerAdapter({ createTransport: async () => ledgerTransport }),
    () => {
      // setup runs in describe-level defaults
    },
  );

  it('connect returns a public key from the Ledger app', async () => {
    vi.mocked(ledgerApp.getPublicKey).mockResolvedValue({
      rawPublicKey: new Uint8Array(32),
    });
    const adapter = new LedgerAdapter({
      createTransport: async () => ledgerTransport,
    });
    const key = await adapter.connect();
    expect(key).toMatch(/^G/);
  });

  it('signTransaction rejects on network mismatch', async () => {
    const adapter = new LedgerAdapter({
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      createTransport: async () => ledgerTransport,
    });
    await expect(adapter.signTransaction('xdr', { network: 'TESTNET' })).rejects.toBeInstanceOf(
      Error,
    );
  });
});
