#!/usr/bin/env python3
"""
watch.py - Watch sources/ for new chat exports and auto-ingest them.

Uses polling-based file monitoring (no external dependencies).
When a new or modified JSON file is detected in sources/{chatgpt,claude,gemini}/,
it triggers incremental ingestion.

Usage:
    python watch.py                              # poll every 30s
    python watch.py --interval 10                # poll every 10s
    python watch.py --sources ../sources --vault ../vault
"""

import argparse
import signal
import sys
import time
from pathlib import Path

from ingest import discover_sources, file_hash, ingest

DEFAULT_INTERVAL = 30  # seconds


def build_snapshot(sources_dir):
    """Build a snapshot of current source files and their hashes."""
    snapshot = {}
    discovered = discover_sources(sources_dir)
    for source_type, files in discovered.items():
        for f in files:
            snapshot[str(f)] = file_hash(f)
    return snapshot


def watch(sources_dir, vault_dir, state_path, interval):
    """Poll sources directory and ingest when changes are detected."""
    print(f"Watching {sources_dir} for new exports (poll every {interval}s)...")
    print(f"Output: {vault_dir}")
    print("Press Ctrl+C to stop.\n")

    prev_snapshot = build_snapshot(sources_dir)

    running = True

    def handle_signal(sig, frame):
        nonlocal running
        print("\nStopping watcher.")
        running = False

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    while running:
        time.sleep(interval)
        if not running:
            break

        current_snapshot = build_snapshot(sources_dir)

        # Detect changes
        new_files = set(current_snapshot) - set(prev_snapshot)
        modified_files = {
            f for f in set(current_snapshot) & set(prev_snapshot)
            if current_snapshot[f] != prev_snapshot[f]
        }

        if new_files or modified_files:
            changes = list(new_files | modified_files)
            print(f"[{time.strftime('%H:%M:%S')}] Detected {len(changes)} change(s):")
            for c in changes:
                label = "new" if c in new_files else "modified"
                print(f"  - {label}: {Path(c).name}")

            stats = ingest(sources_dir, vault_dir, state_path)
            print(f"  -> Ingested {stats['conversations']} conversations "
                  f"from {stats['new']} file(s).\n")

            prev_snapshot = current_snapshot
        else:
            # Silent poll — no output on no-change cycles
            pass


def main():
    parser = argparse.ArgumentParser(
        description="Watch for new chat exports and auto-ingest them."
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
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL,
        help=f"Polling interval in seconds (default: {DEFAULT_INTERVAL})",
    )

    args = parser.parse_args()
    state_path = Path(args.state) if args.state else Path(args.vault) / ".ingest_state.json"

    watch(args.sources, args.vault, state_path, args.interval)


if __name__ == "__main__":
    main()
