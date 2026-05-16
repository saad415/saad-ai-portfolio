import Hero              from "@/components/Hero";
import Navbar            from "@/components/Navbar";
import ResearchSection   from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import ProjectsSection   from "@/components/ProjectsSection";
import type { Project }  from "@/components/ProjectsSection";

// ── Add your real projects here ──
const projects: Project[] = [
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
