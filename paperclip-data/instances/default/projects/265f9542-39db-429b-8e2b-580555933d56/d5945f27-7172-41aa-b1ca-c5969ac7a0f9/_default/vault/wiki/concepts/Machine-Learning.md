---
title: "Machine Learning"
type: concept
updated: 2026-04-07
sources: [gemini/Machine Learning Pipelines.md]
related: [[Python]], [[Knowledge Management]]
---

# Machine Learning

## Production ML Pipelines

Ankit has explored production-grade ML pipeline design:

- **Orchestration frameworks**: Kubeflow (Kubernetes-native) or MLflow (experiment tracking + serving)
- **Pipeline stages**: data ingestion → feature engineering → model training → evaluation → deployment
- **Key principles**:
  - Each stage must be **idempotent** (safe to re-run)
  - Each stage must be **versioned** (reproducibility)

(source: [[gemini/Machine Learning Pipelines]])

## Key Themes

- Production-first thinking: interested in reliability and reproducibility, not just model accuracy
- Familiar with both Kubeflow and MLflow ecosystems
