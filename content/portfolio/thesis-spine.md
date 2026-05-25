---
id: spine-thesis
title: Thesis I: Lumbosacral Vertebra Localization
url: /thesis/spine
---

Saad's first master's thesis project at FAU Erlangen-Nuremberg and Smart Imaging Lab focuses on automatic lumbosacral vertebra localization in variable field-of-view pelvic MRI.

The clinical and technical problem is difficult because pelvic MRI often has variable coverage, anatomical diversity, and partial visibility of the spine. Manual vertebral landmark annotation is time-consuming and can vary between observers.

Saad developed a dual-head 3D U-Net for volumetric vertebra landmark detection in sagittal T2-weighted pelvic MRI. The model jointly predicts vertebral center heatmaps and an anatomical S1 reference point.

The S1 reference point enables S1-anchored labeling across incomplete or variable spine coverage, making the method more robust when only part of the lumbosacral spine is visible.

Reported results include 4.21 mm mean localization error, individual S1-S5 sacral detection, multi-center MRI protocol robustness, and about 1.4 seconds per-volume inference.

The technical stack includes Python, PyTorch, 3D U-Net, FastAPI, Docker, NIfTI, and nibabel.

This thesis is strong because it combines clinical imaging constraints, 3D deep learning, robust anatomical reference design, quantitative evaluation, and a deployable inference workflow.
