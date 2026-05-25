---
id: uterus-thesis
title: Thesis II: Uterine Anatomical Landmark Detection
url: /thesis/uterus
---

Saad's second master's thesis project focuses on automatic detection of uterine anatomical landmarks in pelvic MRI.

Uterine biometry measures fundal thickness, body length, cervical length, and AP diameter. These measurements are clinically relevant for managing endometrial cancer, fibroids, and endometriosis, but manual measurement can have high inter-observer variability.

Saad built the preprocessing pipeline for raw MRI data from three scanner protocols. He used nnU-Net v2 uterine segmentation as a region of interest and trained a multi-decoder 3D U-Net with a shared encoder and independent decoder branches for each landmark group.

He introduced SharpHeatmapLoss, a custom loss combining MSE with a cubic penalty term to force sharper landmark heatmaps.

He also used ROI-guided inference with uterine segmentation masks to reduce background noise.

Reported results include 4.52 mm overall mean error across 192 landmarks and 32 test cases, 2.90 mm best landmark precision for Cavity Cervix, 3.66 mm median localization error, and under 60 second end-to-end reporting.

This thesis is strong because it connects medical imaging, segmentation, landmark detection, preprocessing across heterogeneous protocols, custom loss design, and real-time reporting.
