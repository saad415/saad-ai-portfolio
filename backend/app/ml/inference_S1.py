#!/usr/bin/env python3
"""
Enhanced S1-Anchored Multi-Task Vertebrae Inference with Aggressive Outlier Filtering
Updated to eliminate distant outliers that cause incorrect labeling sequences.
"""

# Core Python libraries
import torch
import torch.nn as nn
import nibabel as nib
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import os
import argparse
from scipy import ndimage
import warnings
from sklearn.decomposition import PCA
from sklearn.linear_model import RANSACRegressor
from sklearn.cluster import DBSCAN
from scipy.spatial.distance import pdist
from matplotlib.colors import LinearSegmentedColormap

# Matplotlib configuration
warnings.filterwarnings("ignore", category=UserWarning, module="matplotlib")
warnings.filterwarnings("ignore")


class MultiTaskLightweight3DUNet(nn.Module):
    """Multi-task 3D U-Net architecture for vertebrae and S1 detection."""
    
    def __init__(self, in_channels=1, out_channels=1, base_features=8):
        super(MultiTaskLightweight3DUNet, self).__init__()
        
        # Shared Encoder
        self.enc1 = self.conv_block(in_channels, base_features)
        self.enc2 = self.conv_block(base_features, base_features * 2)
        self.enc3 = self.conv_block(base_features * 2, base_features * 4)
        
        # Bottleneck
        self.bottleneck = self.conv_block(base_features * 4, base_features * 8)
        
        # Shared Decoder layers
        self.up3 = nn.ConvTranspose3d(base_features * 8, base_features * 4, 2, stride=2)
        self.dec3 = self.conv_block(base_features * 8, base_features * 4)
        
        self.up2 = nn.ConvTranspose3d(base_features * 4, base_features * 2, 2, stride=2)
        self.dec2 = self.conv_block(base_features * 4, base_features * 2)
        
        self.up1 = nn.ConvTranspose3d(base_features * 2, base_features, 2, stride=2)
        self.dec1 = self.conv_block(base_features * 2, base_features)
        
        # Task-specific heads
        self.vertebrae_head = nn.Conv3d(base_features, out_channels, 1)
        self.s1_head = nn.Conv3d(base_features, out_channels, 1)
        
        # Pooling
        self.pool = nn.MaxPool3d(2)
        
    def conv_block(self, in_channels, out_channels):
        """Lightweight conv block with fewer parameters."""
        return nn.Sequential(
            nn.Conv3d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm3d(out_channels),
            nn.ReLU(inplace=True),
        )
    
    def forward(self, x):
        # Shared Encoder
        enc1 = self.enc1(x)
        enc2 = self.enc2(self.pool(enc1))
        enc3 = self.enc3(self.pool(enc2))
        
        # Bottleneck
        bottleneck = self.bottleneck(self.pool(enc3))
        
        # Shared Decoder
        up3 = self.up3(bottleneck)
        up3 = self.match_size(up3, enc3)
        dec3 = self.dec3(torch.cat([up3, enc3], dim=1))
        
        up2 = self.up2(dec3)
        up2 = self.match_size(up2, enc2)
        dec2 = self.dec2(torch.cat([up2, enc2], dim=1))
        
        up1 = self.up1(dec2)
        up1 = self.match_size(up1, enc1)
        dec1 = self.dec1(torch.cat([up1, enc1], dim=1))
        
        # Task-specific outputs
        vertebrae_output = self.vertebrae_head(dec1)
        s1_output = self.s1_head(dec1)
        
        return {
            'vertebrae': vertebrae_output,
            's1': s1_output
        }
    
    def match_size(self, up_tensor, skip_tensor):
        """Match tensor sizes for concatenation."""
        up_size = up_tensor.shape[2:]
        skip_size = skip_tensor.shape[2:]
        
        pad_d = skip_size[0] - up_size[0]
        pad_h = skip_size[1] - up_size[1] 
        pad_w = skip_size[2] - up_size[2]
        
        if pad_d != 0 or pad_h != 0 or pad_w != 0:
            padding = (0, pad_w, 0, pad_h, 0, pad_d)
            up_tensor = nn.functional.pad(up_tensor, padding, mode='replicate')
        
        return up_tensor


