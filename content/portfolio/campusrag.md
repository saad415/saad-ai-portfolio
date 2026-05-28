---
id: campusrag
title: CampusRAG Multi-Tenant AI Inference Platform
url: /projects/campusrag
---

CampusRAG is a multi-tenant AI inference platform prototype designed for university computing-center environments.

It demonstrates a web-based RAG service where separate institutes or project groups can upload documents, query them through an AI chat interface, and keep access, retrieval, usage accounting, and operational metrics separated by tenant.

The prototype page includes tenant switching for Medicine, Engineering, and Computer Science, isolated document collections, RAG-style source-grounded answers, usage accounting, request limits, and Prometheus-style metrics.

The intended backend architecture uses FastAPI endpoints for upload, chat, usage, and metrics. Tenant IDs are attached to every request so the system can separate uploaded files, vector collections, accounting records, and retrieval context.

The platform is designed to map to open-source AI infrastructure components such as LiteLLM for model gateway routing, vLLM or Ollama for local inference, ChromaDB or pgvector for retrieval, SQLite or PostgreSQL for accounting, Docker Compose for deployment, and Prometheus/Grafana for monitoring.

CampusRAG is relevant to AI inference platform roles because it connects web UI development, REST APIs, RAG, tenant separation, monitoring, resource limits, and future integration with SSO, Kubernetes, Slurm, and GPU-based inference engines.
