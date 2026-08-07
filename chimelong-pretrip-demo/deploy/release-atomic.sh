#!/usr/bin/env bash
set -euo pipefail

# Run on the deployment server after uploading
# /tmp/chimelong-release-<release-id>.tar.gz.
release_id="${1:?release id is required}"
current="/var/www/chimelong-pretrip-demo"
stage="/var/www/chimelong-pretrip-demo.release-${release_id}"
backup="/var/www/chimelong-pretrip-demo.backup-${release_id}"
archive="/tmp/chimelong-release-${release_id}.tar.gz"
stage_app="chimelong-pretrip-stage-${release_id}"

test -d "$current"
test -f "$archive"
test ! -e "$stage"
test ! -e "$backup"

cleanup_stage_app() {
  pm2 delete "$stage_app" >/dev/null 2>&1 || true
}
trap cleanup_stage_app EXIT

mkdir -p "$stage"
tar -xzf "$archive" -C "$stage"
test -f "$stage/.output/server/index.mjs"

if test -f "$current/.env"; then
  cp -a "$current/.env" "$stage/.env"
fi

# Preserve previous hashed chunks for visitors with an already-open tab.
cp -an "$current/.output/public/_nuxt/." "$stage/.output/public/_nuxt/" 2>/dev/null || true

PORT=3100 HOST=127.0.0.1 pm2 start "$stage/.output/server/index.mjs" \
  --name "$stage_app" --cwd "$stage" --update-env >/dev/null
sleep 2
curl --fail --silent --show-error http://127.0.0.1:3100/api/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3100/pretrip >/dev/null

mv "$current" "$backup"
mv "$stage" "$current"
pm2 restart ecosystem.config.cjs --only chimelong-pretrip --update-env >/dev/null
sleep 2
curl --fail --silent --show-error http://127.0.0.1:3000/api/health >/dev/null
curl --fail --silent --show-error https://qiyucl.site/api/health >/dev/null
nginx -t >/dev/null
pm2 save >/dev/null
rm -f "$archive"

echo "deployed=${release_id}"