class MultiTaskFullVolumeInference:
    """Full-volume inference using multi-task patch-based model."""
    
    def __init__(self, model_path, patch_size=(64, 64, 64), overlap=0.5, device='cuda', silent=False):
        self.patch_size = patch_size
        self.overlap = overlap
        self.device = device
        self.silent = silent
        
        # Calculate stride based on overlap
        self.stride = tuple(int(ps * (1 - overlap)) for ps in patch_size)
        
        # Load trained multi-task model
        self.model = MultiTaskLightweight3DUNet(in_channels=1, out_channels=1, base_features=8)
        checkpoint = torch.load(model_path, map_location=device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(device)
        self.model.eval()
        
        if not self.silent:
            print(f"Multi-task model loaded from: {model_path}")
            print(f"Patch size: {patch_size}, Overlap: {overlap}, Stride: {self.stride}")
        
    def extract_patches(self, volume):
        """Extract overlapping patches from volume."""
        vd, vh, vw = volume.shape
        pd, ph, pw = self.patch_size
        sd, sh, sw = self.stride
        
        patches = []
        patch_positions = []
        
        # Calculate patch positions
        d_positions = list(range(0, max(1, vd - pd + 1), sd))
        h_positions = list(range(0, max(1, vh - ph + 1), sh))
        w_positions = list(range(0, max(1, vw - pw + 1), sw))
        
        # Ensure we cover the entire volume
        if d_positions[-1] + pd < vd:
            d_positions.append(vd - pd)
        if h_positions[-1] + ph < vh:
            h_positions.append(vh - ph)
        if w_positions[-1] + pw < vw:
            w_positions.append(vw - pw)
        
        for d_start in d_positions:
            for h_start in h_positions:
                for w_start in w_positions:
                    d_end = min(d_start + pd, vd)
                    h_end = min(h_start + ph, vh)
                    w_end = min(w_start + pw, vw)
                    
                    patch = volume[d_start:d_end, h_start:h_end, w_start:w_end]
                    
                    if patch.shape != self.patch_size:
                        pad_d = pd - patch.shape[0]
                        pad_h = ph - patch.shape[1]
                        pad_w = pw - patch.shape[2]
                        
                        patch = np.pad(patch, 
                                     ((0, pad_d), (0, pad_h), (0, pad_w)), 
                                     mode='constant', constant_values=0)
                    
                    patches.append(patch)
                    patch_positions.append((d_start, h_start, w_start, d_end, h_end, w_end))
        
        return patches, patch_positions
    
    def predict_patches(self, patches, batch_size=8, progress_callback=None):
        """Run inference on patches in batches."""
        vertebrae_predictions = []
        s1_predictions = []
        total_batches = max(1, (len(patches) + batch_size - 1) // batch_size)
        
        with torch.no_grad():
            for batch_index, i in enumerate(range(0, len(patches), batch_size)):
                batch_patches = patches[i:i+batch_size]
                
                batch_tensor = torch.stack([
                    torch.from_numpy(patch).unsqueeze(0) for patch in batch_patches
                ]).to(self.device)
                
                batch_outputs = self.model(batch_tensor)
                batch_vertebrae = batch_outputs['vertebrae']
                batch_s1 = batch_outputs['s1']
                
                for j in range(batch_vertebrae.shape[0]):
                    vertebrae_pred = batch_vertebrae[j, 0].cpu().numpy()
                    s1_pred = batch_s1[j, 0].cpu().numpy()
                    
                    vertebrae_predictions.append(vertebrae_pred)
                    s1_predictions.append(s1_pred)

                if progress_callback:
                    progress_callback((batch_index + 1) / total_batches)
        
        return vertebrae_predictions, s1_predictions
    
    def combine_patches(self, predictions, patch_positions, volume_shape):
        """Combine overlapping patch predictions into full volume."""
        combined_heatmap = np.zeros(volume_shape, dtype=np.float32)
        weight_map = np.zeros(volume_shape, dtype=np.float32)
        
        gaussian_weight = self.create_gaussian_weight(self.patch_size)
        
        for pred, (d_start, h_start, w_start, d_end, h_end, w_end) in zip(predictions, patch_positions):
            actual_d = d_end - d_start
            actual_h = h_end - h_start
            actual_w = w_end - w_start
            
            pred_part = pred[:actual_d, :actual_h, :actual_w]
            weight_part = gaussian_weight[:actual_d, :actual_h, :actual_w]
            
            combined_heatmap[d_start:d_end, h_start:h_end, w_start:w_end] += pred_part * weight_part
            weight_map[d_start:d_end, h_start:h_end, w_start:w_end] += weight_part
        
        weight_map[weight_map == 0] = 1
        combined_heatmap = combined_heatmap / weight_map
        
        return combined_heatmap
    
    def create_gaussian_weight(self, patch_size):
        """Create Gaussian weight map for smooth patch blending."""
        pd, ph, pw = patch_size
        
        d_weight = np.exp(-0.5 * ((np.arange(pd) - pd//2) / (pd//6))**2)
        h_weight = np.exp(-0.5 * ((np.arange(ph) - ph//2) / (ph//6))**2)
        w_weight = np.exp(-0.5 * ((np.arange(pw) - pw//2) / (pw//6))**2)
        
        weight_3d = np.outer(np.outer(d_weight, h_weight).flatten(), w_weight).reshape(pd, ph, pw)
        
        return weight_3d.astype(np.float32)
    
    def infer_volume(self, volume, batch_size=8, progress_callback=None):
        """Perform full inference on a volume."""
        patches, positions = self.extract_patches(volume)
        if progress_callback:
            progress_callback(0.0)

        vertebrae_predictions, s1_predictions = self.predict_patches(
            patches,
            batch_size,
            progress_callback=progress_callback,
        )
        
        combined_vertebrae = self.combine_patches(vertebrae_predictions, positions, volume.shape)
        combined_s1 = self.combine_patches(s1_predictions, positions, volume.shape)
        
        return combined_vertebrae, combined_s1


def preprocess_volume_for_inference(volume, affine, intensity_method='minmax', target_spacing=(1.0, 1.0, 1.0), silent=False):
    """Apply preprocessing used during training."""
    # Intensity normalization
    if intensity_method == 'minmax':
        min_val = np.min(volume)
        max_val = np.max(volume)
        if max_val > min_val:
            normalized_volume = (volume - min_val) / (max_val - min_val)
        else:
            normalized_volume = volume
    elif intensity_method == 'zscore':
        mean_val = np.mean(volume)
        std_val = np.std(volume)
        if std_val > 0:
            normalized_volume = (volume - mean_val) / std_val
        else:
            normalized_volume = volume - mean_val
    else:
        normalized_volume = volume
    
    normalized_volume = normalized_volume.astype(np.float32)
    
    # Resampling to isotropic spacing
    current_spacing = np.sqrt(np.sum(affine[:3, :3] ** 2, axis=0))
    zoom_factors = current_spacing / np.array(target_spacing)
    
    resampled_volume = ndimage.zoom(normalized_volume, zoom_factors, order=1, prefilter=False)
    
    new_affine = affine.copy()
    new_affine[:3, :3] = new_affine[:3, :3] / zoom_factors
    
    return resampled_volume, new_affine


def detect_if_preprocessing_needed(volume, silent=False):
    """Detect if volume needs preprocessing."""
    vol_min, vol_max = volume.min(), volume.max()
    
    if 0 <= vol_min and vol_max <= 1.1 and (vol_max - vol_min) > 0.5:
        return False
    
    if vol_max - vol_min > 10 or vol_min < -10:
        return True
    
    return True


def find_vertebrae_peaks(heatmap, min_distance=10, threshold=0.1, silent=False):
    """Find vertebrae locations as peaks in the heatmap."""
    from scipy.ndimage import maximum_filter
    
    thresholded = heatmap > threshold
    
    if not np.any(thresholded):
        return []
    
    local_maxima = (heatmap == maximum_filter(heatmap, size=min_distance)) & thresholded
    peak_coords = np.where(local_maxima)
    peak_values = heatmap[peak_coords]
    
    sort_idx = np.argsort(peak_values)[::-1]
    
    vertebrae_peaks = []
    for i in sort_idx:
        coord = (peak_coords[0][i], peak_coords[1][i], peak_coords[2][i])
        value = peak_values[i]
        vertebrae_peaks.append({
            'coordinate': coord,
            'intensity': value
        })
    
    return vertebrae_peaks


def detect_s1_presence_and_location(s1_heatmap, threshold=0.15, silent=False):
    """Detect if S1 is present and find its location."""
    max_s1_intensity = s1_heatmap.max()
    s1_present = max_s1_intensity > threshold
    
    if s1_present:
        max_coord = np.unravel_index(s1_heatmap.argmax(), s1_heatmap.shape)
        s1_location = {
            'coordinate': max_coord,
            'intensity': max_s1_intensity
        }
        return True, s1_location
    else:
        return False, None


class EnhancedS1AnchoredSpineDetector:
    """Enhanced S1-Anchored spine detection with aggressive outlier filtering."""
    
    def __init__(self, silent=False):
        self.silent = silent
        self.spine_axis = None
        self.spine_model = None
        self.s1_location = None
        
    def detect_and_label_vertebrae(self, vertebrae_peaks, s1_location, s1_present, affine):
        """Main function for enhanced S1-anchored vertebrae detection and labeling."""
        
        if not self.silent:
            print(f"🎯 Enhanced S1-Anchored Detection: Starting with {len(vertebrae_peaks)} vertebrae")
            s1_status = "DETECTED" if s1_present else "NOT DETECTED"
            print(f"   S1 Reference: {s1_status}")
        
        if len(vertebrae_peaks) < 2:
            return self._fallback_labeling(vertebrae_peaks, s1_location, s1_present, affine)
        
        self.s1_location = s1_location
        
        # Enhanced Step 1: Comprehensive outlier filtering
        filtered_peaks = self._enhanced_outlier_filtering(vertebrae_peaks, s1_location, s1_present, affine)
        
        if len(filtered_peaks) < 2:
            return self._fallback_labeling(filtered_peaks, s1_location, s1_present, affine)
        
        # Step 2: RANSAC spine-axis fitting (on filtered data)
        spine_filtered_peaks = self._ransac_spine_axis_fitting(filtered_peaks, affine)
        
        if len(spine_filtered_peaks) < 2:
            return self._fallback_labeling(spine_filtered_peaks, s1_location, s1_present, affine)
        
        # Step 3: S1-anchored splitting
        if s1_present and s1_location:
            superior_peaks, inferior_peaks = self._s1_anchored_split(spine_filtered_peaks, s1_location, affine)
        else:
            superior_peaks, inferior_peaks = self._geometric_split(spine_filtered_peaks, affine)
        
        # Step 4: Final labeling with S1 anchor
        labeled_vertebrae = self._s1_anchored_labeling(
            superior_peaks, inferior_peaks, s1_location, s1_present, affine
        )
        
        if not self.silent:
            print(f"✅ Final result: {len(labeled_vertebrae)} labeled vertebrae")
            if labeled_vertebrae:
                labels = [v['label'] for v in labeled_vertebrae]
                print(f"   Labels: {', '.join(labels)}")
        
        return labeled_vertebrae
    
    # STEP 2: Update your existing _z_slice_constraint_filtering method with this enhanced version:
    
    def _z_slice_constraint_filtering(self, vertebrae_peaks, max_z_deviation=3):
        """Stage 5: Filter vertebrae that are more than max_z_deviation slices away from mean Z."""
        
        if len(vertebrae_peaks) < 2:
            return vertebrae_peaks
            
        if not self.silent:
            print(f"   Stage 5: Z-slice constraint filtering (max deviation: {max_z_deviation} slices)")
        
        # Extract Z coordinates (assuming Z is axis 2)
        z_coords = np.array([peak['coordinate'][2] for peak in vertebrae_peaks])
        
        # Calculate mean Z coordinate
        mean_z = np.mean(z_coords)
        
        # Calculate absolute deviations from mean
        z_deviations = np.abs(z_coords - mean_z)
        
        # Filter vertebrae within the Z-slice constraint
        z_mask = z_deviations <= max_z_deviation
        filtered_peaks = [peak for i, peak in enumerate(vertebrae_peaks) if z_mask[i]]
        
        # Report filtering results
        outliers_removed = len(vertebrae_peaks) - len(filtered_peaks)
        if not self.silent:
            print(f"      Mean Z coordinate: {mean_z:.1f}")
            print(f"      Z deviation range: {z_deviations.min():.1f} - {z_deviations.max():.1f}")
            print(f"      Outliers removed: {outliers_removed}")
            
            # Show detailed Z-coordinate analysis
            if len(vertebrae_peaks) > 0:
                print(f"      Z-coordinate analysis:")
                for i, (peak, deviation) in enumerate(zip(vertebrae_peaks, z_deviations)):
                    coord = peak['coordinate']
                    status = "✅ KEPT" if z_mask[i] else "❌ REMOVED"
                    peak_id = peak.get('original_id', i+1)
                    print(f"        Peak {peak_id}: Z={coord[2]}, deviation={deviation:.1f} → {status}")
        
        return filtered_peaks
    
    
    def _enhanced_outlier_filtering(self, vertebrae_peaks, s1_location, s1_present, affine):
        """Enhanced multi-stage outlier filtering to eliminate distant misclassifications."""
        
        if len(vertebrae_peaks) < 2:
            return vertebrae_peaks
            
        if not self.silent:
            print(f"\n🔍 Enhanced Outlier Filtering: {len(vertebrae_peaks)} initial peaks")
            
            # ADD THIS BLOCK:
            print(f"   📍 Initial peak coordinates:")
            for i, peak in enumerate(vertebrae_peaks):
                coord = peak['coordinate']
                intensity = peak['intensity']
                print(f"      Peak {i+1}: [{coord[0]}, {coord[1]}, {coord[2]}] (intensity: {intensity:.4f})")
        
        # Stage 1: Clustering-based filtering
        clustered_peaks = self._clustering_based_filtering(vertebrae_peaks)

        s1_filtered_peaks = clustered_peaks
            
        # Stage 3: Spine continuity filtering
        continuity_filtered_peaks = self._spine_continuity_filtering(s1_filtered_peaks, affine)
        
        # Stage 4: Anatomical constraint filtering
        #anatomical_filtered_peaks = self._anatomical_constraint_filtering(continuity_filtered_peaks, s1_location, s1_present, affine)
        
        # Stage 5: Z-slice constraint filtering
        final_peaks = self._z_slice_constraint_filtering(continuity_filtered_peaks, max_z_deviation=3)
        
        removed_count = len(vertebrae_peaks) - len(final_peaks)
        if not self.silent:
            print(f"✅ Outlier filtering complete: {removed_count} outliers removed")
            print(f"   Final vertebrae count: {len(final_peaks)}")
            
            # Log final peak coordinates for comparison
            if len(final_peaks) > 0:
                print(f"   Final peak coordinates:")
                for i, peak in enumerate(final_peaks):
                    coord = peak['coordinate']
                    intensity = peak['intensity']
                    print(f"      Peak {i+1}: [{coord[0]}, {coord[1]}, {coord[2]}] (intensity: {intensity:.4f})")
            
        return final_peaks
    
    def _clustering_based_filtering(self, vertebrae_peaks):
        """Stage 1: Use DBSCAN clustering to identify the main vertebrae cluster."""
        
        if len(vertebrae_peaks) < 3:
            return vertebrae_peaks
            
        if not self.silent:
            print(f"   Stage 1: Clustering-based filtering")
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        
        # Calculate adaptive epsilon based on data distribution
        distances = pdist(coords)
        median_distance = np.median(distances)
        eps = median_distance * 0.8  # 80% of median distance
        
        # Apply DBSCAN clustering
        clustering = DBSCAN(eps=eps, min_samples=2).fit(coords)
        labels = clustering.labels_
        
        # Find the largest cluster (main spine)
        unique_labels, counts = np.unique(labels[labels >= 0], return_counts=True)
        
        if len(unique_labels) == 0:
            return vertebrae_peaks
            
        largest_cluster_label = unique_labels[np.argmax(counts)]
        largest_cluster_size = np.max(counts)
        
        # Keep only vertebrae in the largest cluster
        cluster_mask = labels == largest_cluster_label
        clustered_peaks = [peak for i, peak in enumerate(vertebrae_peaks) if cluster_mask[i]]
        
        outliers_removed = len(vertebrae_peaks) - len(clustered_peaks)
        if not self.silent:
            print(f"      DBSCAN: eps={eps:.1f}, largest cluster size={largest_cluster_size}")
            print(f"      Outliers removed: {outliers_removed}")
            
        return clustered_peaks
    

    
    def _spine_continuity_filtering(self, vertebrae_peaks, affine):
        """Stage 3: Ensure spine continuity by removing vertebrae that break the sequence."""
        
        if len(vertebrae_peaks) < 3:
            return vertebrae_peaks
            
        if not self.silent:
            print(f"   Stage 3: Spine continuity filtering")
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        primary_axis, direction_sign, _ = self._get_anatomical_direction_from_affine(affine)
        
        # Sort vertebrae along spine axis
        spine_coords = coords[:, primary_axis]
        sort_indices = np.argsort(spine_coords)
        sorted_peaks = [vertebrae_peaks[i] for i in sort_indices]
        sorted_spine_coords = spine_coords[sort_indices]
        
        # Calculate gaps between consecutive vertebrae
        gaps = np.abs(np.diff(sorted_spine_coords))
        
        if len(gaps) == 0:
            return vertebrae_peaks
        
        # Adaptive gap threshold - more aggressive than before
        median_gap = np.median(gaps)
        q75_gap = np.percentile(gaps, 75)
        
        # Large gap threshold: more aggressive filtering
        large_gap_threshold = min(median_gap * 3.0, q75_gap * 2.0)
        
        # Find the largest contiguous segment
        large_gaps = gaps > large_gap_threshold
        
        if not np.any(large_gaps):
            return vertebrae_peaks
        
        # Find all segments separated by large gaps
        gap_positions = np.where(large_gaps)[0]
        segments = []
        start_idx = 0
        
        for gap_pos in gap_positions:
            if gap_pos >= start_idx:
                segments.append((start_idx, gap_pos))
            start_idx = gap_pos + 1
        
        # Add final segment
        if start_idx < len(sorted_peaks):
            segments.append((start_idx, len(sorted_peaks) - 1))
        
        # Select the segment with highest combined score (size + intensity quality)
        if segments:
            segment_scores = []
            for start, end in segments:
                segment_vertebrae = sorted_peaks[start:end+1]
                segment_size = end - start + 1
                total_intensity = sum(v['intensity'] for v in segment_vertebrae)
                mean_intensity = total_intensity / segment_size
                
                # Combined score: size + intensity quality
                score = segment_size * mean_intensity
                segment_scores.append(score)
            
            best_segment_idx = np.argmax(segment_scores)
            start, end = segments[best_segment_idx]
            
            filtered_peaks = sorted_peaks[start:end+1]
            
            removed = len(vertebrae_peaks) - len(filtered_peaks)
            if not self.silent:
                print(f"      Gap threshold: {large_gap_threshold:.1f}")
                print(f"      Segments found: {len(segments)}")
                print(f"      Best segment size: {len(filtered_peaks)}")
                print(f"      Outliers removed: {removed}")
        else:
            filtered_peaks = vertebrae_peaks
            
        return filtered_peaks
    
    def _anatomical_constraint_filtering(self, vertebrae_peaks, s1_location, s1_present, affine):
        """Stage 4: Apply anatomical constraints to filter unrealistic vertebrae."""
        
        if len(vertebrae_peaks) < 2:
            return vertebrae_peaks
            
        if not self.silent:
            print(f"   Stage 4: Anatomical constraint filtering")
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        primary_axis, direction_sign, _ = self._get_anatomical_direction_from_affine(affine)
        
        # Anatomical constraint 1: Reasonable span along spine axis
        spine_coords = coords[:, primary_axis]
        spine_span = np.ptp(spine_coords)
        
        # Typical lumbar-sacral span is 80-150mm
        max_reasonable_span = 200.0  # mm, generous limit
        
        if spine_span > max_reasonable_span:
            if not self.silent:
                print(f"      Warning: Spine span ({spine_span:.1f}mm) exceeds typical range")
            
            # Keep vertebrae within reasonable span around the median
            median_position = np.median(spine_coords)
            reasonable_range = max_reasonable_span / 2.0
            
            span_mask = np.abs(spine_coords - median_position) <= reasonable_range
            span_filtered_peaks = [peak for i, peak in enumerate(vertebrae_peaks) if span_mask[i]]
        else:
            span_filtered_peaks = vertebrae_peaks
        
        # Anatomical constraint 2: Reasonable number of vertebrae
        max_vertebrae = 8  # Reasonable for lumbar-sacral region
        
        if len(span_filtered_peaks) > max_vertebrae:
            if not self.silent:
                print(f"      Too many vertebrae ({len(span_filtered_peaks)}), keeping {max_vertebrae} best")
            
            # Keep the vertebrae with highest intensities
            intensities = [peak['intensity'] for peak in span_filtered_peaks]
            intensity_indices = np.argsort(intensities)[::-1]  # Highest first
            
            final_peaks = [span_filtered_peaks[i] for i in intensity_indices[:max_vertebrae]]
        else:
            final_peaks = span_filtered_peaks
        
        removed = len(vertebrae_peaks) - len(final_peaks)
        if not self.silent:
            print(f"      Outliers removed: {removed}")
            
        return final_peaks
    
    def _ransac_spine_axis_fitting(self, vertebrae_peaks, affine):
        """Simple spine validation that respects natural curvature (replaces RANSAC logic)."""
        
        if not self.silent:
            print(f"\n🔍 RANSAC spine-axis fitting")
        
        if len(vertebrae_peaks) < 2:
            return vertebrae_peaks
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        
        # Determine primary spine axis
        primary_axis, direction_sign, axis_name = self._get_anatomical_direction_from_affine(affine)
        coord_ranges = np.ptp(coords, axis=0)
        
        self.spine_axis = np.argmax(coord_ranges)
        
        if not self.silent:
            print(f"   Anatomical primary axis: {axis_name} (direction: {direction_sign:+.0f})")
            print(f"   Data-driven spine axis: axis {self.spine_axis} (range: {coord_ranges[self.spine_axis]:.1f})")
        
        # Simple validation: check for reasonable spacing along spine axis
        spine_coords = coords[:, self.spine_axis]
        
        # Sort vertebrae along spine axis
        sort_indices = np.argsort(spine_coords)
        sorted_coords = spine_coords[sort_indices]
        
        # Calculate gaps between consecutive vertebrae
        if len(sorted_coords) > 1:
            gaps = np.abs(np.diff(sorted_coords))
            mean_gap = np.mean(gaps)
            
            # Very lenient threshold - only remove if gap is extremely large
            max_reasonable_gap = mean_gap * 8.0  # Much more lenient than original RANSAC
            
            if not self.silent:
                print(f"   Average gap between vertebrae: {mean_gap:.1f}")
                print(f"   Maximum allowed gap: {max_reasonable_gap:.1f}")
            
            # Only remove vertebrae with extremely large gaps (rare edge cases)
            keep_mask = np.ones(len(vertebrae_peaks), dtype=bool)
            
            for i in range(len(gaps)):
                if gaps[i] > max_reasonable_gap:
                    # Mark the more distant vertebra for removal
                    keep_mask[sort_indices[i+1]] = False
            
            filtered_peaks = [peak for i, peak in enumerate(vertebrae_peaks) if keep_mask[i]]
            
            outliers_removed = len(vertebrae_peaks) - len(filtered_peaks)
            if not self.silent:
                print(f"   ✅ Simple validation complete")
                print(f"   📊 Outliers removed: {outliers_removed}")
                
            return filtered_peaks
        
        else:
            if not self.silent:
                print(f"   ✅ Simple validation complete")
                print(f"   📊 Outliers removed: 0")
            return vertebrae_peaks
    
    def _s1_anchored_split(self, vertebrae_peaks, s1_location, affine):
        """Split vertebrae into superior and inferior groups using S1 anchor."""
        
        if not self.silent:
            print(f"\n🔗 S1-anchored splitting")
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        s1_coord = np.array(s1_location['coordinate'])
        
        primary_axis, direction_sign, _ = self._get_anatomical_direction_from_affine(affine)
        
        superior_peaks = []
        inferior_peaks = []
        
        for i, peak in enumerate(vertebrae_peaks):
            vertebra_coord = np.array(peak['coordinate'])
            relative_position = vertebra_coord[primary_axis] - s1_coord[primary_axis]
            
            if direction_sign > 0:
                if relative_position > 5:
                    superior_peaks.append(peak)
                elif relative_position < -5:
                    inferior_peaks.append(peak)
            else:
                if relative_position < -5:
                    superior_peaks.append(peak)
                elif relative_position > 5:
                    inferior_peaks.append(peak)
        
        if not self.silent:
            print(f"   Superior vertebrae (above S1): {len(superior_peaks)}")
            print(f"   Inferior vertebrae (below S1): {len(inferior_peaks)}")
        
        return superior_peaks, inferior_peaks
    
    def _geometric_split(self, vertebrae_peaks, affine):
        """Split vertebrae geometrically when S1 is not available."""
        
        if not self.silent:
            print(f"\n📐 Geometric splitting (no S1 reference)")
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        primary_axis, direction_sign, _ = self._get_anatomical_direction_from_affine(affine)
        
        median_position = np.median(coords[:, primary_axis])
        
        superior_peaks = []
        inferior_peaks = []
        
        for peak in vertebrae_peaks:
            if peak['coordinate'][primary_axis] * direction_sign > median_position * direction_sign:
                superior_peaks.append(peak)
            else:
                inferior_peaks.append(peak)
        
        if not self.silent:
            print(f"   Split at median position: {median_position:.1f}")
            print(f"   Superior: {len(superior_peaks)}, Inferior: {len(inferior_peaks)}")
        
        return superior_peaks, inferior_peaks
        
    def _s1_anchored_labeling(self, superior_peaks, inferior_peaks, s1_location, s1_present, affine):
        """Label vertebrae using S1 as anchor point - FIXED VERSION."""
        
        if not self.silent:
            print(f"\n🏷️  S1-anchored labeling (CORRECTED)")
        
        labeled_vertebrae = []
        primary_axis, direction_sign, _ = self._get_anatomical_direction_from_affine(affine)
        
        # CASE 1: S1 IS DETECTED - Use S1 as anchor point
        if s1_present and s1_location:
            if not self.silent:
                print(f"   🎯 S1 detected - using as anatomical anchor")
            
            # FIX: Define s1_coord ONCE at the beginning, outside conditional blocks
            s1_coord = s1_location['coordinate'][primary_axis]
            
            # Sort superior vertebrae by distance from S1 (closest first)
            if superior_peaks:
                superior_coords = [peak['coordinate'][primary_axis] for peak in superior_peaks]
                distances_to_s1 = [abs(coord - s1_coord) for coord in superior_coords]
                superior_sorted_idx = np.argsort(distances_to_s1)
                superior_sorted = [superior_peaks[i] for i in superior_sorted_idx]
                
                if not self.silent:
                    print(f"   🔍 Superior vertebrae (closest to S1 first): {len(superior_sorted)}")
            else:
                superior_sorted = []
            
            # Sort inferior vertebrae by distance from S1 (closest first)
            if inferior_peaks:
                inferior_coords = [peak['coordinate'][primary_axis] for peak in inferior_peaks]
                distances_to_s1 = [abs(coord - s1_coord) for coord in inferior_coords]
                inferior_sorted_idx = np.argsort(distances_to_s1)
                inferior_sorted = [inferior_peaks[i] for i in inferior_sorted_idx]
                
                if not self.silent:
                    print(f"   🔍 Inferior vertebrae (closest to S1 first): {len(inferior_sorted)}")
            else:
                inferior_sorted = []
            
            # Label superior vertebrae (L5, L4, L3, ...)
            for i, peak in enumerate(superior_sorted):
                lumbar_number = 5 - i  # i=0 → L5, i=1 → L4, i=2 → L3, etc.
                
                if lumbar_number >= 1:
                    label = f'L{lumbar_number}'
                    vertebra_type = 'Lumbar'
                else:
                    # If we go beyond L1, start counting thoracic vertebrae
                    thoracic_number = 12 + lumbar_number  # lumbar_number will be 0, -1, -2, etc.
                    if thoracic_number > 0:
                        label = f'T{thoracic_number}'
                        vertebra_type = 'Thoracic'
                    else:
                        label = f'T{thoracic_number}?'
                        vertebra_type = 'Thoracic (estimated)'
                
                labeled_vertebrae.append({
                    'coordinate': peak['coordinate'],
                    'intensity': peak['intensity'],
                    'label': label,
                    'type': vertebra_type,
                    'region': 'superior',
                    'anatomical_order': len(labeled_vertebrae) + 1,
                    'distance_from_s1': abs(peak['coordinate'][primary_axis] - s1_location['coordinate'][primary_axis])
                })
                
                if not self.silent:
                    print(f"      Superior {i}: {label} at {peak['coordinate']} (distance: {labeled_vertebrae[-1]['distance_from_s1']:.1f})")
            
            # Add S1 reference point
            labeled_vertebrae.append({
                'coordinate': s1_location['coordinate'],
                'intensity': s1_location['intensity'],
                'label': 'S1',
                'type': 'Sacral (Reference)',
                'region': 's1_reference',
                'anatomical_order': len(labeled_vertebrae) + 1,
                'distance_from_s1': 0.0
            })
            
            if not self.silent:
                print(f"      S1 Reference: S1 at {s1_location['coordinate']} (distance: 0.0)")
            
            # Label inferior vertebrae (S2, S3, S4, ...)
            for i, peak in enumerate(inferior_sorted):
                sacral_number = 2 + i  # i=0 → S2, i=1 → S3, i=2 → S4, etc.
                
                if sacral_number <= 5:
                    label = f'S{sacral_number}'
                    vertebra_type = 'Sacral'
                else:
                    # If we go beyond S5, start counting coccygeal vertebrae
                    coccyx_number = sacral_number - 5
                    label = f'Co{coccyx_number}'
                    vertebra_type = 'Coccygeal'
                
                labeled_vertebrae.append({
                    'coordinate': peak['coordinate'],
                    'intensity': peak['intensity'],
                    'label': label,
                    'type': vertebra_type,
                    'region': 'inferior',
                    'anatomical_order': len(labeled_vertebrae) + 1,
                    'distance_from_s1': abs(peak['coordinate'][primary_axis] - s1_location['coordinate'][primary_axis])
                })
                
                if not self.silent:
                    print(f"      Inferior {i}: {label} at {peak['coordinate']} (distance: {labeled_vertebrae[-1]['distance_from_s1']:.1f})")
        
        # CASE 2: S1 NOT DETECTED - Label all as sacral/coccygeal (CORRECTED APPROACH)
        else:
            if not self.silent:
                print(f"   ❌ S1 not detected - assuming all vertebrae are sacral/coccygeal")
                print(f"   💡 Conservative labeling: Starting from S2 (S1 would be most prominent)")
            
            # Combine all vertebrae and sort along spine axis
            all_vertebrae = superior_peaks + inferior_peaks
            
            if not all_vertebrae:
                if not self.silent:
                    print(f"   ⚠️  No vertebrae to label")
                return labeled_vertebrae
            
            # Sort all vertebrae along the primary spine axis
            all_coords = [peak['coordinate'][primary_axis] for peak in all_vertebrae]
            
            # Determine sorting direction based on anatomical orientation
            if direction_sign > 0:
                # For positive direction, sort ascending (superior to inferior)
                sorted_indices = np.argsort(all_coords)
            else:
                # For negative direction, sort descending (superior to inferior)
                sorted_indices = np.argsort(all_coords)[::-1]
            
            all_vertebrae_sorted = [all_vertebrae[i] for i in sorted_indices]
            
            if not self.silent:
                print(f"   📊 Total vertebrae to label: {len(all_vertebrae_sorted)}")
                print(f"   🔄 Sorted along spine axis (superior to inferior)")
            
            # Label all vertebrae as sacral/coccygeal starting from S2
            for i, peak in enumerate(all_vertebrae_sorted):
                sacral_number = 2 + (len(all_vertebrae_sorted) - 1 - i)
                
                if sacral_number <= 5:
                    label = f'S{sacral_number}'
                    vertebra_type = 'Sacral'
                    region_type = 'sacral'
                else:
                    # Beyond S5, use coccygeal numbering
                    coccyx_number = sacral_number - 5  # S6→Co1, S7→Co2, etc.
                    label = f'Co{coccyx_number}'
                    vertebra_type = 'Coccygeal'
                    region_type = 'coccygeal'
                
                labeled_vertebrae.append({
                    'coordinate': peak['coordinate'],
                    'intensity': peak['intensity'],
                    'label': label,
                    'type': vertebra_type,
                    'region': region_type,
                    'anatomical_order': i + 1,
                    'distance_from_s1': None  # No S1 reference available
                })
                
                if not self.silent:
                    coord_str = f"[{peak['coordinate'][0]}, {peak['coordinate'][1]}, {peak['coordinate'][2]}]"
                    print(f"      Vertebra {i+1}: {label} ({vertebra_type}) at {coord_str} (intensity: {peak['intensity']:.4f})")
        
        # Print summary
        if not self.silent:
            print(f"   ✅ Labeling summary:")
            if s1_present:
                superior_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 'superior']
                s1_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 's1_reference']
                inferior_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 'inferior']
                
                if superior_labels:
                    print(f"      Superior sequence: {' → '.join(reversed(superior_labels))} → S1")
                if s1_labels:
                    print(f"      S1 Reference: {', '.join(s1_labels)}")
                if inferior_labels:
                    print(f"      Inferior sequence: S1 → {' → '.join(inferior_labels)}")
            else:
                all_labels = [v['label'] for v in labeled_vertebrae]
                sacral_labels = [label for label in all_labels if label.startswith('S')]
                coccyx_labels = [label for label in all_labels if label.startswith('Co')]
                
                if sacral_labels:
                    print(f"      Sacral sequence: {' → '.join(sacral_labels)}")
                if coccyx_labels:
                    print(f"      Coccygeal sequence: {' → '.join(coccyx_labels)}")
                print(f"      Total sequence: {' → '.join(all_labels)}")
                print(f"      💡 Note: S1 not detected, conservative labeling applied")
        
        return labeled_vertebrae
    
    def _fallback_labeling(self, vertebrae_peaks, s1_location, s1_present, affine):
        """Fallback labeling when sophisticated methods fail."""
        
        if not self.silent:
            print(f"⚠️  Using fallback labeling for {len(vertebrae_peaks)} vertebrae")
        
        if len(vertebrae_peaks) == 0:
            return []
        
        coords = np.array([peak['coordinate'] for peak in vertebrae_peaks])
        
        try:
            pca = PCA(n_components=1)
            pca.fit(coords)
            projections = pca.transform(coords)
            
            sort_idx = np.argsort(projections.flatten())
            
            labeled_vertebrae = []
            for i, idx in enumerate(sort_idx):
                peak = vertebrae_peaks[idx]
                
                if s1_present:
                    mid_idx = len(sort_idx) // 2
                    relative_pos = i - mid_idx
                    
                    if relative_pos == 0:
                        label = 'S1'
                        vertebra_type = 'Sacral'
                    elif relative_pos < 0:
                        lumbar_num = abs(relative_pos)
                        label = f'L{min(5, lumbar_num)}'
                        vertebra_type = 'Lumbar'
                    else:
                        sacral_num = relative_pos + 1
                        label = f'S{min(5, sacral_num)}'
                        vertebra_type = 'Sacral'
                else:
                    label = f'S{i+2}'
                    vertebra_type = 'Sacral (estimated)'
                
                labeled_vertebrae.append({
                    'coordinate': peak['coordinate'],
                    'intensity': peak['intensity'],
                    'label': label,
                    'type': vertebra_type,
                    'region': 'fallback',
                    'anatomical_order': i + 1
                })
            
            return labeled_vertebrae
            
        except:
            return [{
                'coordinate': peak['coordinate'],
                'intensity': peak['intensity'],
                'label': f'V{i+1}',
                'type': 'Vertebra (unknown)',
                'region': 'fallback',
                'anatomical_order': i + 1
            } for i, peak in enumerate(vertebrae_peaks)]
    
    def _get_anatomical_direction_from_affine(self, affine):
        """Determine anatomical direction from affine matrix."""
        direction_vectors = affine[:3, :3]
        superior_components = np.abs(direction_vectors[2, :])
        primary_axis = np.argmax(superior_components)
        direction_sign = np.sign(direction_vectors[2, primary_axis])
        axis_names = ['X (i)', 'Y (j)', 'Z (k)']
        
        return primary_axis, direction_sign, axis_names[primary_axis]


def enhanced_s1_anchored_vertebrae_detection(vertebrae_heatmap, s1_heatmap, affine,
                                           min_distance=15, base_threshold=0.2,
                                           intensity_threshold=0.15, s1_threshold=0.15,
                                           enhanced_filtering=True, silent=False):
    """Enhanced S1-anchored detection with aggressive outlier filtering."""
    
    if not silent:
        filtering_mode = "Enhanced" if enhanced_filtering else "Standard"
        print(f"🎯 {filtering_mode} S1-Anchored Vertebrae Detection Pipeline")
        print(f"=" * 70)
    
    # Step 1: Initial vertebrae peak detection
    initial_peaks = find_vertebrae_peaks(vertebrae_heatmap, 
                                       min_distance=min_distance, 
                                       threshold=base_threshold, 
                                       silent=silent)
    
    if not silent:
        print(f"📊 Initial vertebrae detection: {len(initial_peaks)} peaks found")
    
    # Step 2: S1 detection
    s1_present, s1_location = detect_s1_presence_and_location(s1_heatmap, 
                                                            threshold=s1_threshold, 
                                                            silent=silent)
    
    if not silent:
        s1_status = "DETECTED ✅" if s1_present else "NOT DETECTED ❌"
        print(f"🎯 S1 detection: {s1_status}")
        if s1_present:
            print(f"   S1 coordinate: {s1_location['coordinate']}")
            print(f"   S1 intensity: {s1_location['intensity']:.4f}")
    
    # Step 3: Apply enhanced detection
    detector = EnhancedS1AnchoredSpineDetector(silent=silent)
    labeled_vertebrae = detector.detect_and_label_vertebrae(
        initial_peaks, s1_location, s1_present, affine
    )
    
    # Step 4: Create detection summary
    detection_summary = {
        'initial_peaks': len(initial_peaks),
        'final_vertebrae': len(labeled_vertebrae),
        's1_detected': s1_present,
        's1_intensity': s1_location['intensity'] if s1_present else None,
        'vertebrae_labels': [v['label'] for v in labeled_vertebrae],
        'vertebrae_types': list(set(v['type'] for v in labeled_vertebrae)),
        'regions': list(set(v.get('region', 'unknown') for v in labeled_vertebrae)),
        'filtering_mode': 'Enhanced' if enhanced_filtering else 'Standard'
    }
    
    if not silent:
        print(f"\n📋 Detection Summary:")
        print(f"   Initial peaks: {detection_summary['initial_peaks']}")
        print(f"   Final labeled vertebrae: {detection_summary['final_vertebrae']}")
        print(f"   Filtering efficiency: {len(labeled_vertebrae)}/{len(initial_peaks)} peaks kept")
        print(f"   Labels: {', '.join(detection_summary['vertebrae_labels'])}")
        print(f"=" * 70)
    
    return labeled_vertebrae, s1_present, s1_location, detection_summary


def voxel_to_world_coordinates(voxel_coord, affine):
    """Convert voxel coordinates to world coordinates using affine matrix."""
    voxel_homog = np.array([voxel_coord[0], voxel_coord[1], voxel_coord[2], 1])
    world_coord = affine @ voxel_homog
    return world_coord[:3]


def save_fiducials_as_fcsv(labeled_vertebrae, s1_location, s1_present, patient_id, output_dir, affine, silent=False):
    """Save vertebrae centers as .fcsv fiducial points file for 3D Slicer."""
    
    fcsv_path = os.path.join(output_dir, f"{patient_id}_vertebrae_fiducials.fcsv")
    
    with open(fcsv_path, 'w') as f:
        f.write("# Markups fiducial file version = 4.11\n")
        f.write("# CoordinateSystem = LPS\n")
        f.write("# columns = id,x,y,z,ow,ox,oy,oz,vis,sel,lock,label,desc,associatedNodeID\n")
        
        fiducial_id = 0
        
        # Add S1 reference point if detected
        if s1_present and s1_location:
            voxel_coord = s1_location['coordinate']
            world_coord = voxel_to_world_coordinates(voxel_coord, affine)
            
            lps_x, lps_y, lps_z = -world_coord[0], -world_coord[1], world_coord[2]
            
            f.write(f"vtkMRMLMarkupsFiducialNode_{fiducial_id},"
                   f"{lps_x:.6f},{lps_y:.6f},{lps_z:.6f},"
                   f"0,0,0,1,"
                   f"1,1,0,"
                   f"S1,"
                   f"S1 reference point (intensity: {s1_location['intensity']:.4f}),"
                   f"vtkMRMLScalarVolumeNode1\n")
            
            fiducial_id += 1
        
        # Add labeled vertebrae
        for i, vert in enumerate(labeled_vertebrae):
            voxel_coord = vert['coordinate']
            world_coord = voxel_to_world_coordinates(voxel_coord, affine)
            
            lps_x, lps_y, lps_z = -world_coord[0], -world_coord[1], world_coord[2]
            
            description = f"{vert['type']} vertebra (intensity: {vert['intensity']:.4f})"
            
            f.write(f"vtkMRMLMarkupsFiducialNode_{fiducial_id},"
                   f"{lps_x:.6f},{lps_y:.6f},{lps_z:.6f},"
                   f"0,0,0,1,"
                   f"1,1,0,"
                   f"{vert['label']},"
                   f"{description},"
                   f"vtkMRMLScalarVolumeNode1\n")
            
            fiducial_id += 1
    
    return fcsv_path


def create_vertebrae_segmentation_for_itksnap(labeled_vertebrae, s1_location, s1_present, 
                                            volume_shape, patient_id, output_dir, affine, silent=False):
    """Create a segmentation label image for ITK-SNAP."""
    
    segmentation_path = os.path.join(output_dir, f"{patient_id}_vertebrae_segmentation.nii.gz")
    
    segmentation = np.zeros(volume_shape, dtype=np.uint8)
    
    current_label = 1
    
    # Add S1 reference point if detected
    if s1_present and s1_location:
        x, y, z = s1_location['coordinate']
        
        sphere_radius = 10
        dd, hh, ww = np.mgrid[-sphere_radius:sphere_radius+1,
                              -sphere_radius:sphere_radius+1, 
                              -sphere_radius:sphere_radius+1]
        
        sphere_mask = (dd**2 + hh**2 + ww**2) <= sphere_radius**2
        
        d_coords = x + dd[sphere_mask]
        h_coords = y + hh[sphere_mask]
        w_coords = z + ww[sphere_mask]
        
        valid_mask = ((d_coords >= 0) & (d_coords < volume_shape[0]) &
                     (h_coords >= 0) & (h_coords < volume_shape[1]) &
                     (w_coords >= 0) & (w_coords < volume_shape[2]))
        
        if np.any(valid_mask):
            d_valid = d_coords[valid_mask].astype(int)
            h_valid = h_coords[valid_mask].astype(int)
            w_valid = w_coords[valid_mask].astype(int)
            
            segmentation[d_valid, h_valid, w_valid] = current_label
            current_label += 1
    
    # Add labeled vertebrae
    for vert in labeled_vertebrae:
        x, y, z = vert['coordinate']
        
        sphere_radius = 12
        dd, hh, ww = np.mgrid[-sphere_radius:sphere_radius+1,
                              -sphere_radius:sphere_radius+1, 
                              -sphere_radius:sphere_radius+1]
        
        sphere_mask = (dd**2 + hh**2 + ww**2) <= sphere_radius**2
        
        d_coords = x + dd[sphere_mask]
        h_coords = y + hh[sphere_mask]
        w_coords = z + ww[sphere_mask]
        
        valid_mask = ((d_coords >= 0) & (d_coords < volume_shape[0]) &
                     (h_coords >= 0) & (h_coords < volume_shape[1]) &
                     (w_coords >= 0) & (w_coords < volume_shape[2]))
        
        if np.any(valid_mask):
            d_valid = d_coords[valid_mask].astype(int)
            h_valid = h_coords[valid_mask].astype(int)
            w_valid = w_coords[valid_mask].astype(int)
            
            segmentation[d_valid, h_valid, w_valid] = current_label
            current_label += 1
    
    segmentation_nii = nib.Nifti1Image(segmentation.astype(np.uint8), affine)
    nib.save(segmentation_nii, segmentation_path)
    
    return segmentation_path


def visualize_results(original_volume, labeled_vertebrae, s1_location, s1_present, patient_id, output_dir, silent=False):
    """Create visualization of detection results."""
    
    vd, vh, vw = original_volume.shape
    mid_d, mid_h, mid_w = vd//2, vh//2, vw//2
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # Original volume views
    axes[0, 0].imshow(original_volume[mid_d, :, :], cmap='gray', origin='lower')
    axes[0, 0].set_title('Original - Sagittal')
    
    axes[0, 1].imshow(original_volume[:, mid_h, :], cmap='gray', origin='lower')
    axes[0, 1].set_title('Original - Coronal')
    
    axes[0, 2].imshow(original_volume[:, :, mid_w].T, cmap='gray', origin='lower')
    axes[0, 2].set_title('Original - Axial')
    
    # Detection results views
    axes[1, 0].imshow(original_volume[mid_d, :, :], cmap='gray', origin='lower')
    axes[1, 0].set_title('Results - Sagittal')
    
    axes[1, 1].imshow(original_volume[:, mid_h, :], cmap='gray', origin='lower')
    axes[1, 1].set_title('Results - Coronal')
    
    axes[1, 2].imshow(original_volume[:, :, mid_w].T, cmap='gray', origin='lower')
    axes[1, 2].set_title('Results - Axial')
    
    # Add vertebrae markers
    for vert in labeled_vertebrae:
        d, h, w = vert['coordinate']
        if abs(w - mid_w) <= 2:
            color = 'red' if vert['label'].startswith('S') else 'yellow'
            markersize = 20 if vert['label'].startswith('S') else 15
            axes[1, 2].plot(d, h, '+', color=color, markersize=markersize, 
                          markeredgewidth=3, label=vert['label'])
    
    # Add S1 reference marker if present
    if s1_present and s1_location:
        d, h, w = s1_location['coordinate']
        if abs(w - mid_w) <= 2:
            axes[1, 2].plot(d, h, 'o', color='red', markersize=25, 
                          markeredgewidth=4, fillstyle='none', label='S1 Reference')
    
    s1_status = "S1 DETECTED ✅" if s1_present else "S1 NOT DETECTED ❌"
    plt.suptitle(f'{patient_id} - Enhanced Detection Results: {s1_status}', fontsize=16, fontweight='bold')
    plt.tight_layout()
    
    output_path = os.path.join(output_dir, f'{patient_id}_enhanced_detection_visualization.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    return output_path
def visualize_results_with_initial_peaks(original_volume, initial_peaks, labeled_vertebrae, s1_location, s1_present, patient_id, output_dir, silent=False):
    """Create enhanced visualization showing both initial peaks and final results."""
    
    vd, vh, vw = original_volume.shape
    mid_d, mid_h, mid_w = vd//2, vh//2, vw//2
    
    # Create larger figure to accommodate more information
    fig, axes = plt.subplots(3, 3, figsize=(20, 16))
    
    # Row 1: Original volume views
    axes[0, 0].imshow(original_volume[mid_d, :, :], cmap='gray', origin='lower')
    axes[0, 0].set_title('Original - Sagittal', fontsize=12, fontweight='bold')
    
    axes[0, 1].imshow(original_volume[:, mid_h, :], cmap='gray', origin='lower')
    axes[0, 1].set_title('Original - Coronal', fontsize=12, fontweight='bold')
    
    axes[0, 2].imshow(original_volume[:, :, mid_w].T, cmap='gray', origin='lower')
    axes[0, 2].set_title('Original - Axial', fontsize=12, fontweight='bold')
    
    # Row 2: Initial peaks detection
    axes[1, 0].imshow(original_volume[mid_d, :, :], cmap='gray', origin='lower')
    axes[1, 0].set_title(f'Initial Peaks ({len(initial_peaks)}) - Sagittal', fontsize=12, fontweight='bold')
    
    axes[1, 1].imshow(original_volume[:, mid_h, :], cmap='gray', origin='lower')
    axes[1, 1].set_title(f'Initial Peaks ({len(initial_peaks)}) - Coronal', fontsize=12, fontweight='bold')
    
    axes[1, 2].imshow(original_volume[:, :, mid_w].T, cmap='gray', origin='lower')
    axes[1, 2].set_title(f'Initial Peaks ({len(initial_peaks)}) - Axial', fontsize=12, fontweight='bold')
    
    # Row 3: Final results
    axes[2, 0].imshow(original_volume[mid_d, :, :], cmap='gray', origin='lower')
    axes[2, 0].set_title(f'Final Results ({len(labeled_vertebrae)}) - Sagittal', fontsize=12, fontweight='bold')
    
    axes[2, 1].imshow(original_volume[:, mid_h, :], cmap='gray', origin='lower')
    axes[2, 1].set_title(f'Final Results ({len(labeled_vertebrae)}) - Coronal', fontsize=12, fontweight='bold')
    
    axes[2, 2].imshow(original_volume[:, :, mid_w].T, cmap='gray', origin='lower')
    axes[2, 2].set_title(f'Final Results ({len(labeled_vertebrae)}) - Axial', fontsize=12, fontweight='bold')
    
    # Add initial peaks markers (Row 2)
    for i, peak in enumerate(initial_peaks):
        d, h, w = peak['coordinate']
        intensity = peak['intensity']
        
        # Show peaks that are close to the slice planes
        slice_tolerance = 3
        
        # Sagittal view (varying d)
        if abs(d - mid_d) <= slice_tolerance:
            axes[1, 0].plot(h, w, 'o', color='cyan', markersize=12, 
                          markeredgewidth=2, fillstyle='none', alpha=0.8)
            axes[1, 0].text(h+5, w+5, f'P{i+1}\n{intensity:.3f}', 
                          color='cyan', fontsize=8, fontweight='bold')
        
        # Coronal view (varying h) 
        if abs(h - mid_h) <= slice_tolerance:
            axes[1, 1].plot(d, w, 'o', color='cyan', markersize=12,
                          markeredgewidth=2, fillstyle='none', alpha=0.8)
            axes[1, 1].text(d+5, w+5, f'P{i+1}\n{intensity:.3f}', 
                          color='cyan', fontsize=8, fontweight='bold')
        
        # Axial view (varying w)
        if abs(w - mid_w) <= slice_tolerance:
            axes[1, 2].plot(d, h, 'o', color='cyan', markersize=12,
                          markeredgewidth=2, fillstyle='none', alpha=0.8)
            axes[1, 2].text(d+5, h+5, f'P{i+1}\n{intensity:.3f}', 
                          color='cyan', fontsize=8, fontweight='bold')
    
    # Add S1 reference marker for initial peaks (if present)
    if s1_present and s1_location:
        d, h, w = s1_location['coordinate']
        slice_tolerance = 3
        
        if abs(d - mid_d) <= slice_tolerance:
            axes[1, 0].plot(h, w, '*', color='red', markersize=20, 
                          markeredgewidth=3, label='S1 Ref')
        if abs(h - mid_h) <= slice_tolerance:
            axes[1, 1].plot(d, w, '*', color='red', markersize=20,
                          markeredgewidth=3, label='S1 Ref')
        if abs(w - mid_w) <= slice_tolerance:
            axes[1, 2].plot(d, h, '*', color='red', markersize=20,
                          markeredgewidth=3, label='S1 Ref')
    
    # Add final vertebrae markers (Row 3)
    for i, vert in enumerate(labeled_vertebrae):
        d, h, w = vert['coordinate']
        label = vert['label']
        intensity = vert['intensity']
        
        # Color coding for different vertebrae types
        if label.startswith('L'):
            color = 'yellow'
            marker = '+'
        elif label.startswith('S'):
            color = 'red' if label == 'S1' else 'orange'
            marker = '+' if label != 'S1' else 'o'
        elif label.startswith('T'):
            color = 'green'
            marker = '+'
        elif label.startswith('Co'):
            color = 'purple'
            marker = '+'
        else:
            color = 'white'
            marker = '+'
        
        markersize = 18 if label == 'S1' else 15
        slice_tolerance = 3
        
        # Sagittal view
        if abs(d - mid_d) <= slice_tolerance:
            axes[2, 0].plot(h, w, marker, color=color, markersize=markersize, 
                          markeredgewidth=3, fillstyle='none' if marker == 'o' else 'full')
            axes[2, 0].text(h+5, w+5, f'{label}\n{intensity:.3f}', 
                          color=color, fontsize=9, fontweight='bold')
        
        # Coronal view
        if abs(h - mid_h) <= slice_tolerance:
            axes[2, 1].plot(d, w, marker, color=color, markersize=markersize,
                          markeredgewidth=3, fillstyle='none' if marker == 'o' else 'full')
            axes[2, 1].text(d+5, w+5, f'{label}\n{intensity:.3f}', 
                          color=color, fontsize=9, fontweight='bold')
        
        # Axial view
        if abs(w - mid_w) <= slice_tolerance:
            axes[2, 2].plot(d, h, marker, color=color, markersize=markersize,
                          markeredgewidth=3, fillstyle='none' if marker == 'o' else 'full')
            axes[2, 2].text(d+5, h+5, f'{label}\n{intensity:.3f}', 
                          color=color, fontsize=9, fontweight='bold')
    
    # Add S1 reference marker for final results
    if s1_present and s1_location:
        d, h, w = s1_location['coordinate']
        slice_tolerance = 3
        
        if abs(d - mid_d) <= slice_tolerance:
            axes[2, 0].plot(h, w, '*', color='red', markersize=22, 
                          markeredgewidth=4, alpha=0.7, label='S1 Reference')
        if abs(h - mid_h) <= slice_tolerance:
            axes[2, 1].plot(d, w, '*', color='red', markersize=22,
                          markeredgewidth=4, alpha=0.7, label='S1 Reference')
        if abs(w - mid_w) <= slice_tolerance:
            axes[2, 2].plot(d, h, '*', color='red', markersize=22,
                          markeredgewidth=4, alpha=0.7, label='S1 Reference')
    
    # Add legends
    from matplotlib.lines import Line2D
    
    # Legend for initial peaks
    initial_legend_elements = [
        Line2D([0], [0], marker='o', color='w', markerfacecolor='cyan', 
               markeredgecolor='cyan', markersize=10, label='Initial Peaks'),
        Line2D([0], [0], marker='*', color='w', markerfacecolor='red', 
               markeredgecolor='red', markersize=15, label='S1 Reference')
    ]
    axes[1, 2].legend(handles=initial_legend_elements, loc='upper right', fontsize=8)
    
    # Legend for final results
    final_legend_elements = [
        Line2D([0], [0], marker='+', color='yellow', markersize=12, label='Lumbar', linewidth=0),
        Line2D([0], [0], marker='+', color='orange', markersize=12, label='Sacral', linewidth=0),
        Line2D([0], [0], marker='+', color='green', markersize=12, label='Thoracic', linewidth=0),
        Line2D([0], [0], marker='*', color='red', markersize=15, label='S1 Reference', linewidth=0)
    ]
    axes[2, 2].legend(handles=final_legend_elements, loc='upper right', fontsize=8)
    
    # Set axis properties
    for row in range(3):
        for col in range(3):
            axes[row, col].set_aspect('equal')
            axes[row, col].grid(True, alpha=0.3)
    
    # Create comprehensive title
    s1_status = "S1 DETECTED ✅" if s1_present else "S1 NOT DETECTED ❌"
    filtering_info = f"Filtered: {len(initial_peaks)} → {len(labeled_vertebrae)} peaks"
    labels_info = f"Labels: {', '.join([v['label'] for v in labeled_vertebrae])}" if labeled_vertebrae else "No labels"
    
    plt.suptitle(f'{patient_id} - Enhanced Detection Pipeline\n'
                f'{s1_status} | {filtering_info} | {labels_info}', 
                fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.subplots_adjust(top=0.92)  # Make room for title
    
    # Save the enhanced visualization
    output_path = os.path.join(output_dir, f'{patient_id}_enhanced_detection_with_initial_peaks.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    # Also create a detailed comparison plot
    create_detailed_comparison_plot(initial_peaks, labeled_vertebrae, s1_location, s1_present, 
                                  patient_id, output_dir, silent)
    
    return output_path


def create_detailed_comparison_plot(initial_peaks, labeled_vertebrae, s1_location, s1_present, 
                                  patient_id, output_dir, silent=False):
    """Create a detailed comparison plot showing the filtering process."""
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
    
    # Extract coordinates for plotting
    if initial_peaks:
        initial_coords = np.array([peak['coordinate'] for peak in initial_peaks])
        initial_intensities = [peak['intensity'] for peak in initial_peaks]
    else:
        initial_coords = np.array([]).reshape(0, 3)
        initial_intensities = []
    
    if labeled_vertebrae:
        final_coords = np.array([vert['coordinate'] for vert in labeled_vertebrae if vert.get('region') != 's1_reference'])
        final_labels = [vert['label'] for vert in labeled_vertebrae if vert.get('region') != 's1_reference']
        final_intensities = [vert['intensity'] for vert in labeled_vertebrae if vert.get('region') != 's1_reference']
    else:
        final_coords = np.array([]).reshape(0, 3)
        final_labels = []
        final_intensities = []
    
    # Plot 1: 3D scatter of coordinates
    if len(initial_coords) > 0:
        # Plot initial peaks
        scatter1 = ax1.scatter(initial_coords[:, 0], initial_coords[:, 1], 
                             c=initial_intensities, cmap='viridis', s=100, alpha=0.7, 
                             marker='o', edgecolors='black', linewidth=2, label='Initial Peaks')
        
        # Add peak numbers
        for i, (coord, intensity) in enumerate(zip(initial_coords, initial_intensities)):
            ax1.annotate(f'P{i+1}\n{intensity:.3f}', (coord[0], coord[1]), 
                        xytext=(5, 5), textcoords='offset points', 
                        fontsize=8, fontweight='bold', color='black',
                        bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7))
    
    # Plot final vertebrae
    if len(final_coords) > 0:
        scatter2 = ax1.scatter(final_coords[:, 0], final_coords[:, 1], 
                             c=final_intensities, cmap='plasma', s=150, alpha=0.9, 
                             marker='s', edgecolors='red', linewidth=3, label='Final Vertebrae')
        
        # Add vertebrae labels
        for coord, label, intensity in zip(final_coords, final_labels, final_intensities):
            ax1.annotate(f'{label}\n{intensity:.3f}', (coord[0], coord[1]), 
                        xytext=(10, 10), textcoords='offset points', 
                        fontsize=9, fontweight='bold', color='red',
                        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    
    # Add S1 reference if present
    if s1_present and s1_location:
        s1_coord = s1_location['coordinate']
        ax1.scatter(s1_coord[0], s1_coord[1], c='red', s=200, marker='*', 
                   edgecolors='darkred', linewidth=3, label='S1 Reference', zorder=10)
        ax1.annotate(f'S1 Ref\n{s1_location["intensity"]:.3f}', 
                    (s1_coord[0], s1_coord[1]), 
                    xytext=(15, 15), textcoords='offset points', 
                    fontsize=10, fontweight='bold', color='darkred',
                    bbox=dict(boxstyle='round,pad=0.3', facecolor='pink', alpha=0.8))
    
    ax1.set_xlabel('X Coordinate (voxels)', fontsize=12)
    ax1.set_ylabel('Y Coordinate (voxels)', fontsize=12)
    ax1.set_title(f'Spatial Distribution of Peaks\nInitial: {len(initial_peaks)} → Final: {len(labeled_vertebrae)}', 
                 fontsize=12, fontweight='bold')
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    ax1.set_aspect('equal')
    
    # Plot 2: Intensity comparison
    if initial_peaks and labeled_vertebrae:
        peak_numbers = list(range(1, len(initial_peaks) + 1))
        final_numbers = list(range(1, len(final_coords) + 1))
        
        # Bar plot of intensities
        bars1 = ax2.bar([f'P{i}' for i in peak_numbers], initial_intensities, 
                       alpha=0.7, color='cyan', edgecolor='black', linewidth=1,
                       label=f'Initial Peaks ({len(initial_peaks)})')
        
        bars2 = ax2.bar([f'F{i}' for i in final_numbers], final_intensities, 
                       alpha=0.9, color='red', edgecolor='darkred', linewidth=2,
                       label=f'Final Vertebrae ({len(final_coords)})')
        
        # Add value labels on bars
        for bar, intensity in zip(bars1, initial_intensities):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{intensity:.3f}', ha='center', va='bottom', fontsize=8, fontweight='bold')
        
        for bar, intensity, label in zip(bars2, final_intensities, final_labels):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{label}\n{intensity:.3f}', ha='center', va='bottom', fontsize=8, fontweight='bold')
        
        ax2.set_ylabel('Intensity', fontsize=12)
        ax2.set_title('Peak Intensity Comparison\n(Initial vs Final)', fontsize=12, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(True, alpha=0.3, axis='y')
        
        # Rotate x-axis labels if many peaks
        if len(initial_peaks) + len(final_coords) > 10:
            ax2.tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    
    # Save the comparison plot
    comparison_path = os.path.join(output_dir, f'{patient_id}_peak_comparison_analysis.png')
    plt.savefig(comparison_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    if not silent:
        print(f"📊 Detailed comparison plot saved: {os.path.basename(comparison_path)}")
    
    return comparison_path


def main():
    """Main enhanced inference function with aggressive outlier filtering."""
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Enhanced S1-Anchored Multi-Task Vertebrae Inference')
    parser.add_argument('input_file', type=str, help='Path to input NIFTI file')
    parser.add_argument('--model', type=str, default='best_multitask_model.pth', 
                       help='Path to trained model (default: best_multitask_model.pth)')
    parser.add_argument('--output_dir', type=str, default='results/', 
                       help='Output directory (default: results/)')
    parser.add_argument('--patch_size', type=int, nargs=3, default=[96, 96, 96],
                       help='Patch size for inference (default: 96 96 96)')
    parser.add_argument('--overlap', type=float, default=0.5,
                       help='Patch overlap (default: 0.5)')
    parser.add_argument('--batch_size', type=int, default=8,
                       help='Batch size for inference (default: 8)')
    parser.add_argument('--device', type=str, default='auto',
                       help='Device to use: cuda, cpu, or auto (default: auto)')
    parser.add_argument('--silent', action='store_true',
                       help='Enable silent mode (minimal output)')
    parser.add_argument('--base_threshold', type=float, default=0.2,
                       help='Base threshold for vertebrae detection (default: 0.2)')
    parser.add_argument('--s1_threshold', type=float, default=0.15,
                       help='Threshold for S1 detection (default: 0.15)')
    parser.add_argument('--min_distance', type=int, default=15,
                       help='Minimum distance between vertebrae peaks (default: 15)')
    parser.add_argument(
    "--save_fcsv_only",
    action="store_true",
    help="Save only .fcsv outputs (no PNG, no segmentation)"
    )
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"❌ Error: Input file not found: {input_path}")
        return
    
    if not str(input_path).lower().endswith(('.nii', '.nii.gz')):
        print(f"❌ Error: Input file must be a NIFTI file (.nii or .nii.gz)")
        return
    
    # Setup device
    if args.device == 'auto':
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        device = torch.device(args.device)
    
    # Extract patient ID
    patient_id = input_path.stem
    if patient_id.endswith('.nii'):
        patient_id = patient_id[:-4]
    if patient_id.endswith('_volume'):
        patient_id = patient_id[:-7]
    
    # Display header information
    print(f"📁 Input file: {input_path}")
    print(f"👤 Patient ID: {patient_id}")
    print(f"🖥️  Device: {device}")
    print(f"📦 Model: {args.model}")
    print(f"📂 Output directory: {args.output_dir}")
    print(f"🎯 Detection thresholds: vertebrae={args.base_threshold}, S1={args.s1_threshold}")
    print("="*80)
    
    # Initialize inference
    try:
        inference = MultiTaskFullVolumeInference(
            args.model, 
            tuple(args.patch_size), 
            args.overlap, 
            device,
            silent=args.silent
        )
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    try:
        # Load volume
        volume_nii = nib.load(input_path)
        original_volume = volume_nii.get_fdata().astype(np.float32)
        original_affine = volume_nii.affine.copy()
        
        if not args.silent:
            print(f"📐 Original volume shape: {original_volume.shape}")
            print(f"📊 Original intensity range: {original_volume.min():.2f} to {original_volume.max():.2f}")
        
        # Prepare volume for inference
        inference_volume = original_volume.copy()
        inference_affine = original_affine.copy()
        
        # Apply preprocessing if needed
        preprocessing_applied = detect_if_preprocessing_needed(inference_volume, silent=args.silent)
        if preprocessing_applied:
            if not args.silent:
                print(f"🔄 Applying preprocessing...")
            inference_volume, inference_affine = preprocess_volume_for_inference(
                inference_volume, original_affine,
                intensity_method='minmax',
                target_spacing=(1.0, 1.0, 1.0),
                silent=args.silent
            )
            if not args.silent:
                print(f"📐 Preprocessed volume shape: {inference_volume.shape}")
                print(f"📊 Preprocessed intensity range: {inference_volume.min():.2f} to {inference_volume.max():.2f}")
        
        # Run multi-task inference
        if not args.silent:
            print(f"🧠 Running inference...")
        vertebrae_heatmap, s1_heatmap = inference.infer_volume(inference_volume, args.batch_size)
        
        if not args.silent:
            print(f"✅ Inference complete!")
            print(f"📊 Vertebrae heatmap range: {vertebrae_heatmap.min():.4f} to {vertebrae_heatmap.max():.4f}")
            print(f"📊 S1 heatmap range: {s1_heatmap.min():.4f} to {s1_heatmap.max():.4f}")
        
        # If volume was resampled, resample heatmaps back to original space
        if not np.array_equal(inference_volume.shape, original_volume.shape):
            if not args.silent:
                print(f"🔄 Resampling heatmaps back to original space...")
            zoom_factors = np.array(original_volume.shape) / np.array(inference_volume.shape)
            vertebrae_heatmap = ndimage.zoom(vertebrae_heatmap, zoom_factors, order=1, prefilter=False)
            s1_heatmap = ndimage.zoom(s1_heatmap, zoom_factors, order=1, prefilter=False)
            if not args.silent:
                print(f"📐 Resampled heatmap shape: {vertebrae_heatmap.shape}")
        
        # ===== ENHANCED S1-ANCHORED DETECTION PIPELINE =====
        if not args.silent:
            print(f"\n🎯 Starting Enhanced S1-Anchored Vertebrae Detection Pipeline...")
            print(f"🔬 Pipeline: Clustering → S1-distance → Continuity → Anatomical → RANSAC → Labeling")
        
        # Main detection pipeline with enhanced filtering
        labeled_vertebrae, s1_present, s1_location, detection_summary = enhanced_s1_anchored_vertebrae_detection(
            vertebrae_heatmap, 
            s1_heatmap,
            original_affine,
            min_distance=args.min_distance, 
            base_threshold=args.base_threshold,
            intensity_threshold=0.15,  # Not used in enhanced version
            s1_threshold=args.s1_threshold,
            enhanced_filtering=True,  # Always use enhanced filtering
            silent=args.silent
        )
        # CAPTURE INITIAL PEAKS FOR VISUALIZATION
        initial_peaks = find_vertebrae_peaks(vertebrae_heatmap, 
                                           min_distance=args.min_distance, 
                                           threshold=args.base_threshold, 
                                           silent=True)  # Silent to avoid duplicate output
        # ===== DETAILED RESULTS SUMMARY =====
        if not args.silent and labeled_vertebrae:
            print(f"\n📝 Detailed Vertebrae Results:")
            for i, vert in enumerate(labeled_vertebrae):
                region_info = f" ({vert.get('region', 'unknown')})" if 'region' in vert else ""
                print(f"   {i+1}. {vert['label']} ({vert['type']}) - intensity: {vert['intensity']:.4f}{region_info}")
                coord_str = f"[{vert['coordinate'][0]}, {vert['coordinate'][1]}, {vert['coordinate'][2]}]"
                print(f"      Coordinate: {coord_str}")
        
        # ===== SAVE RESULTS =====
        if not args.silent:
            print(f"\n💾 Saving results...")
        
        # 1. Save vertebrae segmentation for ITK-SNAP
        segmentation_path = create_vertebrae_segmentation_for_itksnap(
            labeled_vertebrae, s1_location, s1_present, 
            original_volume.shape, patient_id, args.output_dir, original_affine, silent=args.silent
        )
        
        # 2. Save fiducial points for 3D Slicer
        fcsv_path = save_fiducials_as_fcsv(
            labeled_vertebrae, s1_location, s1_present, 
            patient_id, args.output_dir, original_affine, silent=args.silent
        )
        
        visualization_path = visualize_results_with_initial_peaks(
            original_volume, initial_peaks, labeled_vertebrae, s1_location, s1_present, 
            patient_id, args.output_dir, silent=args.silent
        )
        
        # ===== FINAL COMPREHENSIVE SUMMARY =====
        print(f"\n" + "="*80)
        print(f"✅ ENHANCED S1-ANCHORED PROCESSING COMPLETE!")
        print(f"="*80)
        
        print(f"📁 Output files generated:")
        print(f"  1. 🎯 {os.path.basename(segmentation_path)}")
        print(f"  2. 📍 {os.path.basename(fcsv_path)}")
        print(f"  3. 🎨 {os.path.basename(visualization_path)}")
        
        # Show comprehensive detection results
        s1_status = "DETECTED ✅" if s1_present else "NOT DETECTED ❌"
        print(f"\n🔍 Enhanced Detection Results:")
        print(f"  S1 Reference: {s1_status}")
        if s1_present:
            print(f"    S1 Coordinate: {s1_location['coordinate']}")
            print(f"    S1 Intensity: {s1_location['intensity']:.4f}")
        
        print(f"  Vertebrae Detected: {len(labeled_vertebrae)}")
        if labeled_vertebrae:
            # Group labels by region
            superior_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 'superior']
            inferior_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 'inferior']
            s1_ref_labels = [v['label'] for v in labeled_vertebrae if v.get('region') == 's1_reference']
            other_labels = [v['label'] for v in labeled_vertebrae if v.get('region') not in ['superior', 'inferior', 's1_reference']]
            
            if superior_labels:
                print(f"    Superior (Lumbar/Thoracic): {', '.join(superior_labels)}")
            if s1_ref_labels:
                print(f"    S1 Reference: {', '.join(s1_ref_labels)}")
            if inferior_labels:
                print(f"    Inferior (Sacral/Coccygeal): {', '.join(inferior_labels)}")
            if other_labels:
                print(f"    Other: {', '.join(other_labels)}")
            
            # Show intensity statistics
            intensities = [v['intensity'] for v in labeled_vertebrae]
            print(f"  Intensity Statistics:")
            print(f"    Range: {min(intensities):.3f} - {max(intensities):.3f}")
            print(f"    Mean: {np.mean(intensities):.3f} ± {np.std(intensities):.3f}")
        
        # Show detection pipeline statistics
        print(f"\n📊 Pipeline Statistics:")
        print(f"  Initial peaks detected: {detection_summary['initial_peaks']}")
        print(f"  Final labeled vertebrae: {detection_summary['final_vertebrae']}")
        outlier_removal_efficiency = detection_summary['initial_peaks'] - detection_summary['final_vertebrae']
        print(f"  Outliers removed: {outlier_removal_efficiency}")
        if detection_summary['initial_peaks'] > 0:
            kept_percentage = (detection_summary['final_vertebrae'] / detection_summary['initial_peaks']) * 100
            print(f"  Filtering efficiency: {detection_summary['final_vertebrae']}/{detection_summary['initial_peaks']} "
                  f"({kept_percentage:.1f}% kept)")
        
        # Show model prediction statistics
        print(f"\n📈 Model Prediction Statistics:")
        print(f"  Vertebrae heatmap max: {vertebrae_heatmap.max():.4f}")
        print(f"  S1 heatmap max: {s1_heatmap.max():.4f}")
        print(f"  Detection thresholds used:")
        print(f"    Vertebrae: {args.base_threshold}")
        print(f"    S1: {args.s1_threshold}")
        
        # Quality assessment
        if len(labeled_vertebrae) >= 2 and outlier_removal_efficiency > 0:
            print(f"\n🏆 Detection Quality: EXCELLENT")
            print(f"  ✅ Enhanced filtering successfully removed {outlier_removal_efficiency} outliers")
            print(f"  ✅ Anatomically consistent vertebrae sequence maintained")
        elif len(labeled_vertebrae) >= 2:
            print(f"\n🏆 Detection Quality: GOOD")
            print(f"  ✅ Clean vertebrae sequence detected")
        else:
            print(f"\n🏆 Detection Quality: FAIR")
            print(f"  ⚠️  Few vertebrae detected - consider adjusting thresholds")
        
        # Usage recommendations
        print(f"\n💡 Usage Recommendations:")
        if len(labeled_vertebrae) < 3:
            print(f"  • Consider lowering --base_threshold (current: {args.base_threshold})")
        if len(labeled_vertebrae) > 8:
            print(f"  • Enhanced filtering prevented over-detection")
        if not s1_present:
            print(f"  • Consider lowering --s1_threshold (current: {args.s1_threshold})")
            print(f"  • S1 detection helps improve vertebrae labeling accuracy")
        if outlier_removal_efficiency > 0:
            print(f"  • Enhanced filtering successfully eliminated {outlier_removal_efficiency} distant outliers")
            print(f"  • This prevented incorrect labeling sequences (e.g., distant 'S2')")
        
        print(f"\n🎯 Enhanced S1-anchored detection pipeline successfully completed!")
        print(f"   Key improvement: Aggressive outlier filtering prevents distant mislabeling")
        print(f"="*80)
        
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()
