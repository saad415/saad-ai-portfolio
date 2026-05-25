export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#070a0d]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="text-xl font-bold text-white">
          Saad Ahmad
        </a>

        <div className="hidden gap-8 text-sm text-zinc-300 md:flex">
          <a href="#research" className="transition hover:text-teal-300">Thesis</a>
          <a href="#experience" className="transition hover:text-teal-300">Experience</a>
          <a href="#publications" className="transition hover:text-teal-300">Publications</a>
          <a href="#projects" className="transition hover:text-teal-300">Projects</a>
          <a href="#skills" className="transition hover:text-teal-300">Skills</a>
          <a href="#contact" className="transition hover:text-teal-300">Contact</a>
        </div>
      </div>
    </nav>
  );
}
