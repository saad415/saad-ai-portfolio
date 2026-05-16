import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  ArrowUpRight,
  Brain,
  ChevronRight,
  CloudSun,
  Container,
  GitBranch,
  Image as ImageIcon,
  Layers3,
  Server,
} from "lucide-react";
import Link from "next/link";

const MetricCard = ({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <p className="text-3xl font-bold text-sky-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

const weatherClasses = ["Cloudy", "Foggy", "Rainy", "Shine", "Sunrise"];

export default function WeatherDeepLearningProjectPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-sky-400"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-sky-400">
          Computer Vision / Deep Learning
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Weather Deep Learning Classifier
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          Image-based weather condition recognition using transfer learning with VGG16
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {["Image Upload", "Flask API", "Keras Preprocess", "VGG16 CNN", "Weather Prediction"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-1.5 text-sm text-sky-300">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight size={14} className="shrink-0 text-zinc-600" />
                )}
              </span>
            )
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://github.com/saad415/Weather-Deep-Learning"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-sky-300"
          >
            <GitBranch size={15} /> View on GitHub
            <ArrowUpRight size={14} />
          </a>
          <a
            href="https://weatherdeeplearning.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-400"
          >
            Live App
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="VGG16" label="Model Backbone" sub="Pretrained CNN feature extractor" />
          <MetricCard value="224px" label="Input Resolution" sub="Keras image preprocessing" />
          <MetricCard value="5" label="Weather Classes" sub="Cloud, fog, rain, shine, sunrise" />
          <MetricCard value="Docker" label="Deployment Path" sub="Flask container hosted on Render" />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <CloudSun size={18} className="text-sky-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">What It Does</h2>
            <p className="mt-3 leading-8 text-zinc-400">
              This project is a weather image classification application. A user uploads an outdoor
              image, the Flask backend preprocesses it to the model input size, and a trained Keras
              model predicts the visible weather condition.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              The classifier focuses on practical image-based recognition rather than sensor-based
              forecasting. It demonstrates a complete computer vision workflow: transfer learning,
              image preprocessing, web inference, and containerized deployment.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Brain size={18} className="text-sky-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Why These Choices</h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  title: "VGG16 for transfer learning",
                  body: "A pretrained convolutional backbone provides strong visual features without requiring a massive weather-specific training dataset from scratch.",
                },
                {
                  title: "Keras and TensorFlow for model serving",
                  body: "The saved model is loaded directly in the Flask process, keeping the inference path simple and easy to deploy.",
                },
                {
                  title: "Flask for the web interface",
                  body: "A small upload-and-predict app fits the project scope and makes model behavior testable through a browser.",
                },
                {
                  title: "Docker for deployment",
                  body: "Packaging the model, dependencies, and Flask app into one container makes hosting on Render reproducible.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-sky-400" />
                  <p className="leading-7 text-zinc-400">
                    <span className="font-semibold text-white">{title}:</span> {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Layers3 size={18} className="text-sky-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Architecture</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 space-y-8">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 1 - User Input
            </p>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-zinc-300">
                  <p className="font-medium text-white">Browser Upload</p>
                  <p className="mt-0.5 text-xs text-zinc-500">JPG / PNG image</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-zinc-300">
                  <p className="font-medium text-white">Flask /predict</p>
                  <p className="mt-0.5 text-xs text-zinc-500">multipart form upload</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 2 - Model Inference
            </p>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
                  <p className="font-medium text-white">Resize to 224 x 224</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Keras image loader</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
                  <p className="font-medium text-white">Scale Pixels</p>
                  <p className="mt-0.5 text-xs text-zinc-500">x / 255 normalization</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
                  <p className="font-medium text-white">model_vgg16.h5</p>
                  <p className="mt-0.5 text-xs text-zinc-500">argmax class prediction</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-600">
              Layer 3 - Deployment
            </p>
            <div className="rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
                  <p className="font-medium text-white">Dockerfile</p>
                  <p className="mt-0.5 text-xs text-zinc-500">python:3.9-slim-buster</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm">
                  <p className="font-medium text-white">Render</p>
                  <p className="mt-0.5 text-xs text-zinc-500">hosted Flask container</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/8 pt-2">
            {["Python", "TensorFlow", "Keras", "VGG16", "Flask", "Docker", "Render", "NumPy", "Matplotlib"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <ImageIcon size={18} className="text-sky-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Prediction Classes</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {weatherClasses.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center transition-colors hover:border-sky-400/30"
            >
              <CloudSun className="mx-auto text-sky-400" size={22} />
              <p className="mt-3 text-sm font-semibold text-white">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <div className="mb-6 flex gap-5">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Server size={18} className="text-sky-400" />
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Skills Demonstrated</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                area: "Transfer Learning",
                detail: "Fine-tuned a pretrained VGG16 convolutional network for a custom weather image classification task.",
                icon: Brain,
              },
              {
                area: "Image Inference Pipeline",
                detail: "Implemented upload handling, image resizing, pixel normalization, batch dimension expansion, and class decoding.",
                icon: ImageIcon,
              },
              {
                area: "Flask Model Serving",
                detail: "Exposed the trained Keras model through a lightweight web app with an AJAX-powered prediction endpoint.",
                icon: Server,
              },
              {
                area: "Container Deployment",
                detail: "Packaged the application and dependencies with Docker for cloud deployment on Render.",
                icon: Container,
              },
            ].map(({ area, detail, icon: Icon }) => (
              <div key={area} className="flex gap-3">
                <Icon size={16} className="mt-1 shrink-0 text-sky-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{area}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-4">
            <div className="flex flex-wrap gap-2">
              {["Computer Vision", "CNN", "Keras", "Flask", "Docker", "Render"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <a
              href="https://github.com/saad415/Weather-Deep-Learning"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 px-5 py-2.5 text-sm font-semibold text-sky-400 transition hover:bg-sky-400/10"
            >
              <GitBranch size={15} /> View Source <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
