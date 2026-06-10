import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 w-full border-b border-white/[0.08] bg-[#070a0d]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-white">
          Saad Ahmad
        </Link>

        <div className="hidden gap-8 text-sm text-zinc-300 md:flex">
          <Link href="/#research" className="transition hover:text-teal-300">Thesis</Link>
          <Link href="/#experience" className="transition hover:text-teal-300">Experience</Link>
          <Link href="/#publications" className="transition hover:text-teal-300">Publications</Link>
          <Link href="/#projects" className="transition hover:text-teal-300">Projects</Link>
          <Link href="/ask" className="transition hover:text-teal-300">Ask AI</Link>
          <Link href="/tasks" className="transition hover:text-teal-300">Tasks</Link>
          <Link href="/#skills" className="transition hover:text-teal-300">Skills</Link>
          <Link href="/#contact" className="transition hover:text-teal-300">Contact</Link>
        </div>
      </div>
    </nav>
  );
}
