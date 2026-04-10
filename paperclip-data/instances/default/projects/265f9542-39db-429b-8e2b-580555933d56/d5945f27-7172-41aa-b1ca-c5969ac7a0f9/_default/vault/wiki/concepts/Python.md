---
title: "Python"
type: concept
updated: 2026-04-07
sources: [chatgpt/Python Data Structures.md]
related: [[Machine Learning]], [[Knowledge Management]]
---

# Python

## Data Structures for Large Datasets

Ankit has explored efficient Python data structures for large-scale data handling:

- **numpy arrays** — best for numerical data; O(1) element access, vectorized ops
- **pandas DataFrames** — best for tabular/structured data; rich query API
- **collections.deque** — best for queue operations; O(1) append/pop on both ends
- Selection depends on operation type: numerical → numpy, tabular → pandas, queue → deque

(source: [[chatgpt/Python Data Structures]])

## Key Themes

- Performance-conscious: Ankit thinks in terms of Big-O characteristics when choosing data structures
- Prefers established ecosystem libraries over custom implementations
