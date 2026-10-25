/**
 * @capgo/native-purchases 7.19.3 always passes Product.PurchaseOption.quantity,
 * even when the caller omits it (the native default is 1).
 *
 * StoreKit throws PurchaseError.invalidQuantity for that option on an
 * auto-renewable subscription, including quantity 1. Pro Monthly
 * (`…pro.monthly`, 1-week free intro then $6.99) therefore failed in sandbox
 * and App Review before the payment sheet could finish. The introductory
 * offer never appeared because purchase() threw first. Consumable Support
 * purchases still worked.
 *
 * This patch:
 * 1. Skips `.quantity` unless the product is a consumable or non-renewing
 *    subscription and the requested quantity is greater than 1.
 * 2. Presents the sheet with purchase(confirmIn:options:) on the foreground
 *    UIWindowScene. purchase(options:) alone can fail to present on newer
 *    iOS (review device: iPhone 17 Pro Max, iOS 27) when the call arrives
 *    from the Capacitor bridge.
 *
 * Run from postinstall, `npm run cap:sync`, and Xcode Cloud's ci_post_clone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUANTITY_MARKER = 'let allowsQuantity = product.type == .consumable || product.type == .nonRenewable';
const QUANTITY_NEEDLE = 'purchaseOptions.insert(.quantity(quantity))';
const QUANTITY_REPLACEMENT = `// Chord Trainer: .quantity on an auto-renewable subscription throws
                // PurchaseError.invalidQuantity (including quantity 1).
                ${QUANTITY_MARKER}
                if allowsQuantity && quantity > 1 {
                    purchaseOptions.insert(.quantity(quantity))
                }`;

const SCENE_MARKER = 'Chord Trainer: present the payment sheet in the foreground scene';
const SCENE_NEEDLE = 'let result = try await product.purchase(options: purchaseOptions)';
const SCENE_REPLACEMENT = `// ${SCENE_MARKER}
                let purchaseScene = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .first { $0.activationState == .foregroundActive }
                    ?? UIApplication.shared.connectedScenes
                        .compactMap { $0 as? UIWindowScene }
                        .first
                let result: Product.PurchaseResult
                if let scene = purchaseScene {
                    result = try await product.purchase(confirmIn: scene, options: purchaseOptions)
                } else {
                    result = try await product.purchase(options: purchaseOptions)
                }`;

export function patchPurchaseSource(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('native-purchases plugin source is empty');
  }
  let next = source;
  let changed = false;

  if (!next.includes(QUANTITY_MARKER)) {
    const count = next.split(QUANTITY_NEEDLE).length - 1;
    if (count !== 1) {
      throw new Error(
        `Expected one "${QUANTITY_NEEDLE}" in NativePurchasesPlugin.swift, found ${count}. `
        + 'The quantity patch no longer matches @capgo/native-purchases.',
      );
    }
    next = next.replace(QUANTITY_NEEDLE, QUANTITY_REPLACEMENT);
    changed = true;
  }

  if (!next.includes(SCENE_MARKER)) {
    const count = next.split(SCENE_NEEDLE).length - 1;
    if (count !== 1) {
      throw new Error(
        `Expected one "${SCENE_NEEDLE}" in NativePurchasesPlugin.swift, found ${count}. `
        + 'The purchase-scene patch no longer matches @capgo/native-purchases.',
      );
    }
    next = next.replace(SCENE_NEEDLE, SCENE_REPLACEMENT);
    changed = true;
  }

  return { source: next, changed };
}

function pluginSwiftPath(root) {
  return path.join(
    root,
    'node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift',
  );
}

export function patchNativePurchases(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const filePath = pluginSwiftPath(root);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: 'missing', filePath };
  }
  const current = fs.readFileSync(filePath, 'utf8');
  const next = patchPurchaseSource(current);
  if (next.changed) fs.writeFileSync(filePath, next.source);
  return { ok: true, changed: next.changed, filePath };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  const result = patchNativePurchases();
  if (!result.ok && result.reason === 'missing') {
    console.log('patch-native-purchases: plugin not installed yet, skipping');
    process.exit(0);
  }
  console.log(
    result.changed
      ? `patch-native-purchases: updated ${result.filePath}`
      : 'patch-native-purchases: already patched',
  );
}
