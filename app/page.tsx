import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import Stats from "@/components/Stats";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <Stats />
      <Hero />

      <section id="about" className="mx-auto max-w-7xl px-6 py-32">
        <h2 className="text-4xl font-bold">About</h2>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          I specialize in deep learning, medical image analysis, and production-ready
          AI systems. My work includes anatomical landmark detection in MRI,
          full-stack software development, and cloud-native engineering.
        </p>
      </section>

      <section id="projects" className="mx-auto max-w-7xl px-6 py-32">
        <h2 className="text-4xl font-bold">Featured Projects</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>

      <section id="skills" className="mx-auto max-w-7xl px-6 py-32">
        <h2 className="text-4xl font-bold">Technical Skills</h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {[
            "Python",
            "PyTorch",
            "FastAPI",
            "React",
            "Next.js",
            "TypeScript",
            "Docker",
            "GitHub Actions",
            "CI/CD",
            "Kubernetes",
            "Medical Imaging",
            "MLOps",
          ].map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-gray-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-6 py-32">
        <h2 className="text-4xl font-bold">Contact</h2>
        <p className="mt-6 text-lg text-gray-400">
          Open to AI, Data Science, Full Stack, and MLOps opportunities.
        </p>
      </section>
    </main>
  );
}