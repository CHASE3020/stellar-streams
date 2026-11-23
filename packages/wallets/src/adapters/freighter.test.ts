import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreighterAdapter } from './freighter';
import { runAdapterConformanceSuite } from './conformance.test';

vi.mock('@stellar/freighter-api', () => {
  const isConnected = vi.fn();
  const getAddress = vi.fn();
  const requestAccess = vi.fn();
  const signTransaction = vi.fn();
  const signAuthEntry = vi.fn();
  const api = { isConnected, getAddress, requestAccess, signTransaction, signAuthEntry };
  return { ...api, default: api };
});

import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
  signAuthEntry,
} from '@stellar/freighter-api';

runAdapterConformanceSuite(() => {
  const adapter = new FreighterAdapter();
  return {
    name: 'FreighterAdapter',
    adapter,
    setupAvailable: () => {
      vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    },
    setupUnavailable: () => {
      vi.mocked(isConnected).mockResolvedValue({ isConnected: false });
    },
    setupConnectSuccess: () => {
      vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(requestAccess).mockResolvedValue({ address: 'GB_FREIGHTER' });
      vi.mocked(getAddress).mockResolvedValue({ address: 'GB_FREIGHTER' });
    },
    setupConnectRejection: () => {
      vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(requestAccess).mockRejectedValue(new Error('Denied'));
      vi.mocked(getAddress).mockRejectedValue(new Error('Denied'));
    },
    setupSignSuccess: () => {
      vi.mocked(signTransaction).mockResolvedValue({
        signedTxXdr: 'signed-xdr',
        signerAddress: 'GB_FREIGHTER',
      });
    },
    setupSignRejection: () => {
      vi.mocked(signTransaction).mockRejectedValue(new Error('Signing failed'));
    },
    supportsDisconnect: false,
  };
});

describe('FreighterAdapter Specifics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has id freighter and name Freighter', () => {
    const adapter = new FreighterAdapter();
    expect(adapter.id).toBe('freighter');
    expect(adapter.name).toBe('Freighter');
  });

  it('signAuthEntry delegates to freighter API', async () => {
    vi.mocked(signAuthEntry).mockResolvedValue({
      signedAuthEntry: 'signed-entry-xdr',
      signerAddress: 'GB_FREIGHTER',
    });
    const adapter = new FreighterAdapter();
    const signed = await adapter.signAuthEntry('entry-xdr', { network: 'MAINNET' });
    expect(signed).toBe('signed-entry-xdr');
    expect(signAuthEntry).toHaveBeenCalledWith('entry-xdr', {
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      address: '',
    });
  });
});
