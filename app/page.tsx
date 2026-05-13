import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pt-24">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-green-400">
          AI Engineer • Deep Learning • Medical Imaging
        </p>

        <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl">
          Building interactive AI systems from research models to production apps.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400 md:text-xl">
          I develop deep learning models, medical imaging pipelines, and full-stack
          AI applications using PyTorch, FastAPI, React, Next.js, Docker, and CI/CD.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#projects"
            className="rounded-full bg-green-400 px-6 py-3 font-semibold text-black hover:bg-green-300"
          >
            View Projects
          </a>

          <a
            href="#contact"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:border-green-400 hover:text-green-400"
          >
            Contact Me
          </a>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold">About</h2>
        <p className="mt-4 max-w-3xl text-gray-400">
          I specialize in deep learning, medical image analysis, and production-ready
          AI systems. My work includes anatomical landmark detection in MRI,
          full-stack software development, and cloud-native engineering.
        </p>
      </section>

      <section id="projects" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold">Featured Projects</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-semibold">
              Sacral Spine Landmark Detection
            </h3>
            <p className="mt-3 text-gray-400">
              3D U-Net based landmark localization for lumbosacral vertebrae in
              pelvic MRI using heatmap regression and S1-anchored labeling.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-semibold">
              Uterine Landmark Detection
            </h3>
            <p className="mt-3 text-gray-400">
              Multi-decoder 3D U-Net system for automatic uterine biometry
              landmark detection in T2-weighted pelvic MRI.
            </p>
          </div>
        </div>
      </section>

      <section id="skills" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold">Skills</h2>

        <div className="mt-8 flex flex-wrap gap-3">
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

      <section id="contact" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold">Contact</h2>
        <p className="mt-4 text-gray-400">
          Open to AI, Data Science, Full Stack, and MLOps opportunities.
        </p>
      </section>
    </main>
  );
}