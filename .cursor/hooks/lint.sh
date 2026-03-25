#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path" *: *"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    ws_root=$(echo "$input" | grep -o '"workspace_roots" *: *\[ *"[^"]*"' | grep -o '/[^"]*')
    if [ -z "$ws_root" ]; then exit 0; fi
    cd "$ws_root" 2>/dev/null || exit 0
    exec bun run eslint --no-error-on-unmatched-pattern "$file_path" >&2
    ;;
esac

exit 0
