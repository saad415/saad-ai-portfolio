export type PortfolioSource = {
  id: string;
  title: string;
  url: string;
  content: string;
};

export type RetrievedPortfolioSource = PortfolioSource & {
  score: number;
};

export const portfolioKnowledge: PortfolioSource[] = [
  {
    id: "profile",
    title: "Profile Overview",
    url: "/",
    content:
      "Saad Ahmad is an AI Engineer, medical imaging specialist, and full-stack developer based in Germany/Europe. He builds AI systems that move from research notebooks to usable products, spanning deep learning, medical image analysis, backend inference APIs, and interactive web interfaces. His portfolio highlights 3D MRI systems, full-stack ML applications, and software engineering experience.",
  },
  {
    id: "experience",
    title: "Work Experience",
    url: "/#experience",
    content:
      "Saad worked as a Research Assistant at Smart Imaging Lab, Universitatsklinikum Erlangen from 09/2025 to 03/2026, designing 3D U-Net models for lumbosacral vertebral landmark localization and uterine landmark detection in pelvic MRI. He validated models on multi-center, multi-vendor MRI datasets from 0.55T to 3T. He also worked as an AI Engineer at Sofitsians from 04/2024 to 02/2025, building AI applications with LLMs, OpenAI APIs, React.js, REST APIs, RAG pipelines, semantic search, prompt engineering, and frontend components. Earlier, he worked as a Software Developer (.NET) at Sofitsians from 11/2019 to 01/2021, developing and maintaining full-stack web applications with C#, ASP.NET MVC, SQL Server, relational schemas, stored procedures, complex SQL queries, REST APIs, backend services, frontend support, and third-party system integrations.",
  },
  {
    id: "skills",
    title: "Technical Skills",
    url: "/#skills",
    content:
      "Saad's skills include PyTorch, MONAI, nnUNet, Swin-UNETR, U-Net, heatmap regression, medical image segmentation, DICOM, NIfTI, Python, FastAPI, Docker, Linux, REST APIs, Git, OpenAI API, RAG pipelines, semantic search, LLM applications, prompt engineering, agentic workflows, LLM evaluation, vector databases, LangChain, model deployment, and AI automation.",
  },
  {
    id: "spine-thesis",
    title: "Thesis I: Lumbosacral Vertebra Localization",
    url: "/thesis/spine",
    content:
      "Saad's first master's thesis project at FAU Erlangen-Nuremberg and Smart Imaging Lab focuses on automatic lumbosacral vertebra localization in variable field-of-view pelvic MRI. The problem is difficult because pelvic MRI often has variable coverage, anatomical diversity, and partial visibility of the spine. Saad developed a dual-head 3D U-Net for volumetric vertebra landmark detection in sagittal T2-weighted pelvic MRI. The model jointly predicts vertebral center heatmaps and an anatomical S1 reference point, enabling S1-anchored labeling across incomplete or variable spine coverage. Reported results include 4.21 mm mean localization error, S1-S5 individual sacral detection, and about 1.4 seconds per-volume inference. The stack includes Python, PyTorch, 3D U-Net, FastAPI, Docker, NIfTI, and nibabel.",
  },
  {
    id: "uterus-thesis",
    title: "Thesis II: Uterine Anatomical Landmark Detection",
    url: "/thesis/uterus",
    content:
      "Saad's second master's thesis project focuses on automatic detection of uterine anatomical landmarks in pelvic MRI. Uterine biometry measures fundal thickness, body length, cervical length, and AP diameter, but manual measurement has inter-observer variability. Saad built preprocessing for raw MRI data from three scanner protocols, used nnU-Net v2 uterine segmentation as a region of interest, and trained a multi-decoder 3D U-Net with a shared encoder and independent decoder branches for landmark groups. He introduced SharpHeatmapLoss, combining MSE with a cubic penalty term to create sharper heatmaps, and used ROI-guided inference with uterine segmentation masks. Results include 4.52 mm overall mean error across 192 landmarks and 32 test cases, 2.90 mm best landmark precision for Cavity Cervix, 3.66 mm median localization error, and under 60 second end-to-end reporting.",
  },
  {
    id: "publication",
    title: "Publication",
    url: "/#publications",
    content:
      "Saad is a co-author on 'Real-Time Automated Analysis and Reporting of Uterine Volumetry, Biometry, and Incidental Findings in Female Pelvic MRI', submitted to IEEE Transactions on Medical Imaging in 2025. Authors include Bhatia D., Ahmad S., Tripathy S., Bustos Vivas M.C., Kratzsch L., Knupfer A., Aviles Verdera J., and Hutter J.",
  },
  {
    id: "medical-annotation-platform",
    title: "Medical MRI Annotation Platform",
    url: "/projects/medical-annotation",
    content:
      "The Medical MRI Annotation Platform is a browser-based volumetric MRI annotation workstation and production-style full-stack medical imaging system. It supports NIfTI upload, 3-plane viewing, editable landmarks, segmentation masks, 3D region growing tools, Slicer-compatible exports, and ML-ready dataset outputs. Radiologists and researchers can upload .nii or .nii.gz files, navigate axial, coronal, and sagittal planes with slice sliders, place point landmarks, paint segmentation masks, erase masks, select and move annotations, rename landmarks, change colors and sizes, save to database, load from database, export JSON, export 3D Slicer .mrk.json, export segmentation masks, and export segmentation .nii.gz. The architecture uses Next.js, TypeScript, HTML5 Canvas, nifti-reader-js, FastAPI, Neon/PostgreSQL, Supabase Storage, Railway, Docker, Postgres/pgvector, hybrid RAG retrieval, optional Jina embeddings, and Groq generation for the portfolio AI assistant. Every save creates versioned JSONB snapshots in Postgres so annotations can be reviewed, compared, restored, and consumed by ML teams.",
  },
  {
    id: "medical-annotation-live",
    title: "Live Medical Annotation Workflow",
    url: "/projects/medical-annotation-live",
    content:
      "The live medical annotation page demonstrates a standalone annotation workflow for clinical experts and ML teams. It has a case list, MRI upload, browser rendering, landmark mode, segmentation mode, brush editing, eraser, 3D region grow seed, zoom and slice controls, clinical review notes, database save/load, and export routes. It demonstrates state management for volumetric MRI annotations, persistence through a Python FastAPI backend, storage of annotation history, and dataset outputs that downstream ML teams can use for training, validation, or review.",
  },
  {
    id: "spine-demo",
    title: "Spine Landmark Demo",
    url: "/projects/spine-demo",
    content:
      "The Spine Landmark Demo is an interactive AI demo for sacral spine landmark detection from NIfTI MRI volumes. Visitors can select anonymized sample cases, load MRI volumes, and visualize real model predictions from a trained 3D U-Net. It shows sagittal, coronal, and axial volume viewing and predicted landmarks such as L5 and S1-S5 with voxel coordinates.",
  },
  {
    id: "uterus-demo",
    title: "Uterus Landmark Demo",
    url: "/projects/uterus-demo",
    content:
      "The Uterus Demo is an interactive project page showing model output for uterine anatomical landmark detection in pelvic MRI. It connects to the uterine landmark thesis work, showing how trained model predictions can be surfaced in a browser-based viewer for inspection.",
  },
  {
    id: "spotify",
    title: "Spotify Analytics Pipeline",
    url: "/projects/spotify",
    content:
      "The Spotify Analytics Pipeline is an end-to-end data engineering project. It pulls Spotify listening data on a daily schedule, stores it in AWS S3, and surfaces track popularity, audio features, and artist trends in interactive Power BI dashboards. The stack includes Python, Apache Airflow, AWS EC2, AWS S3, Power BI, and the Spotify API.",
  },
  {
    id: "weather",
    title: "Weather Deep Learning Classifier",
    url: "/projects/weather-deep-learning",
    content:
      "The Weather Deep Learning Classifier is a transfer-learning image classifier using a fine-tuned VGG16 model to identify weather conditions from uploaded images. It is served through a Flask web app with Docker deployment and uses Python, TensorFlow, Keras, VGG16, Flask, Docker, and Render.",
  },
  {
    id: "store-sales",
    title: "Store Sales Excel Dashboard",
    url: "/projects/store-sales-excel",
    content:
      "The Store Sales Excel Dashboard is a business analytics project. It cleans inconsistent store order data and uses slicers, charts, and pivot-style analysis to surface customer, region, channel, and category insights. It demonstrates Excel data cleaning, pivot analysis, slicers, and dashboarding.",
  },
];

const STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "saad",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with",
  "you",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function retrievePortfolioSources(
  question: string,
  limit = 5
): RetrievedPortfolioSource[] {
  const queryTokens = tokenize(question);
  const querySet = new Set(queryTokens);

  if (querySet.size === 0) {
    return portfolioKnowledge.slice(0, limit).map((source) => ({
      ...source,
      score: 0,
    }));
  }

  return portfolioKnowledge
    .map((source) => {
      const titleTokens = tokenize(source.title);
      const contentTokens = tokenize(source.content);
      const titleMatches = titleTokens.filter((token) => querySet.has(token));
      const contentMatches = contentTokens.filter((token) => querySet.has(token));
      const phraseBoost = source.content
        .toLowerCase()
        .includes(question.toLowerCase().trim())
        ? 3
        : 0;

      return {
        ...source,
        score: titleMatches.length * 3 + contentMatches.length + phraseBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter((source, index) => source.score > 0 || index < 3)
    .slice(0, limit);
}
