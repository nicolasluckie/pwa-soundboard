#!/usr/bin/env bash
set -euo pipefail

# add-sample.sh — interactive script to convert screen recordings to normalized
# MP3s and register them in samples.json
#
# Usage:
#   ./scripts/add-sample.sh                      # interactive mode
#   ./scripts/add-sample.sh <input-video>        # skip file prompt, still ask metadata
#
# Requirements: ffmpeg (brew install ffmpeg), jq (brew install jq)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLES_DIR="$SCRIPT_DIR/../data/audio"
SAMPLES_JSON="$SCRIPT_DIR/../data/samples.json"

# --- dependency checks -------------------------------------------------------

for cmd in ffmpeg jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd not found. Install with: brew install $cmd" >&2
    exit 1
  fi
done

# --- helpers -----------------------------------------------------------------

# Generate a slug from a name: lowercase, hyphens, strip special chars
make_slug() {
  local name="$1"
  echo "$name" | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9 -]//g' \
    | tr ' ' '-' \
    | sed 's/--*/-/g; s/^-//; s/-$//'
}

# Prompt with a default value. Usage: prompt_with_default "result_var" "Label" "default"
prompt_with_default() {
  local var="$1" label="$2" default="${3:-}"
  local val
  if [ -n "$default" ]; then
    read -rp "$label [$default]: " val
    val="${val:-$default}"
  else
    read -rp "$label: " val
  fi
  printf -v "$var" '%s' "$val"
}

# Escape a string for JSON (handles quotes, backslashes, control chars)
json_escape() {
  jq -Rn --arg s "$1" '$s'
}

# --- collect sample info -----------------------------------------------------

echo "🎵 Soundboard Sample Adder"
echo "=========================="
echo

# Input file: from arg or prompt
if [ $# -ge 1 ]; then
  INPUT="$1"
else
  prompt_with_default INPUT "Path to screen recording (drag file here)" ""
fi

# Expand ~ and strip surrounding quotes/whitespace
INPUT="${INPUT/#\~/$HOME}"
INPUT="${INPUT#\"}"
INPUT="${INPUT%\"}"
INPUT="$(echo "$INPUT" | xargs)"

if [ ! -f "$INPUT" ]; then
  echo "ERROR: File not found: $INPUT" >&2
  exit 1
fi

echo
echo "Source: $INPUT"
echo

# Display name
prompt_with_default NAME "Display name" ""
if [ -z "$NAME" ]; then
  echo "ERROR: Name is required" >&2
  exit 1
fi

# Slug / filename
DEFAULT_SLUG="$(make_slug "$NAME")"
prompt_with_default SLUG "Slug (filename)" "$DEFAULT_SLUG"
SLUG="$(make_slug "$SLUG")"
if [ -z "$SLUG" ]; then
  echo "ERROR: Slug is required" >&2
  exit 1
fi

# Check for slug collision
if jq -e --arg id "$SLUG" '.[] | select(.id == $id)' "$SAMPLES_JSON" &>/dev/null; then
  echo "WARNING: A sample with id '$SLUG' already exists in samples.json." >&2
  read -rp "Overwrite? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

# Emoji or icon
echo
echo "Choose a visual:"
echo "  1) Emoji"
echo "  2) Icon image (path to .webp/.png — will be referenced, not copied)"
echo "  3) None (color-only button)"
prompt_with_default VISUAL_CHOICE "Choice" "1"

EMOJI=""
ICON=""
case "$VISUAL_CHOICE" in
  1)
    prompt_with_default EMOJI "Emoji" "🔊"
    ;;
  2)
    prompt_with_default ICON "Icon path (e.g. /icons/sounds/foo.webp)" ""
    if [ -z "$ICON" ]; then
      echo "WARNING: No icon path given, falling back to emoji." >&2
      prompt_with_default EMOJI "Emoji" "🔊"
    fi
    ;;
  3)
    ;;
  *)
    echo "Invalid choice, defaulting to emoji." >&2
    prompt_with_default EMOJI "Emoji" "🔊"
    ;;
esac

# Color
echo
echo "Pick a color (hex or name):"
echo "  red    #ff6b6b    green  #34d399    blue   #00d4ff"
echo "  pink   #f472b6    purple #a78bfa    yellow #fbbf24"
prompt_with_default COLOR "Color" "#00d4ff"

# Tags
echo
prompt_with_default TAGS_RAW "Tags (comma-separated)" "meme"
# Split on comma, trim whitespace, build JSON array
TAGS_JSON="$(echo "$TAGS_RAW" | tr ',' '\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | jq -R . | jq -s .)"

# --- convert with ffmpeg -----------------------------------------------------

OUTPUT="$SAMPLES_DIR/${SLUG}.mp3"

echo
echo "Converting with ffmpeg..."
echo "  Input:  $INPUT"
echo "  Output: $OUTPUT"
echo

ffmpeg -y -i "$INPUT" \
  -filter:a "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -vn \
  "$OUTPUT" 2>&1 | tail -5

if [ ! -f "$OUTPUT" ]; then
  echo "ERROR: ffmpeg conversion failed" >&2
  exit 1
fi

echo "✅ Audio converted: $OUTPUT"
echo

# --- update samples.json -----------------------------------------------------

# Build the JSON object for the new sample
if [ -n "$ICON" ]; then
  VISUAL_JSON="\"icon\": $(json_escape "$ICON"),"
elif [ -n "$EMOJI" ]; then
  VISUAL_JSON="\"emoji\": $(json_escape "$EMOJI"),"
else
  VISUAL_JSON=""
fi

NEW_ENTRY=$(cat <<EOF
{
  "id": $(json_escape "$SLUG"),
  "name": $(json_escape "$NAME"),
  "file": $(json_escape "${SLUG}.mp3"),
  "color": $(json_escape "$COLOR"),
  ${VISUAL_JSON}
  "tags": $TAGS_JSON
}
EOF
)

# If the slug already exists, replace it; otherwise append
if jq -e --arg id "$SLUG" '.[] | select(.id == $id)' "$SAMPLES_JSON" &>/dev/null; then
  # Replace existing entry
  jq --arg id "$SLUG" --argjson entry "$NEW_ENTRY" \
    'map(if .id == $id then $entry else . end)' \
    "$SAMPLES_JSON" > "$SAMPLES_JSON.tmp"
else
  # Append new entry
  jq --argjson entry "$NEW_ENTRY" '. + [$entry]' \
    "$SAMPLES_JSON" > "$SAMPLES_JSON.tmp"
fi

mv "$SAMPLES_JSON.tmp" "$SAMPLES_JSON"

echo "✅ samples.json updated: '$NAME' (id: $SLUG)"
echo
echo "Done! The sound is ready to use."
