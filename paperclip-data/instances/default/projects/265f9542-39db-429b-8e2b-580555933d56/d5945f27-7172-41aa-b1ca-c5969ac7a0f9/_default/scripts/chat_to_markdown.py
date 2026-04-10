#!/usr/bin/env python3
"""
chat_to_markdown.py - Parse chat export JSON into Obsidian-ready Markdown.

Supports: ChatGPT, Claude, Gemini exports.

Usage:
    python chat_to_markdown.py --source chatgpt --input sources/chatgpt/conversations.json --output vault/chatgpt/
    python chat_to_markdown.py --source claude  --input sources/claude/conversations.json  --output vault/claude/
    python chat_to_markdown.py --source gemini  --input sources/gemini/                    --output vault/gemini/
    python chat_to_markdown.py --auto --input sources/ --output vault/

Options:
    --source    Source type: chatgpt, claude, gemini
    --input     Path to export JSON file or directory
    --output    Output directory for markdown files
    --auto      Auto-detect sources from directory structure (expects sources/{chatgpt,claude,gemini}/)
"""

import argparse
import json
import sys
from pathlib import Path

from parse_chatgpt import parse_export as parse_chatgpt
from parse_claude import parse_export as parse_claude
from parse_gemini import parse_export as parse_gemini
from interlink import scan_vault, build_links, update_files

PARSERS = {
    "chatgpt": parse_chatgpt,
    "claude": parse_claude,
    "gemini": parse_gemini,
}


def find_json_files(directory):
    """Find JSON files in a directory (non-recursive, skip .gitkeep)."""
    d = Path(directory)
    if not d.is_dir():
        return []
    return sorted(f for f in d.glob("*.json") if f.name != ".gitkeep")


def auto_parse(input_dir, output_dir):
    """Auto-detect and parse all source types from a sources/ directory."""
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    all_results = []

    for source_type in ["chatgpt", "claude", "gemini"]:
        source_dir = input_dir / source_type
        if not source_dir.is_dir():
            continue

        json_files = find_json_files(source_dir)
        if not json_files:
            print(f"  [{source_type}] No JSON files found in {source_dir}, skipping.")
            continue

        out_dir = output_dir / source_type
        parser = PARSERS[source_type]

        # If there's a single file, parse it directly; otherwise parse the directory
        if len(json_files) == 1:
            target = json_files[0]
        else:
            target = source_dir

        print(f"  [{source_type}] Parsing {target} -> {out_dir}")
        results = parser(target, out_dir)
        all_results.extend(results)
        print(f"  [{source_type}] Generated {len(results)} markdown files.")

    return all_results


def main():
    parser = argparse.ArgumentParser(
        description="Parse chat exports into Obsidian-ready Markdown."
    )
    parser.add_argument(
        "--source",
        choices=["chatgpt", "claude", "gemini"],
        help="Source type to parse",
    )
    parser.add_argument("--input", required=True, help="Input file or directory path")
    parser.add_argument("--output", required=True, help="Output directory for markdown")
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Auto-detect sources from directory structure",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print summary JSON to stdout",
    )
    parser.add_argument(
        "--no-interlink",
        action="store_true",
        help="Skip interlinking post-processing step",
    )
    parser.add_argument(
        "--min-similarity",
        type=int,
        default=2,
        help="Minimum shared tags to create a link (default: 2)",
    )

    args = parser.parse_args()

    if args.auto:
        print(f"Auto-parsing sources from {args.input}...")
        results = auto_parse(args.input, args.output)
    elif args.source:
        parse_fn = PARSERS[args.source]
        print(f"Parsing {args.source} export: {args.input} -> {args.output}")
        results = parse_fn(args.input, args.output)
    else:
        parser.error("Either --source or --auto is required.")
        return

    print(f"\nTotal: {len(results)} conversations parsed into markdown.")

    # Post-processing: interlink files
    if not args.no_interlink and results:
        output_dir = Path(args.output)
        print(f"\nInterlinking vault: {output_dir}")
        files = scan_vault(output_dir)
        print(f"  Scanned {len(files)} markdown files for topics.")
        links = build_links(files, min_similarity=args.min_similarity)
        linked_count = sum(1 for v in links.values() if v)
        print(f"  Found relationships for {linked_count} files.")
        updated = update_files(files, links)
        print(f"  Updated {updated} files with tags and [[wikilinks]].")

    if args.summary:
        summary = {
            "total": len(results),
            "by_source": {},
        }
        for r in results:
            src = r.get("source", "unknown")
            summary["by_source"].setdefault(src, 0)
            summary["by_source"][src] += 1
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
