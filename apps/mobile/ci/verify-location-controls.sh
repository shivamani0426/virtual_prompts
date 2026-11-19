#!/bin/sh
# Emulator acceptance: search and opt-in location must be visible and accessible.
set -eu
xml=/sdcard/clearskies-accessibility.xml
local_xml=/tmp/clearskies-accessibility.xml
found=0
attempt=0
while [ "$attempt" -lt 5 ]; do
  attempt=$((attempt+1))
  adb shell uiautomator dump "$xml" >/dev/null
  adb shell cat "$xml" > "$local_xml"
  if grep -Fq "Search any city or town" "$local_xml" &&
     grep -Fq "Use my location" "$local_xml"; then
    found=1
    break
  fi
  adb shell input swipe 550 1600 550 850 350
  sleep 1
done
if [ "$found" -ne 1 ]; then
  echo "Could not find accessible Android city search and Use my location controls." >&2
  head -c 3500 "$local_xml" >&2
  exit 1
fi
echo "PASS: Native Android UI exposes city search and Use my location controls."
