import type { MetadataRoute } from "next";

const baseUrl = "https://saadahmad.de";

const routes = [
  "",
  "/thesis/spine",
  "/thesis/uterus",
  "/projects/spine-demo",
  "/projects/uterus-demo",
  "/projects/campusrag",
  "/projects/spotify",
  "/projects/weather-deep-learning",
  "/projects/store-sales-excel",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
