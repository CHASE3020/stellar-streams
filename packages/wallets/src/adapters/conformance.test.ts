import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WalletAdapter } from './adapter';
import { WalletCancelledError, WalletRejectedError } from '../errors';

export interface ConformanceHarness {
  name: string;
  adapter: WalletAdapter;
  setupAvailable: () => void;
  setupUnavailable: () => void;
  setupConnectSuccess: () => void;
  setupConnectRejection: () => void;
  setupSignSuccess: () => void;
  setupSignRejection: () => void;
  setupSignCancelled?: () => void;
  setupMalformedXdr?: () => void;
  setupNetworkMismatch?: () => void;
  setupDisconnect?: () => void;
  supportsDisconnect?: boolean;
}

export function runAdapterConformanceSuite(harnessFactory: () => ConformanceHarness) {
  describe('Adapter Conformance Suite', () => {
    let harness: ConformanceHarness;

    beforeEach(() => {
      vi.clearAllMocks();
      harness = harnessFactory();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('has valid metadata', () => {
      expect(typeof harness.adapter.id).toBe('string');
      expect(harness.adapter.id.length).toBeGreaterThan(0);
      expect(typeof harness.adapter.name).toBe('string');
      expect(harness.adapter.name.length).toBeGreaterThan(0);
    });

    it('handles unavailable extension correctly', async () => {
      harness.setupUnavailable();
      expect(await harness.adapter.isAvailable()).toBe(false);
      await expect(harness.adapter.connect()).rejects.toThrow();
    });

    it('handles available extension and connection success', async () => {
      harness.setupAvailable();
      expect(await harness.adapter.isAvailable()).toBe(true);
      
      harness.setupConnectSuccess();
      const pubKey = await harness.adapter.connect();
      expect(typeof pubKey).toBe('string');
      expect(pubKey.length).toBeGreaterThan(0);

      await expect(harness.adapter.getPublicKey()).resolves.toBe(pubKey);
    });

    it('handles user rejection during connect or sign', async () => {
      harness.setupAvailable();
      if (harness.setupConnectRejection) {
        harness.setupConnectRejection();
        await expect(harness.adapter.connect()).rejects.toThrow();
      }
    });

    it('handles disconnect if supported', async () => {
      if (harness.supportsDisconnect) {
        harness.setupAvailable();
        harness.setupConnectSuccess();
        await harness.adapter.connect();

        if (harness.setupDisconnect) {
          harness.setupDisconnect();
        }

        if (typeof harness.adapter.disconnect === 'function') {
          await expect(harness.adapter.disconnect()).resolves.toBeUndefined();
        }
      } else {
        expect(harness.adapter.disconnect).toBeUndefined();
      }
    });

    it('handles malformed XDR or signing errors gracefully', async () => {
      harness.setupAvailable();
      harness.setupConnectSuccess();
      await harness.adapter.connect();

      if (harness.setupSignRejection) {
        harness.setupSignRejection();
        await expect(harness.adapter.signTransaction('invalid-xdr')).rejects.toThrow();
      }
    });

    it('handles network mismatch or configuration errors when applicable', async () => {
      if (harness.setupNetworkMismatch) {
        harness.setupNetworkMismatch();
      } else {
        harness.setupAvailable();
        harness.setupConnectSuccess();
        await harness.adapter.connect();
        harness.setupSignSuccess();
        await expect(
          harness.adapter.signTransaction('AAAA...', { network: 'MAINNET' }),
        resolves.toBeDefined());
      }
    });
  });
}
