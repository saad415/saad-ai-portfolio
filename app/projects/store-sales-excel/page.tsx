import Navbar from "@/components/Navbar";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  ChartNoAxesCombined,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Filter,
  GitBranch,
  MapPinned,
  ShoppingBag,
  Sparkles,
  Users,
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
    <p className="text-3xl font-bold text-amber-400">{value}</p>
    <p className="mt-1 font-medium text-white">{label}</p>
    <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>
  </div>
);

export default function StoreSalesExcelProjectPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <Link
          href="/#projects"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-amber-400"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-amber-400">
          Excel / Business Analytics
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Store Sales Excel Dashboard
        </h1>
        <p className="mt-3 text-lg text-zinc-400 italic">
          Annual store sales report with cleaned customer data, interactive slicers, and actionable revenue insights
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {["Raw Orders", "Data Cleaning", "Age Groups", "Pivot Analysis", "Dashboard", "Recommendations"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-sm text-amber-300">
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
            href="https://github.com/saad415/StoreSales-Excel-"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            <GitBranch size={15} /> View on GitHub
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard value="12" label="Monthly Trend" sub="Orders and sales over time" />
          <MetricCard value="Top 5" label="Sales Regions" sub="State-level contribution analysis" />
          <MetricCard value="3" label="Age Segments" sub="Teenage, adult, senior customers" />
          <MetricCard value="Excel" label="Interactive Report" sub="Slicers for month, channel, category" />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-white/8" />
      </div>

      <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <FileSpreadsheet size={18} className="text-amber-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">What It Does</h2>
            <p className="mt-3 leading-8 text-zinc-400">
              This project turns raw store order data into an annual sales dashboard for business
              decision-making. The workbook cleans inconsistent customer fields, derives useful
              reporting dimensions, and visualizes performance across month, gender, age group,
              region, channel, order status, and category.
            </p>
            <p className="mt-3 leading-8 text-zinc-400">
              The final report is designed for stakeholder exploration: slicers let users filter
              the dashboard by month, sales channel, and product category so the same workbook can
              answer multiple business questions without rebuilding charts.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Database size={18} className="text-amber-400" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Data Preparation</h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  title: "Gender standardization",
                  body: "Normalized mixed labels such as M, Men, W, and Women into consistent Men and Women values.",
                },
                {
                  title: "Quantity cleanup",
                  body: "Resolved inconsistent numeric and text values so order quantities could be aggregated reliably.",
                },
                {
                  title: "Age group creation",
                  body: "Bucketed customers into Teenage, Adult, and Seniors segments to compare purchase behavior by life stage.",
                },
                {
                  title: "Month extraction",
                  body: "Derived month from the Date column to identify seasonal peaks and monthly revenue movement.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <ChevronRight size={16} className="mt-1 shrink-0 text-amber-400" />
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
        <div className="mb-6 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <BarChart3 size={18} className="text-amber-400" />
          </span>
          <div>
            <h2 className="mt-1 text-xl font-semibold text-white">Dashboard Preview</h2>
            <p className="mt-1 text-sm text-zinc-500">Excel report screenshot from the project repository</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
          <Image
            src="https://raw.githubusercontent.com/saad415/StoreSales-Excel-/main/ss.png"
            alt="Store sales Excel dashboard"
            width={1482}
            height={684}
            className="w-full object-cover"
            unoptimized
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-6 py-3">
            <p className="text-xs text-zinc-600">Monthly sales, status mix, channels, top regions, and customer segments</p>
            <a
              href="https://github.com/saad415/StoreSales-Excel-/blob/main/ss.png"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-400 transition hover:text-amber-300"
            >
              Open image <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <ChartNoAxesCombined size={18} className="text-amber-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Business Questions Answered</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Highest Sales Month",
              body: "Monthly order and sales charts reveal the period with the strongest revenue performance.",
              icon: BarChart3,
            },
            {
              title: "Gender Purchase Split",
              body: "A percentage chart compares total sales contribution from men and women customers.",
              icon: Users,
            },
            {
              title: "Top Sales Regions",
              body: "State-level bar charts identify the top 5 regions driving store sales.",
              icon: MapPinned,
            },
            {
              title: "Age Group Behavior",
              body: "Age-group analysis shows which customer segment contributes the most orders and sales.",
              icon: Users,
            },
            {
              title: "Channel Contribution",
              body: "Channel slicers and charts show which platforms contribute the most to sales revenue.",
              icon: ShoppingBag,
            },
            {
              title: "Category Performance",
              body: "Product category filters help identify the strongest-selling category mix.",
              icon: Filter,
            },
          ].map(({ title, body, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-amber-400/30"
            >
              <Icon size={18} className="text-amber-400" />
              <p className="mt-4 text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex gap-5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Sparkles size={18} className="text-amber-400" />
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Key Insights</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Women drove more purchases",
                body: "The gender split shows women as the stronger customer segment for this store.",
              },
              {
                title: "Adults contributed the most sales",
                body: "The adult segment, roughly ages 35-50, produced the highest sales contribution.",
              },
              {
                title: "Amazon led channel performance",
                body: "Amazon emerged as the top-performing channel, with Flipkart also recommended for ad focus.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/8 pt-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Recommended Action
            </p>
            <p className="mt-3 leading-7 text-zinc-400">
              Prioritize marketing toward women customers aged 30-49 in high-performing states
              such as Maharashtra, Karnataka, and Uttar Pradesh, with paid campaigns focused on
              Amazon and Flipkart.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <div className="mb-6 flex gap-5">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <FileSpreadsheet size={18} className="text-amber-400" />
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Skills Demonstrated</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                area: "Data Cleaning",
                detail: "Standardized inconsistent categorical and numeric fields to prepare raw store data for analysis.",
              },
              {
                area: "Excel Dashboarding",
                detail: "Built interactive charts and slicers for month, channel, and category filtering.",
              },
              {
                area: "Customer Segmentation",
                detail: "Created derived age-group dimensions to analyze customer behavior and sales contribution.",
              },
              {
                area: "Business Storytelling",
                detail: "Translated chart outputs into clear recommendations for customer targeting and channel spend.",
              },
            ].map(({ area, detail }) => (
              <div key={area} className="flex gap-3">
                <ChevronRight size={16} className="mt-1 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{area}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-4">
            <div className="flex flex-wrap gap-2">
              {["Microsoft Excel", "Data Cleaning", "Slicers", "Charts", "Sales Analytics", "Dashboard Design"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <a
              href="https://github.com/saad415/StoreSales-Excel-"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-5 py-2.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10"
            >
              <GitBranch size={15} /> View Source <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
