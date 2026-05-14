- [ ] Inspect current `NiftiViewer.tsx` NIfTI decoding and rendering logic.
- [ ] Fix voxel datatype handling so `readImage()` output is interpreted correctly (no incorrect double-wrapping).
- [ ] Fix slice indexing to match the actual voxel layout (fallback to a safer slicing approach, or derive index ordering from header).
- [ ] Add basic normalization safeguards (handle NaN/Inf, clamp).
- [ ] Run dev server / build to ensure TS/Next compilation succeeds.

