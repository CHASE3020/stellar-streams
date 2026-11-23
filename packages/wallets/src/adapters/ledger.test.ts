// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Account, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import {
  DEFAULT_LEDGER_DERIVATION_PATH,
  LedgerAdapter,
  LedgerConfigurationError,
  type LedgerAdapterOptions,
  type LedgerAppConstructor,
  type LedgerStellarApp,
  type LedgerTransport,
} from './ledger';
import { PUBLIC_NETWORK_PASSPHRASE, TESTNET_PASSPHRASE } from './adapter';
import { runAdapterConformanceSuite } from './conformance.test';

vi.mock('@ledgerhq/hw-transport-webhid', () => {
  const create = vi.fn(async () => ({ close: vi.fn(async () => {}) }));
  return { default: { create } };
});

vi.mock('@ledgerhq/hw-app-str', () => {
  return {
    default: class MockStellarApp {
      async getPublicKey() {
        return { rawPublicKey: new Uint8Array(32).fill(1) };
      }
      async signTransaction() {
        return { signature: new Uint8Array(64).fill(2) };
      }
    },
  };
});

import TransportWebHID from '@ledgerhq/hw-transport-webhid';

type Bytes = Parameters<typeof Keypair.fromRawEd25519Seed>[0];

function testKeypair(seedByte = 1): Keypair {
  return Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(seedByte) as Bytes);
}

async function sha256(bytes: Uint8Array): Promise<Bytes> {
  const input = Uint8Array.from(bytes).buffer as ArrayBuffer;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input)) as Bytes;
}

function buildTransactionXdr(passphrase = TESTNET_PASSPHRASE): string {
  return new TransactionBuilder(new Account(testKeypair(7).publicKey(), '1'), {
    fee: '100',
    networkPassphrase: passphrase,
  })
    .addOperation(Operation.manageData({ name: 'stream', value: '42' }))
    .setTimeout(30)
    .build()
    .toXDR();
}

function setWebHidSupport(supported: boolean): void {
  const nav = globalThis.navigator as (Navigator & { hid?: unknown }) | undefined;
  if (!nav) return;
  if (supported) {
    Object.defineProperty(nav, 'hid', { value: {}, configurable: true });
  } else {
    delete nav.hid;
  }
}

runAdapterConformanceSuite(() => {
  setWebHidSupport(true);
  const keypair = testKeypair(1);
  const app = {
    getPublicKey: vi.fn(async () => ({ rawPublicKey: keypair.rawPublicKey() })),
    signTransaction: vi.fn(async (_path: string, base: Uint8Array) => ({
      signature: keypair.sign(await sha256(base)),
    })),
  };
  const transport = { close: vi.fn(async () => {}) };
  const createTransport = vi.fn(async () => transport);
  const loadStellarApp = vi.fn(async () => function MockStellarApp() { return app; } as unknown as LedgerAppConstructor);

  const adapter = new LedgerAdapter({
    createTransport,
    loadStellarApp,
  });

  return {
    name: 'LedgerAdapter',
    adapter,
    setupAvailable: () => setWebHidSupport(true),
    setupUnavailable: () => setWebHidSupport(false),
    setupConnectSuccess: () => {},
    setupSignSuccess: () => {},
    setupSignRejection: () => {
      app.signTransaction.mockRejectedValueOnce(new Error('Device error'));
    },
    setupNetworkMismatch: () => {
      const mismatchAdapter = new LedgerAdapter({
        createTransport,
        loadStellarApp,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      expect(mismatchAdapter.signTransaction(buildTransactionXdr(), { network: 'MAINNET' })).rejects.toThrow(LedgerConfigurationError);
    },
    supportsDisconnect: true,
  };
});

describe('LedgerAdapter Specifics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setWebHidSupport(false);
  });

  it('has id ledger and name Ledger', () => {
    const adapter = new LedgerAdapter();
    expect(adapter.id).toBe('ledger');
    expect(adapter.name).toBe('Ledger');
  });
});
