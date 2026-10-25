import { describe, it, expect, vi } from 'vitest';
import { openExternalUrl } from '../lib/openExternalUrl.js';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../lib/legal.js';

describe('openExternalUrl', () => {
  it('opens iOS legal URLs in the in-app browser', async () => {
    const openBrowser = vi.fn().mockResolvedValue(undefined);
    expect(await openExternalUrl(PRIVACY_POLICY_URL, {
      isNative: () => true,
      openBrowser,
    })).toBe('browser');
    expect(openBrowser).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it('falls back to a main-frame navigation when SFSafariViewController fails', async () => {
    const assignLocation = vi.fn();
    expect(await openExternalUrl(TERMS_OF_USE_URL, {
      isNative: () => true,
      openBrowser: async () => { throw new Error('plugin missing'); },
      assignLocation,
    })).toBe('assign');
    expect(assignLocation).toHaveBeenCalledWith(TERMS_OF_USE_URL);
  });

  it('opens a normal browser tab on the web', async () => {
    const openWindow = vi.fn();
    expect(await openExternalUrl(PRIVACY_POLICY_URL, {
      isNative: () => false,
      openWindow,
    })).toBe('window');
    expect(openWindow).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });
});
