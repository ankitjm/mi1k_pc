"""
interlink.py - Post-process Obsidian markdown files to add interlinking.

Scans a vault directory of markdown conversation files, extracts topics from
titles and content, generates tags, and adds [[wikilinks]] between related
conversations for Obsidian graph visualization.

Usage:
    python interlink.py --vault vault/
    python interlink.py --vault vault/ --min-similarity 2
"""

import argparse
import re
from collections import defaultdict
from pathlib import Path

# Common stop words to exclude from topic extraction
STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "its", "this", "that", "was",
    "are", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "can", "shall",
    "about", "how", "what", "when", "where", "which", "who", "why",
    "me", "my", "i", "you", "your", "we", "our", "they", "their", "he",
    "she", "him", "her", "us", "them", "some", "any", "all", "each",
    "not", "no", "so", "if", "then", "than", "too", "very", "just",
    "also", "more", "most", "other", "into", "over", "such", "only",
    "up", "out", "like", "get", "got", "make", "made", "using", "use",
    "help", "need", "want", "please", "can", "think", "know", "thing",
    "things", "way", "go", "going", "here", "there", "show", "tell",
    "give", "take", "user", "assistant", "create", "build", "write",
    "read", "look", "find", "see", "say", "said", "work", "working",
    "new", "good", "best", "first", "last", "next", "time", "well",
    "come", "back", "even", "still", "already", "much", "many",
    "sure", "really", "right", "left", "keep", "let", "try",
    "start", "end", "long", "different", "same", "through",
}

# Domain keyword mappings: if a keyword is found, add these broader topic tags
TOPIC_CLUSTERS = {
    "python": ["programming", "python"],
    "javascript": ["programming", "javascript"],
    "typescript": ["programming", "typescript"],
    "react": ["programming", "frontend", "react"],
    "css": ["programming", "frontend", "css"],
    "html": ["programming", "frontend", "html"],
    "node": ["programming", "backend", "nodejs"],
    "api": ["programming", "api"],
    "database": ["programming", "database"],
    "sql": ["programming", "database", "sql"],
    "postgres": ["programming", "database", "postgres"],
    "mongodb": ["programming", "database", "mongodb"],
    "docker": ["devops", "docker"],
    "kubernetes": ["devops", "kubernetes"],
    "aws": ["cloud", "aws"],
    "gcp": ["cloud", "gcp"],
    "azure": ["cloud", "azure"],
    "git": ["programming", "git"],
    "linux": ["systems", "linux"],
    "bash": ["programming", "bash"],
    "rust": ["programming", "rust"],
    "go": ["programming", "golang"],
    "java": ["programming", "java"],
    "swift": ["programming", "swift"],
    "kotlin": ["programming", "kotlin"],
    "ml": ["machine-learning"],
    "machine": ["machine-learning"],
    "learning": ["machine-learning"],
    "ai": ["artificial-intelligence"],
    "gpt": ["artificial-intelligence", "llm"],
    "llm": ["artificial-intelligence", "llm"],
    "neural": ["machine-learning", "deep-learning"],
    "model": ["machine-learning"],
    "training": ["machine-learning"],
    "data": ["data"],
    "analytics": ["data", "analytics"],
    "visualization": ["data", "visualization"],
    "testing": ["programming", "testing"],
    "debug": ["programming", "debugging"],
    "error": ["programming", "debugging"],
    "bug": ["programming", "debugging"],
    "deploy": ["devops", "deployment"],
    "ci": ["devops", "ci-cd"],
    "cd": ["devops", "ci-cd"],
    "security": ["security"],
    "auth": ["security", "authentication"],
    "crypto": ["security", "cryptography"],
    "design": ["design"],
    "ui": ["design", "ui"],
    "ux": ["design", "ux"],
    "architecture": ["architecture"],
    "startup": ["business", "startup"],
    "business": ["business"],
    "marketing": ["business", "marketing"],
    "writing": ["writing"],
    "essay": ["writing"],
    "blog": ["writing", "blog"],
    "email": ["writing", "email"],
    "math": ["math"],
    "algorithm": ["programming", "algorithms"],
    "regex": ["programming", "regex"],
    "obsidian": ["tools", "obsidian"],
    "notion": ["tools", "notion"],
    "productivity": ["productivity"],
    "workflow": ["productivity", "workflow"],
    "automation": ["productivity", "automation"],
    "recipe": ["cooking"],
    "food": ["cooking"],
    "health": ["health"],
    "fitness": ["health", "fitness"],
    "travel": ["travel"],
    "finance": ["finance"],
    "investment": ["finance", "investment"],
    "career": ["career"],
    "interview": ["career", "interview"],
    "resume": ["career", "resume"],
}


def extract_frontmatter(content):
    """Extract frontmatter dict and body from markdown content."""
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
    if not match:
        return {}, content
    fm_text = match.group(1)
    body = match.group(2)
    fm = {}
    for line in fm_text.split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            fm[key.strip()] = val.strip()
    return fm, body


