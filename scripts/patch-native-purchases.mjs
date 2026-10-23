/**
 * @capgo/native-purchases 7.19.3 always passes Product.PurchaseOption.quantity,
 * even when the caller omits it (the native default is 1).
 *
 * StoreKit throws PurchaseError.invalidQuantity for that option on an
 * auto-renewable subscription. Pro Monthly (`…pro.monthly`) therefore failed
 * in sandbox and App Review before the payment sheet could finish, while
 * consumable Support purchases still worked.
 *
 * This patch skips `.quantity` unless the loaded product is a consumable or
 * non-renewing subscription and the requested quantity is greater than 1.
 * Run automatically from postinstall and `npm run cap:sync`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'let allowsQuantity = product.type == .consumable || product.type == .nonRenewable';
const NEEDLE = 'purchaseOptions.insert(.quantity(quantity))';
const REPLACEMENT = `// Chord Trainer: .quantity on an auto-renewable subscription throws
                // PurchaseError.invalidQuantity (including quantity 1).
                ${MARKER}
                if allowsQuantity && quantity > 1 {
                    purchaseOptions.insert(.quantity(quantity))
                }`;

export function patchPurchaseSource(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('native-purchases plugin source is empty');
  }
  if (source.includes(MARKER)) {
    return { source, changed: false };
  }
  const count = source.split(NEEDLE).length - 1;
  if (count !== 1) {
    throw new Error(
      `Expected one "${NEEDLE}" in NativePurchasesPlugin.swift, found ${count}. `
      + 'The quantity patch no longer matches @capgo/native-purchases.',
    );
  }
  return {
    source: source.replace(NEEDLE, REPLACEMENT),
    changed: true,
  };
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
