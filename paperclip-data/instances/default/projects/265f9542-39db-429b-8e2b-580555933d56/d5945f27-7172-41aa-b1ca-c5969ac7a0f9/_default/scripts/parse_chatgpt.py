"""
ChatGPT export JSON parser.

Parses the standard ChatGPT data export format (conversations.json)
into Obsidian-ready Markdown files.

ChatGPT export format:
[
  {
    "title": "...",
    "create_time": 1234567890.0,
    "update_time": 1234567890.0,
    "mapping": {
      "<node-id>": {
        "id": "...",
        "message": {
          "author": { "role": "user" | "assistant" | "system" | "tool" },
          "content": { "content_type": "text", "parts": ["..."] },
          "create_time": 1234567890.0
        },
        "parent": "<node-id>",
        "children": ["<node-id>"]
      }
    }
  }
]
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path


def _timestamp_to_iso(ts):
    """Convert a Unix timestamp (float or int) to ISO date string."""
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, OSError, TypeError):
        return None


def _extract_text(message):
    """Extract text content from a ChatGPT message node."""
    if not message:
        return None
    content = message.get("content")
    if not content:
        return None
    content_type = content.get("content_type", "text")
    if content_type == "text":
        parts = content.get("parts", [])
        text_parts = [p for p in parts if isinstance(p, str) and p.strip()]
        return "\n\n".join(text_parts) if text_parts else None
    if content_type == "code":
        text = content.get("text", "")
        return f"```\n{text}\n```" if text else None
    return None


def _walk_thread(mapping):
    """Walk the conversation tree in order, yielding (role, text, timestamp) tuples."""
    # Find the root node (no parent or parent not in mapping)
    root_id = None
    for node_id, node in mapping.items():
        parent = node.get("parent")
        if parent is None or parent not in mapping:
            root_id = node_id
            break
    if root_id is None:
        return

    # BFS/DFS following first child path (main branch)
    current = root_id
    while current:
        node = mapping.get(current)
        if not node:
            break
        msg = node.get("message")
        if msg:
            author = msg.get("author", {}).get("role", "unknown")
            text = _extract_text(msg)
            ts = msg.get("create_time")
            if text and author in ("user", "assistant"):
                yield (author, text, ts)
        children = node.get("children", [])
        current = children[0] if children else None


def _sanitize_filename(title):
    """Create a safe filename from a conversation title."""
    if not title:
        title = "Untitled"
    # Remove or replace problematic characters
    safe = re.sub(r'[<>:"/\\|?*]', '-', title)
    safe = re.sub(r'\s+', ' ', safe).strip()
    # Truncate to reasonable length
    if len(safe) > 120:
        safe = safe[:120].rsplit(' ', 1)[0]
    return safe


def parse_conversation(conv):
    """Parse a single ChatGPT conversation dict into markdown string and metadata."""
    title = conv.get("title", "Untitled")
    create_time = _timestamp_to_iso(conv.get("create_time"))
    update_time = _timestamp_to_iso(conv.get("update_time"))
    mapping = conv.get("mapping", {})

    messages = list(_walk_thread(mapping))
    if not messages:
        return None, None

    # Build frontmatter
    lines = ["---"]
    lines.append(f"title: \"{title}\"")
    lines.append("source: chatgpt")
    if create_time:
        lines.append(f"created: {create_time}")
    if update_time:
        lines.append(f"updated: {update_time}")
    lines.append(f"message_count: {len(messages)}")

    # Extract topic tags from title keywords
    tags = ["chatgpt"]
    title_words = re.findall(r"[a-z][a-z0-9+#.-]*", title.lower())
    for w in title_words:
        if len(w) >= 4 and w not in {"this", "that", "with", "from", "what",
                                      "when", "where", "which", "about", "have",
                                      "been", "were", "your", "some", "they",
                                      "their", "into", "more", "also", "just",
                                      "help", "need", "want", "like", "make",
                                      "does", "made", "here", "there", "very",
                                      "only", "each", "other", "than", "most",
                                      "could", "would", "should", "will",
                                      "being", "using", "going", "thing",
                                      "things"}:
            tags.append(w)
    # Deduplicate while preserving order
    seen = set()
    unique_tags = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            unique_tags.append(t)
    tags = unique_tags
    lines.append(f"tags: [{', '.join(tags)}]")
    lines.append("---")
    lines.append("")
    lines.append(f"# {title}")
    lines.append("")

    for role, text, ts in messages:
        role_label = "User" if role == "user" else "Assistant"
        ts_str = _timestamp_to_iso(ts)
        header = f"## {role_label}"
        if ts_str:
            header += f"  \n*{ts_str}*"
        lines.append(header)
        lines.append("")
        lines.append(text)
        lines.append("")

    metadata = {
        "title": title,
        "source": "chatgpt",
        "created": create_time,
        "updated": update_time,
        "message_count": len(messages),
    }
    return "\n".join(lines), metadata


def parse_export(input_path, output_dir):
    """
    Parse a ChatGPT conversations.json export file.

    Args:
        input_path: Path to conversations.json
        output_dir: Directory to write markdown files into

    Returns:
        List of metadata dicts for each parsed conversation.
    """
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(input_path, "r", encoding="utf-8") as f:
        conversations = json.load(f)

    if not isinstance(conversations, list):
        conversations = [conversations]

    results = []
    seen_filenames = set()

    for conv in conversations:
        md, metadata = parse_conversation(conv)
        if md is None:
            continue

        filename = _sanitize_filename(conv.get("title", "Untitled"))
        # Deduplicate filenames
        base = filename
        counter = 1
        while filename in seen_filenames:
            filename = f"{base} ({counter})"
            counter += 1
        seen_filenames.add(filename)

        out_file = output_dir / f"{filename}.md"
        out_file.write_text(md, encoding="utf-8")
        metadata["file"] = str(out_file)
        results.append(metadata)

    return results
