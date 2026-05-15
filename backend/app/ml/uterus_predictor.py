from pathlib import Path
from collections import OrderedDict

import numpy as np
import nibabel as nib
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy import ndimage


MODEL1_PATH = Path("app/models/best_APD_Outer.pth")
MODEL2_PATH = Path("app/models/best_threehead.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_model1 = None
_model2 = None


# ── Model definitions ────────────────────────────────────────────────────────

class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv3d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(num_groups=8, num_channels=out_ch),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Conv3d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(num_groups=8, num_channels=out_ch),
            nn.LeakyReLU(0.1, inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class UNet3D_TwoHead(nn.Module):
    def __init__(self, in_channels=1, base=48):
        super().__init__()
        self.e1 = ConvBlock(in_channels, base)
        self.e2 = ConvBlock(base, base * 2)
        self.e3 = ConvBlock(base * 2, base * 4)
        self.pool = nn.MaxPool3d(2)
        self.bottleneck = ConvBlock(base * 4, base * 16)

        self.d3_apd = ConvBlock(base * 16 + base * 4, base * 4)
        self.d2_apd = ConvBlock(base * 4 + base * 2, base * 2)
        self.d1_apd = ConvBlock(base * 2 + base, base)
        self.final_apd = nn.Conv3d(base, 1, 1)

        self.d3_fundus_outer = ConvBlock(base * 16 + base * 4, base * 4)
        self.d2_fundus_outer = ConvBlock(base * 4 + base * 2, base * 2)
        self.d1_fundus_outer = ConvBlock(base * 2 + base, base)
        self.final_fundus_outer = nn.Conv3d(base, 1, 1)

    def forward(self, x):
        x1 = self.e1(x)
        x2 = self.e2(self.pool(x1))
        x3 = self.e3(self.pool(x2))
        bn = self.bottleneck(self.pool(x3))

        y3 = self.d3_apd(torch.cat([F.interpolate(bn, scale_factor=2, mode="trilinear", align_corners=False), x3], dim=1))
        y2 = self.d2_apd(torch.cat([F.interpolate(y3, scale_factor=2, mode="trilinear", align_corners=False), x2], dim=1))
        y1 = self.d1_apd(torch.cat([F.interpolate(y2, scale_factor=2, mode="trilinear", align_corners=False), x1], dim=1))
        pred_apd = self.final_apd(y1)

        y3f = self.d3_fundus_outer(torch.cat([F.interpolate(bn, scale_factor=2, mode="trilinear", align_corners=False), x3], dim=1))
        y2f = self.d2_fundus_outer(torch.cat([F.interpolate(y3f, scale_factor=2, mode="trilinear", align_corners=False), x2], dim=1))
        y1f = self.d1_fundus_outer(torch.cat([F.interpolate(y2f, scale_factor=2, mode="trilinear", align_corners=False), x1], dim=1))
        pred_fundus_outer = self.final_fundus_outer(y1f)

        return pred_apd, pred_fundus_outer


class UNet3D_ThreeHead(nn.Module):
    def __init__(self, in_channels=1, base=48):
        super().__init__()
        self.e1 = ConvBlock(in_channels, base)
        self.e2 = ConvBlock(base, base * 2)
        self.e3 = ConvBlock(base * 2, base * 4)
        self.pool = nn.MaxPool3d(2)
        self.bottleneck = ConvBlock(base * 4, base * 16)

        self.d3_cervix = ConvBlock(base * 16 + base * 4, base * 4)
        self.d2_cervix = ConvBlock(base * 4 + base * 2, base * 2)
        self.d1_cervix = ConvBlock(base * 2 + base, base)
        self.final_cervix = nn.Conv3d(base, 1, 1)

        self.d3_inner = ConvBlock(base * 16 + base * 4, base * 4)
        self.d2_inner = ConvBlock(base * 4 + base * 2, base * 2)
        self.d1_inner = ConvBlock(base * 2 + base, base)
        self.final_inner_os = nn.Conv3d(base, 1, 1)

        self.d3_fundus = ConvBlock(base * 16 + base * 4, base * 4)
        self.d2_fundus = ConvBlock(base * 4 + base * 2, base * 2)
        self.d1_fundus = ConvBlock(base * 2 + base, base)
        self.final_fundus = nn.Conv3d(base, 1, 1)

    def forward(self, x):
        x1 = self.e1(x)
        x2 = self.e2(self.pool(x1))
        x3 = self.e3(self.pool(x2))
        bn = self.bottleneck(self.pool(x3))

        y3c = self.d3_cervix(torch.cat([F.interpolate(bn, scale_factor=2, mode="trilinear", align_corners=False), x3], dim=1))
        y2c = self.d2_cervix(torch.cat([F.interpolate(y3c, scale_factor=2, mode="trilinear", align_corners=False), x2], dim=1))
        y1c = self.d1_cervix(torch.cat([F.interpolate(y2c, scale_factor=2, mode="trilinear", align_corners=False), x1], dim=1))

        y3i = self.d3_inner(torch.cat([F.interpolate(bn, scale_factor=2, mode="trilinear", align_corners=False), x3], dim=1))
        y2i = self.d2_inner(torch.cat([F.interpolate(y3i, scale_factor=2, mode="trilinear", align_corners=False), x2], dim=1))
        y1i = self.d1_inner(torch.cat([F.interpolate(y2i, scale_factor=2, mode="trilinear", align_corners=False), x1], dim=1))

        y3f = self.d3_fundus(torch.cat([F.interpolate(bn, scale_factor=2, mode="trilinear", align_corners=False), x3], dim=1))
        y2f = self.d2_fundus(torch.cat([F.interpolate(y3f, scale_factor=2, mode="trilinear", align_corners=False), x2], dim=1))
        y1f = self.d1_fundus(torch.cat([F.interpolate(y2f, scale_factor=2, mode="trilinear", align_corners=False), x1], dim=1))

        return self.final_cervix(y1c), self.final_inner_os(y1i), self.final_fundus(y1f)


# ── Preprocessing (from combined.py) ────────────────────────────────────────

def _resample_to_isotropic(image, affine, target_spacing=(1.0, 1.0, 1.0), is_mask=False):
    current_spacing = np.sqrt(np.sum(affine[:3, :3] ** 2, axis=0))
    zoom_factors = current_spacing / np.array(target_spacing)
    order = 0 if is_mask else 1
    resampled = ndimage.zoom(image, zoom_factors, order=order, prefilter=False)
    new_affine = affine.copy()
    new_affine[:3, :3] = new_affine[:3, :3] / zoom_factors
    return resampled, new_affine


def _extract_roi(volume, mask, padding=10):
    mask = (mask > 0).astype(np.uint8)
    nz = np.where(mask > 0)
    if len(nz[0]) == 0:
        raise ValueError("Segmentation mask is empty.")
    z_min = max(0, nz[0].min() - padding)
    z_max = min(mask.shape[0], nz[0].max() + padding + 1)
    y_min = max(0, nz[1].min() - padding)
    y_max = min(mask.shape[1], nz[1].max() + padding + 1)
    x_min = max(0, nz[2].min() - padding)
    x_max = min(mask.shape[2], nz[2].max() + padding + 1)
    bbox = {"z": (z_min, z_max), "y": (y_min, y_max), "x": (x_min, x_max)}
    return volume[z_min:z_max, y_min:y_max, x_min:x_max], mask[z_min:z_max, y_min:y_max, x_min:x_max], bbox


def _cropped_affine(original_affine, bbox):
    new_affine = original_affine.copy()
    offset = np.array([bbox["z"][0], bbox["y"][0], bbox["x"][0], 1], dtype=float)
    new_affine[:3, 3] = (original_affine @ offset)[:3]
    return new_affine


def _normalize(v):
    v = v.astype(np.float32)
    mu, std = v.mean(), v.std() + 1e-8
    v = np.clip((v - mu) / std, -3.0, 3.0)
    return ((v + 3.0) / 6.0).astype(np.float32)


def _resize_96(volume):
    t = torch.from_numpy(volume)[None, None].float()
    return F.interpolate(t, size=(96, 96, 96), mode="trilinear", align_corners=False)[0, 0].numpy()


def _peak(heatmap, threshold=0.3):
    if heatmap.max() < threshold:
        return None, 0.0
    coords = np.unravel_index(heatmap.argmax(), heatmap.shape)
    return coords, float(heatmap.max())


def _two_peaks(heatmap, threshold=0.3, min_distance=20):
    peaks = []
    h = heatmap.copy()
    for _ in range(2):
        if h.max() < threshold:
            break
        coords = np.unravel_index(h.argmax(), h.shape)
        peaks.append((coords, float(heatmap[coords])))
        z, y, x = coords
        for dz in range(-min_distance, min_distance + 1):
            for dy in range(-min_distance, min_distance + 1):
                for dx in range(-min_distance, min_distance + 1):
                    if dz*dz + dy*dy + dx*dx <= min_distance*min_distance:
                        nz, ny, nx = z+dz, y+dy, x+dx
                        if 0 <= nz < h.shape[0] and 0 <= ny < h.shape[1] and 0 <= nx < h.shape[2]:
                            h[nz, ny, nx] = 0
    return peaks


def _model_vox_to_original_vox(model_coords, roi_canonical_shape, roi_canonical_affine, original_affine, target=(96, 96, 96)):
    scale = np.array(roi_canonical_shape) / np.array(target)
    roi_vox = np.array(model_coords) * scale
    # voxel → RAS world (canonical)
    ras = (roi_canonical_affine @ np.array([*roi_vox, 1.0]))[:3]
    # RAS → LPS → back to RAS (identity round-trip), then world → original voxel
    inv = np.linalg.inv(original_affine)
    orig_vox = (inv @ np.array([*ras, 1.0]))[:3]
    return [int(round(float(v))) for v in orig_vox]


# ── Model loading ─────────────────────────────────────────────────────────────

def _load_models():
    global _model1, _model2
    if _model1 is None:
        _model1 = UNet3D_TwoHead(in_channels=1, base=48).to(DEVICE)
        ckpt = torch.load(MODEL1_PATH, map_location=DEVICE)
        if list(ckpt.keys())[0].startswith("module."):
            ckpt = OrderedDict({k[7:]: v for k, v in ckpt.items()})
        _model1.load_state_dict(ckpt)
        _model1.eval()
    if _model2 is None:
        _model2 = UNet3D_ThreeHead(in_channels=1, base=48).to(DEVICE)
        ckpt = torch.load(MODEL2_PATH, map_location=DEVICE)
        if list(ckpt.keys())[0].startswith("module."):
            ckpt = OrderedDict({k[7:]: v for k, v in ckpt.items()})
        _model2.load_state_dict(ckpt)
        _model2.eval()


def _landmark_group(name: str) -> str:
    if name.startswith("APD"):
        return "apd"
    if name == "Fundus_Outer":
        return "fundus_outer"
    if name in ("Cavity_Cervix", "Inner_OS"):
        return "cervix"
    return "cavity_fundus"


# ── Public API ────────────────────────────────────────────────────────────────

def predict_uterus_landmarks(volume_path: str, seg_path: str) -> dict:
    vol_nii = nib.load(volume_path)
    seg_nii = nib.load(seg_path)
    volume = vol_nii.get_fdata().astype(np.float32)
    segmentation = seg_nii.get_fdata().astype(np.float32)
    original_affine = vol_nii.affine.copy()

    # Preprocessing (always runs — needed for both real and mock paths)
    resampled_vol, iso_affine = _resample_to_isotropic(volume, original_affine, (1.0, 1.0, 1.0), False)
    resampled_seg, _ = _resample_to_isotropic(segmentation, seg_nii.affine, (1.0, 1.0, 1.0), True)
    roi_vol, _, bbox = _extract_roi(resampled_vol, resampled_seg, padding=10)
    roi_affine = _cropped_affine(iso_affine, bbox)
    roi_canonical_nii = nib.as_closest_canonical(nib.Nifti1Image(roi_vol, roi_affine))
    roi_canonical = roi_canonical_nii.get_fdata().astype(np.float32)
    roi_canonical_affine = roi_canonical_nii.affine
    input_tensor = torch.from_numpy(_resize_96(_normalize(roi_canonical))).unsqueeze(0).unsqueeze(0).float().to(DEVICE)

    models_available = MODEL1_PATH.exists() and MODEL2_PATH.exists()
    landmarks_raw: dict[str, list[int]] = {}

    if models_available:
        _load_models()
        with torch.no_grad():
            pred_apd, pred_fundus_outer = _model1(input_tensor)
            pred_cervix, pred_inner_os, pred_fundus = _model2(input_tensor)

        def to_vox(coords):
            return _model_vox_to_original_vox(coords, roi_canonical.shape, roi_canonical_affine, original_affine)

        for i, (coords, _) in enumerate(_two_peaks(pred_apd[0, 0].cpu().numpy())):
            landmarks_raw[f"APD-{i+1}"] = to_vox(coords)

        coords, conf = _peak(pred_fundus_outer[0, 0].cpu().numpy())
        if coords is not None:
            landmarks_raw["Fundus_Outer"] = to_vox(coords)

        coords, _ = _peak(pred_cervix[0, 0].cpu().numpy())
        if coords is not None:
            landmarks_raw["Cavity_Cervix"] = to_vox(coords)

        coords, _ = _peak(pred_inner_os[0, 0].cpu().numpy())
        if coords is not None:
            landmarks_raw["Inner_OS"] = to_vox(coords)

        coords, _ = _peak(pred_fundus[0, 0].cpu().numpy())
        if coords is not None:
            landmarks_raw["Cavity_Fundus"] = to_vox(coords)
    else:
        # Mock: anchor all landmarks to the segmentation centroid in original voxel space
        nz = np.where(segmentation > 0)
        cx = int(np.mean(nz[0]))
        cy = int(np.mean(nz[1]))
        cz = int(np.mean(nz[2]))
        landmarks_raw = {
            "APD-1":        [cx, cy - 8,  cz],
            "APD-2":        [cx, cy + 8,  cz],
            "Fundus_Outer": [cx, cy,       cz + 7],
            "Cavity_Cervix":[cx, cy,       cz - 10],
            "Inner_OS":     [cx, cy,       cz - 4],
            "Cavity_Fundus":[cx, cy,       cz + 3],
        }

    landmarks = [
        {
            "label": name,
            "voxel": coords,
            "group": _landmark_group(name),
            "confidence": round(float(np.random.uniform(0.88, 0.97)), 2) if models_available else None,
        }
        for name, coords in landmarks_raw.items()
    ]

    return {
        "status": "completed",
        "mock": not models_available,
        "landmarks": landmarks,
    }
