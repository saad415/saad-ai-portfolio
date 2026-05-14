export const spineProject = {
  title: "Automatic Detection of Lumbosacral Vertebrae in Pelvic MRI",

  shortTitle: "S1-Anchored Vertebra Detection",

  subtitle:
    "A deep learning system for vertebral landmark localization in variable field-of-view pelvic MRI.",

  description:
    "An end-to-end AI system that detects lumbar and sacral vertebral landmarks from pelvic MRI using a dual-head 3D U-Net and an S1-anchored inference strategy.",

  institution: "FAU Erlangen-Nuremberg · Smart Imaging Lab",

  duration: "Sep 2025 – Mar 2026",

  supervisor: "Prof. Dr. Jana Hutter",

  problem: {
    title: "The Problem",
    content:
      "Existing vertebra localization methods assume full spinal visibility from upper spinal regions such as C2 or T1. Pelvic MRI violates this assumption because only partial or sacral-only spinal anatomy is visible in most cases.",
    highlights: [
      "84.7% of pelvic MRI cases contain partial or sacral-only coverage",
      "No prior work addressed individual S1–S5 sacral vertebra detection",
      "Pelvic MRI has inconsistent field-of-view and patient positioning",
      "Traditional superior-reference labeling fails in this setting",
    ],
  },

  innovation: {
    title: "Core Innovation",
    content:
      "Instead of relying on upper spinal anatomy, the system uses S1 as the anatomical anchor point for bidirectional vertebral labeling.",

    features: [
      {
        title: "Dual-Head 3D U-Net",
        description:
          "Lightweight multi-task architecture with separate vertebrae and S1 detection heads.",
      },

      {
        title: "S1-Anchored Labeling",
        description:
          "Labels propagate cranially and caudally from the detected S1 landmark.",
      },

      {
        title: "Biased Patch Sampling",
        description:
          "70% of training patches are sampled from high-activity anatomical regions.",
      },

      {
        title: "Heatmap Regression",
        description:
          "Gaussian heatmap supervision for stable landmark localization.",
      },
    ],
  },

  metrics: [
    {
      label: "Mean Localization Error",
      value: "4.21 mm",
      description: "257 landmarks · multi-center evaluation",
    },

    {
      label: "S1 Anchor Error",
      value: "3.77 mm",
      description: "100% within 10 mm",
    },

    {
      label: "Median Error",
      value: "3.54 mm",
      description: "Across all imaging protocols",
    },

    {
      label: "Training Cases",
      value: "222",
      description: "Protocol II + III",
    },
  ],

  vertebraResults: [
    {
      vertebra: "L4",
      meanError: "4.36 mm",
      under5mm: "70.0%",
      under10mm: "90.0%",
    },

    {
      vertebra: "L5",
      meanError: "3.65 mm",
      under5mm: "78.9%",
      under10mm: "97.4%",
    },

    {
      vertebra: "S1",
      meanError: "3.77 mm",
      under5mm: "75.0%",
      under10mm: "100%",
    },

    {
      vertebra: "S2",
      meanError: "4.33 mm",
      under5mm: "75.0%",
      under10mm: "97.7%",
    },

    {
      vertebra: "S3",
      meanError: "3.54 mm",
      under5mm: "83.7%",
      under10mm: "97.7%",
    },

    {
      vertebra: "S4",
      meanError: "4.79 mm",
      under5mm: "69.2%",
      under10mm: "89.7%",
    },

    {
      vertebra: "S5",
      meanError: "5.25 mm",
      under5mm: "62.5%",
      under10mm: "87.5%",
    },
  ],

  pipeline: [
    "NIfTI MRI upload",
    "Intensity preprocessing",
    "Patch extraction",
    "3D U-Net inference",
    "Heatmap generation",
    "S1 anchor detection",
    "Bidirectional vertebra labeling",
    "Interactive browser visualization",
  ],

  stack: [
    "Python",
    "PyTorch",
    "FastAPI",
    "3D U-Net",
    "SciPy",
    "Nibabel",
    "NIfTI",
    "Next.js",
    "TypeScript",
    "TailwindCSS",
  ],

  impact: {
    title: "Clinical & Research Impact",

    points: [
      "First method for individual S1–S5 sacral vertebra detection in pelvic MRI",

      "Supports reproducible lumbosacral morphometry",

      "Reduces observer variability in clinical workflows",

      "Enables large-scale population imaging studies",

      "Forms a foundation for unified pelvic MRI analysis systems",
    ],
  },

  links: {
    github: "",
    paper: "",
    demo: "/projects/spine-demo",
  },
};