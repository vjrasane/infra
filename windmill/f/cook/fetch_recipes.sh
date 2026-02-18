# shellcheck shell=bash
target_dir="./shared/repo"

if [ -d "$target_dir/.git" ]; then
	git -C "$target_dir" pull --depth 1 --ff-only
else
	git clone --depth 1 --branch main "https://github.com/vjrasane/cook.git" "$target_dir"
fi

find "$(realpath "$target_dir")/recipes" -name "*.cook" -type f | jq -R . | jq -s . >./result.json
