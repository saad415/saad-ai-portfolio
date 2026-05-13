export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="text-xl font-bold text-white">
          Saad Ahmad
        </a>

        <div className="hidden gap-8 text-sm text-gray-300 md:flex">
          <a href="#about" className="hover:text-green-400">About</a>
          <a href="#projects" className="hover:text-green-400">Projects</a>
          <a href="#skills" className="hover:text-green-400">Skills</a>
          <a href="#contact" className="hover:text-green-400">Contact</a>
        </div>
      </div>
    </nav>
  );
}