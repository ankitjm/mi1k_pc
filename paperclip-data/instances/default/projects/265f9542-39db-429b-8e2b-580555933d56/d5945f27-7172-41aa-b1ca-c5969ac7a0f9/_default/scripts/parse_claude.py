"""
Claude export JSON parser.

Parses Claude chat export formats into Obsidian-ready Markdown files.

Claude export format (conversations.json or individual conversation files):
{
  "uuid": "...",
  "name": "...",
  "created_at": "2024-01-01T00:00:00.000000+00:00",
  "updated_at": "2024-01-01T00:00:00.000000+00:00",
  "chat_messages": [
    {
      "uuid": "...",
      "text": "...",
      "sender": "human" | "assistant",
      "created_at": "2024-01-01T00:00:00.000000+00:00",
      "attachments": [],
      "content": [
        { "type": "text", "text": "..." }
      ]
    }
  ]
}
"""

import json
import re
from datetime import datetime
from pathlib import Path


def _format_timestamp(ts_str):
    """Format an ISO timestamp string for display."""
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


def _extract_message_text(msg):
    """Extract text from a Claude message, handling both flat and content-array formats."""
    # Try content array first (newer format)
    content = msg.get("content")
    if isinstance(content, list):
        texts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text", "")
                if t.strip():
                    texts.append(t)
        if texts:
            return "\n\n".join(texts)

    # Fall back to flat text field
    text = msg.get("text", "")
    if text and text.strip():
        return text.strip()

    return None


def _sanitize_filename(title):
    """Create a safe filename from a conversation title."""
    if not title:
        title = "Untitled"
    safe = re.sub(r'[<>:"/\\|?*]', '-', title)
    safe = re.sub(r'\s+', ' ', safe).strip()
    if len(safe) > 120:
        safe = safe[:120].rsplit(' ', 1)[0]
    return safe


def parse_conversation(conv):
    """Parse a single Claude conversation dict into markdown string and metadata."""
    title = conv.get("name") or conv.get("title") or "Untitled"
    created = _format_timestamp(conv.get("created_at"))
    updated = _format_timestamp(conv.get("updated_at"))

    messages_raw = conv.get("chat_messages", [])
    messages = []
    for msg in messages_raw:
        sender = msg.get("sender", "unknown")
        if sender not in ("human", "assistant"):
            continue
        text = _extract_message_text(msg)
        if not text:
            continue
        ts = _format_timestamp(msg.get("created_at"))
        role = "user" if sender == "human" else "assistant"
        messages.append((role, text, ts))

    if not messages:
        return None, None

    lines = ["---"]
    lines.append(f"title: \"{title}\"")
    lines.append("source: claude")
    if created:
        lines.append(f"created: {created}")
    if updated:
        lines.append(f"updated: {updated}")
    lines.append(f"message_count: {len(messages)}")
    # Extract topic tags from title keywords
    tags = ["claude"]
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
        header = f"## {role_label}"
        if ts:
            header += f"  \n*{ts}*"
        lines.append(header)
        lines.append("")
        lines.append(text)
        lines.append("")

    metadata = {
        "title": title,
        "source": "claude",
        "created": created,
        "updated": updated,
        "message_count": len(messages),
    }
    return "\n".join(lines), metadata


def parse_export(input_path, output_dir):
    """
    Parse a Claude export file or directory.

    Args:
        input_path: Path to conversations.json or directory of conversation JSONs
        output_dir: Directory to write markdown files into

    Returns:
        List of metadata dicts for each parsed conversation.
    """
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Handle single file or directory
    if input_path.is_dir():
        files = sorted(input_path.glob("*.json"))
        conversations = []
        for f in files:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    conversations.extend(data)
                else:
                    conversations.append(data)
    else:
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            conversations = data
        else:
            conversations = [data]

    results = []
    seen_filenames = set()

    for conv in conversations:
        md, metadata = parse_conversation(conv)
        if md is None:
            continue

        filename = _sanitize_filename(conv.get("name") or conv.get("title") or "Untitled")
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
