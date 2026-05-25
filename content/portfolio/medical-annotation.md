---
id: medical-annotation-platform
title: Medical MRI Annotation Platform
url: /projects/medical-annotation
---

The Medical MRI Annotation Platform is a browser-based volumetric MRI annotation workstation and production-style full-stack medical imaging system.

It supports NIfTI upload, 3-plane viewing, editable landmarks, segmentation masks, 3D region growing tools, Slicer-compatible exports, and ML-ready dataset outputs.

Radiologists and researchers can upload .nii or .nii.gz files, navigate axial, coronal, and sagittal planes with slice sliders, place point landmarks, paint segmentation masks, erase masks, select and move annotations, rename landmarks, change landmark colors and sizes, save to database, load from database, export JSON, export 3D Slicer .mrk.json, export segmentation masks, and export segmentation .nii.gz.

The architecture uses Next.js, TypeScript, HTML5 Canvas, nifti-reader-js, FastAPI, Neon/PostgreSQL, Supabase Storage, Railway, and Docker.

Every save creates versioned JSONB snapshots in Postgres so annotations can be reviewed, compared, restored, and consumed by ML teams.

The project page is also supported by a RAG-backed AI assistant. The assistant uses Markdown project documentation, chunking, Postgres/pgvector storage, hybrid vector and keyword retrieval, optional Jina semantic embeddings, Groq generation, and source-title citations to answer questions about the system.

The live annotation workflow includes a case list, MRI upload, browser rendering, landmark mode, segmentation mode, brush editing, eraser, 3D region grow seed, zoom and slice controls, clinical review notes, database save/load, annotation history, and export routes.

This project demonstrates a standalone platform used across products because it separates the annotation workflow, backend state contract, storage, export formats, and ML dataset outputs from a single fixed product.

ML teams can consume the annotated datasets through exported JSON, Slicer-compatible markup, segmentation masks, and segmentation NIfTI files. These outputs contain landmark coordinates, labels, colors, slice information, voxel metadata, and mask strokes or voxel masks suitable for training, validation, review, or downstream preprocessing.
