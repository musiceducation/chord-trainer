import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { patchPurchaseSource } from '../../scripts/patch-native-purchases.mjs';

const ORIGINAL = `
                var purchaseOptions = Set<Product.PurchaseOption>()
                purchaseOptions.insert(.quantity(quantity))
                if let token = appAccountToken, !token.isEmpty, let uuid = UUID(uuidString: token) {
                    purchaseOptions.insert(.appAccountToken(uuid))
                }

                let result = try await product.purchase(options: purchaseOptions)
                print("purchaseProduct result \\(result)")
`;

const PLUGIN = fileURLToPath(new URL(
  '../../node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift',
  import.meta.url,
));

function assertPurchasePatch(source) {
  const guarded = source.indexOf('if allowsQuantity && quantity > 1');
  const insert = source.indexOf('purchaseOptions.insert(.quantity(quantity))');
  expect(guarded).toBeGreaterThan(-1);
  expect(insert).toBeGreaterThan(guarded);
  expect(source.split('purchaseOptions.insert(.quantity(quantity))').length - 1).toBe(1);
  expect(source).toContain('product.purchase(confirmIn: scene, options: purchaseOptions)');
  expect(source).toContain('PurchaseError.invalidQuantity');
  expect(source).not.toContain('let result = try await product.purchase(options: purchaseOptions)');
}

describe('native purchases quantity patch', () => {
  it('stops sending quantity for subscriptions, presents in the foreground scene, and stays idempotent', () => {
    const once = patchPurchaseSource(ORIGINAL);
    expect(once.changed).toBe(true);
    assertPurchasePatch(once.source);
    const twice = patchPurchaseSource(once.source);
    expect(twice.changed).toBe(false);
    expect(twice.source).toBe(once.source);
  });

  it('patches the installed Capgo 7.19.3 purchase function', () => {
    const installed = readFileSync(PLUGIN, 'utf8');
    const patched = patchPurchaseSource(installed);
    assertPurchasePatch(patched.source);
    expect(patchPurchaseSource(patched.source).changed).toBe(false);
  });

  it('refuses to silently skip when the plugin source no longer matches', () => {
    expect(() => patchPurchaseSource('func purchaseProduct() {}')).toThrow(/no longer matches/);
  });
});
