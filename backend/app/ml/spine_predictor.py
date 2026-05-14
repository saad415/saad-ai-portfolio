from pathlib import Path

import nibabel as nib
import numpy as np
import torch
from scipy import ndimage

from app.ml.inference_S1 import (
    MultiTaskFullVolumeInference,
    detect_if_preprocessing_needed,
    preprocess_volume_for_inference,
    enhanced_s1_anchored_vertebrae_detection,
)

MODEL_PATH = Path("app/models/best_multitask_model.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

inference_engine = None


def get_inference_engine():
    global inference_engine

    if inference_engine is None:
        print("Loading spine model...")

        inference_engine = MultiTaskFullVolumeInference(
            model_path=str(MODEL_PATH),
            patch_size=(96, 96, 96),
            overlap=0.5,
            device=DEVICE,
            silent=True,
        )

        print("Model loaded successfully.")

    return inference_engine


def predict_spine_landmarks(nifti_path: str) -> dict:
    engine = get_inference_engine()

    volume_nii = nib.load(nifti_path)
    original_volume = volume_nii.get_fdata().astype(np.float32)
    original_affine = volume_nii.affine.copy()

    inference_volume = original_volume.copy()
    inference_affine = original_affine.copy()

    preprocessing_applied = detect_if_preprocessing_needed(
        inference_volume,
        silent=True,
    )

    if preprocessing_applied:
        inference_volume, inference_affine = preprocess_volume_for_inference(
            inference_volume,
            original_affine,
            intensity_method="minmax",
            target_spacing=(1.0, 1.0, 1.0),
            silent=True,
        )

    vertebrae_heatmap, s1_heatmap = engine.infer_volume(
        inference_volume,
        batch_size=8,
    )

    if not np.array_equal(inference_volume.shape, original_volume.shape):
        zoom_factors = np.array(original_volume.shape) / np.array(
            inference_volume.shape
        )

        vertebrae_heatmap = ndimage.zoom(
            vertebrae_heatmap,
            zoom_factors,
            order=1,
            prefilter=False,
        )

        s1_heatmap = ndimage.zoom(
            s1_heatmap,
            zoom_factors,
            order=1,
            prefilter=False,
        )

    labeled_vertebrae, s1_present, s1_location, detection_summary = (
        enhanced_s1_anchored_vertebrae_detection(
            vertebrae_heatmap,
            s1_heatmap,
            original_affine,
            min_distance=15,
            base_threshold=0.2,
            s1_threshold=0.15,
            enhanced_filtering=True,
            silent=True,
        )
    )

    landmarks = []

    for item in labeled_vertebrae:
        coord = item["coordinate"]

        landmarks.append(
            {
                "label": item.get("label", "unknown"),
                "voxel": [
                    int(coord[0]),
                    int(coord[1]),
                    int(coord[2]),
                ],
                "confidence": float(item.get("intensity", 0.0)),
                "type": item.get("type", "unknown"),
                "region": item.get("region", "unknown"),
            }
        )

    return {
        "status": "completed",
        "filename": Path(nifti_path).name,
        "s1Detected": bool(s1_present),
        "landmarks": landmarks,
        
    }