import Hero              from "@/components/Hero";
import Navbar            from "@/components/Navbar";
import ResearchSection   from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection   from "@/components/ProjectsSection";
import SkillsSection     from "@/components/SkillsSection";
import PublicationsSection from "@/components/PublicationsSection";
import ContactSection    from "@/components/ContactSection";
import { Bot, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Project }  from "@/components/ProjectsSection";

// ── Add your real projects here ──
const projects: Project[] = [
  {
    title: "CampusRAG Inference Platform",
    category: "AI Infrastructure",
    categoryTag: "AI/ML",
    description:
      "Multi-tenant AI inference platform prototype with RAG chat, tenant-isolated document retrieval, usage accounting, request limits, Prometheus-style metrics, and a LiteLLM/vLLM-ready architecture.",
    pipeline: ["Tenant Login", "Document Upload", "RAG Retrieval", "LLM Gateway", "Usage Accounting", "Metrics"],
    tech: ["Next.js", "FastAPI", "RAG", "Docker", "SQLite", "ChromaDB", "Prometheus"],
    href: "/projects/campusrag",
  },
  {
    title: "Medical MRI Annotation Platform",
    category: "Medical Imaging",
    categoryTag: "Full Stack",
    description:
      "Production-style medical imaging platform with browser NIfTI review, 3-plane annotation, segmentation masks, versioned FastAPI/Postgres state, Slicer exports, ML-ready datasets, and a RAG-backed AI project assistant.",
    pipeline: ["NIfTI Upload", "3D Viewer", "Segmentation", "Version History", "Slicer Export", "RAG Assistant"],
    tech: ["Next.js", "FastAPI", "PostgreSQL", "pgvector", "Groq", "Docker", "NIfTI"],
    href: "/projects/medical-annotation",
  },
  {
    title: "Topology-Aware Microstructure Platform",
    category: "Materials AI",
    categoryTag: "Research",
    description:
      "Interactive descriptor platform for synthetic two-phase microstructures with morphology metrics, Betti curves, 0D persistence pairs, and parameter sweeps for structure-property analysis.",
    pipeline: ["Field Generation", "Thresholding", "Morphology", "Betti Curves", "Persistence", "Descriptor Dashboard"],
    tech: ["TypeScript", "Topology", "Persistent Homology", "Microstructures", "TDA"],
    href: "/projects/microstructure-topology",
  },
  {
    title: "Portfolio Website",
    category: "Full Stack",
    categoryTag: "Full Stack",
    description:
      "This site — a Next.js 14 app with live model inference, animated components, and a FastAPI backend.",
    tech: ["Next.js", "TypeScript", "Tailwind", "Framer Motion"],
    href: "/",
  },
  {
    title: "Spotify Analytics Pipeline",
    category: "Data Engineering",
    categoryTag: "Data Engineering",
    description:
      "End-to-end cloud pipeline that pulls Spotify listening data on a daily schedule, stores it in S3, and surfaces track popularity, audio features, and artist trends in interactive Power BI dashboards.",
    pipeline: ["Spotify API", "Airflow DAG", "AWS EC2", "AWS S3", "Power BI"],
    tech: ["Python", "Apache Airflow", "AWS EC2", "AWS S3", "Power BI"],
    href: "/projects/spotify",
  },
  {
    title: "Weather Deep Learning Classifier",
    category: "Computer Vision",
    categoryTag: "AI/ML",
    description:
      "Transfer-learning image classifier that uses a fine-tuned VGG16 model to identify weather conditions from uploaded images, served through a Flask web app and Docker deployment.",
    pipeline: ["Image Upload", "Flask API", "VGG16 CNN", "Weather Class", "Render Deploy"],
    tech: ["Python", "TensorFlow", "Keras", "VGG16", "Flask", "Docker"],
    href: "/projects/weather-deep-learning",
  },
  {
    title: "Store Sales Excel Dashboard",
    category: "Business Analytics",
    categoryTag: "Data Engineering",
    description:
      "Interactive Excel sales report that cleans inconsistent store order data and uses slicers, charts, and pivot-style analysis to surface customer, region, channel, and category insights.",
    pipeline: ["Raw Sales Data", "Excel Cleaning", "Age Groups", "Charts", "Slicers", "Insights"],
    tech: ["Excel", "Data Cleaning", "Pivot Analysis", "Slicers", "Dashboarding"],
    href: "/projects/store-sales-excel",
  },
];

const Divider = () => (
  <div className="h-px w-full bg-white/[0.07]" />
);

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      {/* 1. Hero */}
      <Hero />

      <Divider />

      {/* 2. Thesis / Research */}
      <ResearchSection />
      <Divider />

      {/* 3. Work Experience */}
      <ExperienceSection />

      <Divider />

      {/* 4. Publications */}
      <PublicationsSection />

      <Divider />

      {/* 5. Projects */}
      <ProjectsSection projects={projects} />

      <Divider />

      {/* 6. Skills */}
      <SkillsSection />

      <Divider />

      {/* 7. Contact */}
      <ContactSection />

      <Link
        href="/ask"
        aria-label="Ask Saad AI"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-teal-300/35 bg-teal-300 px-4 py-3 text-sm font-semibold text-[#04100f] shadow-2xl shadow-teal-950/35 transition hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-[#070a0d]"
      >
        <Bot size={17} />
        <span className="hidden sm:inline">Ask AI</span>
        <ArrowUpRight size={15} className="hidden sm:block" />
      </Link>
    </main>
  );
}
