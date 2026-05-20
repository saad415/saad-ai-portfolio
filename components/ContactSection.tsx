"use client";

import { motion } from "framer-motion";
import { Mail, Phone, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

const contactLinks = [
  {
    label: "WhatsApp",
    href: "https://api.whatsapp.com/send?phone=4917679847659",
    icon: FaWhatsapp,
  },
  {
    label: "Email",
    href: "mailto:saad415415@gmail.com",
    icon: Mail,
  },
];

export default function ContactSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);

  const copyContact = async (value: string, type: "phone" | "email") => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="relative w-full px-[5vw] py-28">
      <div className="pointer-events-none absolute left-0 top-1/2 h-80 w-80 -translate-x-1/3 -translate-y-1/2 rounded-full bg-teal-300/6 blur-[90px]" />

      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-300">
          Contact
        </p>
        <h2
          className="font-semibold tracking-tight"
          style={{ fontSize: "clamp(1.6rem, 3vw, 3rem)" }}
        >
          Let&apos;s Connect
        </h2>
        <p
          className="mt-4 max-w-2xl leading-7 text-zinc-400"
          style={{ fontSize: "clamp(0.95rem, 1.05vw, 1.1rem)" }}
        >
          Have an AI engineering opportunity, research collaboration, or product idea in mind?
          Send a short message and I&apos;ll get back to you.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
        <motion.form
          action="https://formspree.io/f/mjgzgrdv"
          method="POST"
          onSubmit={handleSubmit}
          initial={{ y: 24 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-7 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
              Name
              <input
                type="text"
                name="name"
                required
                autoComplete="name"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60"
                placeholder="Your name"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60"
                placeholder="you@example.com"
              />
            </label>
          </div>

          <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Message
            <textarea
              name="message"
              required
              rows={6}
              className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-teal-300/60"
              placeholder="Tell me how I can help..."
            />
          </label>

          <input type="hidden" name="_subject" value="New portfolio message" />

          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#04100f] transition hover:bg-teal-200"
          >
            <Send size={15} /> {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <p className="mt-4 text-sm font-medium text-teal-300">
              Message sent. I&apos;ll get back to you soon.
            </p>
          )}

          {status === "error" && (
            <p className="mt-4 text-sm font-medium text-red-300">
              Something went wrong. Please try again or email me directly.
            </p>
          )}
        </motion.form>

        <motion.aside
          initial={{ y: 24 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="rounded-3xl border border-white/[0.08] bg-[#0b1014]/65 p-7 sm:p-8"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
            <Mail size={19} className="text-teal-300" />
          </span>
          <h3
            className="mt-6 font-semibold text-white"
            style={{ fontSize: "clamp(1.1rem, 1.4vw, 1.5rem)" }}
          >
            Prefer direct contact?
          </h3>
          <p className="mt-3 leading-7 text-zinc-400">
            Reach me directly by WhatsApp or email.
          </p>

          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <button
              type="button"
              onClick={() => copyContact("+49 176 79847659", "phone")}
              className="flex items-center gap-3 text-left transition hover:text-teal-300"
            >
              <Phone size={15} className="text-teal-300" />
              <span>+49 176 79847659</span>
              {copied === "phone" && <span className="text-xs text-teal-300">Copied</span>}
            </button>
            <button
              type="button"
              onClick={() => copyContact("saad415415@gmail.com", "email")}
              className="flex items-center gap-3 text-left transition hover:text-teal-300"
            >
              <Mail size={15} className="text-teal-300" />
              <span>saad415415@gmail.com</span>
              {copied === "email" && <span className="text-xs text-teal-300">Copied</span>}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {contactLinks.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-teal-300/10 hover:text-teal-200"
                >
                  <Icon size={16} />
                  {link.label}
                </a>
              );
            })}
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
