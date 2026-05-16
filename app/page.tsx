import Hero              from "@/components/Hero";
import Navbar            from "@/components/Navbar";
import ResearchSection   from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection   from "@/components/ProjectsSection";
import type { Project }  from "@/components/ProjectsSection";

// ── Add your real projects here ──
const projects: Project[] = [
  {
    title: "Spine Landmark Detection",
    category: "Medical AI",
    categoryTag: "AI/ML",
    description:
      "Production 3D U-Net that detects vertebral landmarks in sacral MRI with 96% accuracy. Served live via FastAPI.",
    tech: ["PyTorch", "FastAPI", "Docker", "Next.js"],
    href: "/projects/spine-demo",
  },
  {
    title: "MRI Preprocessing Pipeline",
    category: "MLOps",
    categoryTag: "AI/ML",
    description:
      "Automated DICOM ingestion, bias-field correction, and NIfTI conversion pipeline with a web dashboard for radiologists.",
    tech: ["Python", "SimpleITK", "Celery", "React"],
    href: "/projects/mri-pipeline",
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
    title: "Vertebral Labelling Study",
    category: "Research",
    categoryTag: "Research",
    description:
      "Comparative study of atlas-based vs deep learning approaches for vertebral labelling in low-field MRI.",
    tech: ["Python", "PyTorch", "ANTs", "LaTeX"],
    href: "/projects/labelling-study",
  },
];

const Divider = () => (
  <div className="h-px w-full bg-white/10" />
);

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
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

      {/* 4. Projects */}
      <ProjectsSection projects={projects} />
    </main>
  );
}