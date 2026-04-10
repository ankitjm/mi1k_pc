#!/usr/bin/env python3
"""
ingest.py - Incremental ingestion of chat exports.

Scans sources/ for new JSON files, parses them into Obsidian-ready Markdown,
and tracks processed files so subsequent runs only handle new additions.

Usage:
    python ingest.py                          # default: sources/ -> vault/
    python ingest.py --sources ../sources --vault ../vault
    python ingest.py --reset                  # clear state and reprocess everything
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from parse_chatgpt import parse_export as parse_chatgpt
from parse_claude import parse_export as parse_claude
from parse_gemini import parse_export as parse_gemini

PARSERS = {
    "chatgpt": parse_chatgpt,
    "claude": parse_claude,
    "gemini": parse_gemini,
}

STATE_FILE = ".ingest_state.json"


def file_hash(path):
    """SHA-256 hash of a file's contents."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_state(state_path):
    """Load the ingestion state file. Returns dict of processed files."""
    if state_path.exists():
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processed": {}, "last_run": None}


def save_state(state_path, state):
    """Persist the ingestion state."""
    state["last_run"] = datetime.now(timezone.utc).isoformat()
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def discover_sources(sources_dir):
    """Find all JSON files in the sources directory, grouped by source type."""
    sources_dir = Path(sources_dir)
    found = {}
    for source_type in PARSERS:
        source_subdir = sources_dir / source_type
        if not source_subdir.is_dir():
            continue
        json_files = sorted(
            f for f in source_subdir.glob("*.json") if f.name != ".gitkeep"
        )
        if json_files:
            found[source_type] = json_files
    return found


def ingest(sources_dir, vault_dir, state_path, force=False):
    """
    Run incremental ingestion.

    Returns:
        dict with counts of new/skipped/total files processed.
    """
    sources_dir = Path(sources_dir)
    vault_dir = Path(vault_dir)
    state_path = Path(state_path)

    state = load_state(state_path) if not force else {"processed": {}, "last_run": None}
    discovered = discover_sources(sources_dir)

    stats = {"new": 0, "skipped": 0, "conversations": 0, "errors": []}

    for source_type, files in discovered.items():
        out_dir = vault_dir / source_type
        parser = PARSERS[source_type]

        for json_file in files:
            file_key = str(json_file.relative_to(sources_dir))
            current_hash = file_hash(json_file)

            # Skip if already processed and unchanged
            prev = state["processed"].get(file_key)
            if prev and prev.get("hash") == current_hash:
                stats["skipped"] += 1
                continue

            # New or modified file — parse it
            print(f"  [{source_type}] Ingesting {json_file.name}...")
            try:
                results = parser(json_file, out_dir)
                conv_count = len(results)
                stats["new"] += 1
                stats["conversations"] += conv_count

                state["processed"][file_key] = {
                    "hash": current_hash,
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    "conversations": conv_count,
                    "source_type": source_type,
                }
                print(f"  [{source_type}] -> {conv_count} conversations written to {out_dir}")
            except Exception as e:
                error_msg = f"[{source_type}] Error parsing {json_file.name}: {e}"
                print(f"  {error_msg}", file=sys.stderr)
                stats["errors"].append(error_msg)

    save_state(state_path, state)
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Incrementally ingest chat exports into Obsidian vault."
    )
    parser.add_argument(
        "--sources",
        default="sources",
        help="Path to sources directory (default: sources/)",
    )
    parser.add_argument(
        "--vault",
        default="vault",
        help="Path to output vault directory (default: vault/)",
    )
    parser.add_argument(
        "--state",
        default=None,
        help="Path to state file (default: <vault>/.ingest_state.json)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear state and reprocess all files",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )

    args = parser.parse_args()
    state_path = Path(args.state) if args.state else Path(args.vault) / STATE_FILE

    print(f"Ingesting from {args.sources} -> {args.vault}")
    if args.reset:
        print("  (state reset — reprocessing all files)")

    stats = ingest(args.sources, args.vault, state_path, force=args.reset)

    print(f"\nDone: {stats['new']} new files, {stats['skipped']} unchanged, "
          f"{stats['conversations']} conversations total.")
    if stats["errors"]:
        print(f"Errors: {len(stats['errors'])}")
        for err in stats["errors"]:
            print(f"  - {err}")

    if args.json:
        print(json.dumps(stats, indent=2))

    sys.exit(1 if stats["errors"] else 0)


if __name__ == "__main__":
    main()
