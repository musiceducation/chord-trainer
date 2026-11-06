#!/bin/bash
# Writes the banner unit into the built app and refuses a Release archive
# that is missing production AdMob IDs or still using Google's test publisher.
set -euo pipefail

APP_ID="${GAD_APPLICATION_ID:-}"
BANNER_ID="${ADMOB_BANNER_AD_UNIT_ID:-}"

if [ "${CONFIGURATION:-}" = "Release" ]; then
  if [ -z "${APP_ID}" ] || [ -z "${BANNER_ID}" ]; then
    echo "error: Release AdMob IDs are missing. Copy ios/App/Secrets.xcconfig.example to ios/App/Secrets.xcconfig and set GAD_APPLICATION_ID and ADMOB_BANNER_AD_UNIT_ID. Do not commit that file." >&2
    exit 1
  fi
  case "${APP_ID}${BANNER_ID}" in
    *3940256099942544*)
      echo "error: Release is using a Google test AdMob ID. Put production IDs in ios/App/Secrets.xcconfig only." >&2
      exit 1
      ;;
  esac
fi

DEST="${TARGET_BUILD_DIR}/${CONTENTS_FOLDER_PATH}/public"
mkdir -p "${DEST}"
python3 - "${DEST}/admob-config.json" "${BANNER_ID}" "${CONFIGURATION:-}" << 'PY'
import json
import sys
path, banner, configuration = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, "w", encoding="utf-8") as handle:
    json.dump({
        "bannerAdUnitId": banner,
        "debug": configuration == "Debug",
    }, handle)
    handle.write("\n")
PY
