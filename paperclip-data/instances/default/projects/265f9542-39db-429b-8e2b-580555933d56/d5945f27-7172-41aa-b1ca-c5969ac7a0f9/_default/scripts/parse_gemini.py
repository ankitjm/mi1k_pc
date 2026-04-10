"""
Gemini export JSON parser.

Parses Google Gemini (formerly Bard) chat export formats into
Obsidian-ready Markdown files.

Gemini Google Takeout export format (typically in Gemini/Conversations/):
Each conversation is a separate JSON file:
{
  "title": "...",
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-01-01T00:00:00.000Z",
  "entries": [
    {
      "role": "User" | "Model",
      "text": "...",
      "createTime": "2024-01-01T00:00:00.000Z"
    }
  ]
}

Alternative format (some exports):
{
  "conversations": [
    {
      "title": "...",
      "messages": [
        {
          "role": "user" | "model",
          "parts": [{ "text": "..." }],
          "createTime": "..."
        }
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
    """Format a timestamp string for display."""
    if not ts_str:
        return None
    try:
        # Handle various ISO formats
        ts_str = ts_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


def _extract_entry_text(entry):
    """Extract text from a Gemini message entry."""
    # Direct text field
    text = entry.get("text", "")
    if text and text.strip():
        return text.strip()

    # Parts array format
    parts = entry.get("parts", [])
    if isinstance(parts, list):
        texts = []
        for p in parts:
            if isinstance(p, dict):
                t = p.get("text", "")
                if t and t.strip():
                    texts.append(t.strip())
            elif isinstance(p, str) and p.strip():
                texts.append(p.strip())
        if texts:
            return "\n\n".join(texts)

    # Content field
    content = entry.get("content", "")
    if content and isinstance(content, str) and content.strip():
        return content.strip()

    return None


def _normalize_role(role_str):
    """Normalize role strings to 'user' or 'assistant'."""
    if not role_str:
        return None
    role_lower = role_str.lower()
    if role_lower in ("user", "human"):
        return "user"
    if role_lower in ("model", "assistant", "gemini"):
        return "assistant"
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
    """Parse a single Gemini conversation dict into markdown string and metadata."""
    title = conv.get("title") or "Untitled"
    created = _format_timestamp(conv.get("createTime") or conv.get("create_time"))
    updated = _format_timestamp(conv.get("updateTime") or conv.get("update_time"))

    # Handle both 'entries' and 'messages' keys
    entries_raw = conv.get("entries") or conv.get("messages") or []

    messages = []
    for entry in entries_raw:
        role = _normalize_role(entry.get("role"))
        if not role:
            continue
        text = _extract_entry_text(entry)
        if not text:
            continue
        ts = _format_timestamp(entry.get("createTime") or entry.get("create_time"))
        messages.append((role, text, ts))

    if not messages:
        return None, None

    lines = ["---"]
    lines.append(f"title: \"{title}\"")
    lines.append("source: gemini")
    if created:
        lines.append(f"created: {created}")
    if updated:
        lines.append(f"updated: {updated}")
    lines.append(f"message_count: {len(messages)}")
    # Extract topic tags from title keywords
    tags = ["gemini"]
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
        "source": "gemini",
        "created": created,
        "updated": updated,
        "message_count": len(messages),
    }
    return "\n".join(lines), metadata


def parse_export(input_path, output_dir):
    """
    Parse Gemini export file(s).

    Args:
        input_path: Path to a JSON file or directory of conversation JSONs
        output_dir: Directory to write markdown files into

    Returns:
        List of metadata dicts for each parsed conversation.
    """
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    conversations = []

    if input_path.is_dir():
        files = sorted(input_path.glob("*.json"))
        for f in files:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    conversations.extend(data)
                elif "conversations" in data:
                    conversations.extend(data["conversations"])
                else:
                    conversations.append(data)
    else:
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            conversations = data
        elif "conversations" in data:
            conversations = data["conversations"]
        else:
            conversations = [data]

    results = []
    seen_filenames = set()

    for conv in conversations:
        md, metadata = parse_conversation(conv)
        if md is None:
            continue

        filename = _sanitize_filename(conv.get("title") or "Untitled")
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
