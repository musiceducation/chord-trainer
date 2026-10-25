#!/usr/bin/env bash
# Xcode Cloud: Capacitor web build + CocoaPods before Archive.
# This file must live next to App.xcworkspace and be executable.
set -euo pipefail
set -x

cd "${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi
if ! command -v node >/dev/null 2>&1; then
  brew install node@20
  brew link node@20 --force --overwrite
fi

npm config set maxsockets 3
npm ci
# postinstall patches StoreKit quantity, but keep this explicit so a
# script-skipped install cannot archive the broken purchase path.
node scripts/patch-native-purchases.mjs
npm run build
npx cap sync ios
