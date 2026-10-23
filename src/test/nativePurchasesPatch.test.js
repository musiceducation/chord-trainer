import { describe, it, expect } from 'vitest';
import { patchPurchaseSource } from '../../scripts/patch-native-purchases.mjs';

const ORIGINAL = `
                var purchaseOptions = Set<Product.PurchaseOption>()
                purchaseOptions.insert(.quantity(quantity))
                if let token = appAccountToken, !token.isEmpty, let uuid = UUID(uuidString: token) {
`;

describe('native purchases quantity patch', () => {
  it('stops sending quantity for subscriptions and stays idempotent', () => {
    const once = patchPurchaseSource(ORIGINAL);
    expect(once.changed).toBe(true);
    expect(once.source).toContain('allowsQuantity');
    expect(once.source).toContain('if allowsQuantity && quantity > 1');
    expect(once.source.match(/purchaseOptions\.insert\(\.quantity\(quantity\)\)/g)).toHaveLength(1);
    const twice = patchPurchaseSource(once.source);
    expect(twice.changed).toBe(false);
    expect(twice.source).toBe(once.source);
  });

  it('refuses to silently skip when the plugin source no longer matches', () => {
    expect(() => patchPurchaseSource('func purchaseProduct() {}')).toThrow(/no longer matches/);
  });
});