def rebuild_frontmatter(fm, body):
    """Rebuild markdown content from frontmatter dict and body."""
    lines = ["---"]
    for key, val in fm.items():
        lines.append(f"{key}: {val}")
    lines.append("---")
    lines.append(body)
    return "\n".join(lines)


def extract_keywords(text):
    """Extract meaningful keywords from text (title or content snippet)."""
    # Lowercase, split on non-alpha, strip trailing punctuation
    words = re.findall(r"[a-z][a-z0-9+#]*", text.lower())
    keywords = set()
    for w in words:
        if w in STOP_WORDS or len(w) < 3:
            continue
        keywords.add(w)
    return keywords


def keywords_to_tags(keywords):
    """Map extracted keywords to broader topic tags using TOPIC_CLUSTERS."""
    tags = set()
    for kw in keywords:
        if kw in TOPIC_CLUSTERS:
            tags.update(TOPIC_CLUSTERS[kw])
        else:
            # Keep the keyword itself as a tag if it's meaningful enough
            if len(kw) >= 4:
                tags.add(kw)
    return tags


def compute_similarity(tags_a, tags_b):
    """Compute similarity score between two tag sets (intersection size)."""
    return len(tags_a & tags_b)


def scan_vault(vault_dir):
    """Scan all markdown files in vault and extract metadata."""
    vault_dir = Path(vault_dir)
    files = {}  # stem -> {path, fm, body, keywords, tags}

    for md_file in sorted(vault_dir.rglob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        fm, body = extract_frontmatter(content)

        title = fm.get("title", "").strip('"').strip("'")
        source = fm.get("source", "")

        # Extract keywords from title
        title_keywords = extract_keywords(title)

        # Extract keywords from first ~500 chars of body (first user message)
        body_snippet = body[:500] if body else ""
        body_keywords = extract_keywords(body_snippet)

        all_keywords = title_keywords | body_keywords
        tags = keywords_to_tags(all_keywords)

        # Always keep the source tag
        if source:
            tags.add(source)

        files[md_file.stem] = {
            "path": md_file,
            "fm": fm,
            "body": body,
            "keywords": all_keywords,
            "tags": tags,
        }

    return files


def build_links(files, min_similarity=2):
    """Build a map of related files based on tag similarity."""
    stems = list(files.keys())
    links = defaultdict(list)  # stem -> [(related_stem, score)]

    for i, stem_a in enumerate(stems):
        tags_a = files[stem_a]["tags"]
        for j in range(i + 1, len(stems)):
            stem_b = stems[j]
            tags_b = files[stem_b]["tags"]
            score = compute_similarity(tags_a, tags_b)
            if score >= min_similarity:
                links[stem_a].append((stem_b, score))
                links[stem_b].append((stem_a, score))

    # Sort each list by score descending, cap at 10 links
    for stem in links:
        links[stem] = sorted(links[stem], key=lambda x: -x[1])[:10]

    return links


def update_files(files, links):
    """Update markdown files with enriched tags and related links."""
    updated = 0
    for stem, info in files.items():
        fm = info["fm"]
        body = info["body"]
        tags = sorted(info["tags"])

        # Update frontmatter tags
        fm["tags"] = f"[{', '.join(tags)}]"

        # Remove any existing "## Related Conversations" section
        body = re.sub(
            r"\n## Related Conversations\n.*$", "", body, flags=re.DOTALL
        )

        # Add related conversations section if links exist
        related = links.get(stem, [])
        if related:
            body = body.rstrip() + "\n\n## Related Conversations\n\n"
            for related_stem, score in related:
                body += f"- [[{related_stem}]]\n"

        new_content = rebuild_frontmatter(fm, body)
        info["path"].write_text(new_content, encoding="utf-8")
        updated += 1

    return updated


def main():
    parser = argparse.ArgumentParser(
        description="Add interlinking and topic tags to Obsidian vault markdown files."
    )
    parser.add_argument(
        "--vault", required=True, help="Path to vault directory containing markdown files"
    )
    parser.add_argument(
        "--min-similarity",
        type=int,
        default=2,
        help="Minimum shared tags to create a link (default: 2)",
    )
    args = parser.parse_args()

    vault_dir = Path(args.vault)
    if not vault_dir.is_dir():
        print(f"Error: {vault_dir} is not a directory.")
        return

    print(f"Scanning vault: {vault_dir}")
    files = scan_vault(vault_dir)
    print(f"Found {len(files)} markdown files.")

    if not files:
        print("No files to process.")
        return

    print(f"Building links (min similarity: {args.min_similarity})...")
    links = build_links(files, min_similarity=args.min_similarity)
    linked_count = sum(1 for v in links.values() if v)
    print(f"Found relationships for {linked_count} files.")

    print("Updating files with tags and links...")
    updated = update_files(files, links)
    print(f"Updated {updated} files.")

    # Print tag summary
    all_tags = set()
    for info in files.values():
        all_tags.update(info["tags"])
    print(f"\nTotal unique tags: {len(all_tags)}")
    for tag in sorted(all_tags):
        count = sum(1 for info in files.values() if tag in info["tags"])
        print(f"  #{tag}: {count} files")


if __name__ == "__main__":
    main()
