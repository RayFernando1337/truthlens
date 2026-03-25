#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    cd "$(echo "$input" | grep -o '"workspace_roots":\["[^"]*"\]' | grep -o '/[^"]*')" 2>/dev/null || exit 0
    bun run eslint --no-error-on-unmatched-pattern "$file_path" 2>&1
    ;;
esac

exit 0
