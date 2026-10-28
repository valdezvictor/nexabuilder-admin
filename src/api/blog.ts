// api/blog.ts — Blog CMS API client
import { http } from "../lib/http";

export interface BlogArticle {
  id: number;
  site_id: string;
  slug: string;
  language: string;
  hreflang_pair_slug?: string;
  h1: string;
  seo_title: string;
  meta_description: string;
  canonical_url?: string;
  primary_keyword?: string;
  deck?: string;
  body_html?: string;
  toc_auto: boolean;
  featured_image_url?: string;
  featured_image_alt?: string;
  featured_image_caption?: string;
  og_image_url?: string;
  category?: string;
  tags?: string;
  related_article_ids?: string;
  author_name: string;
  author_bio?: string;
  author_avatar?: string;
  status: "draft" | "review" | "scheduled" | "published" | "archived";
  published_at?: string;
  scheduled_at?: string;
  modified_at?: string;
  created_at?: string;
  created_by?: string;
  updated_by?: string;
  schema_json?: string;
  schema_types?: string;
  geo_region?: string;
  geo_cities?: string;
  aeo_target_questions?: string;
  og_title?: string;
  og_description?: string;
  reading_time_minutes?: number;
  word_count?: number;
}

export interface ArticleList {
  articles: BlogArticle[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const ADMIN_KEY = import.meta.env.VITE_CMS_ADMIN_KEY || "";

const adminHeaders = () => ({
  headers: { "X-Admin-Key": ADMIN_KEY },
});

export const blogApi = {
  list: (siteId: string, page = 1, status?: string) =>
    http.get<ArticleList>(
      `/api/blog/admin/${siteId}?page=${page}&per_page=20${status ? `&status=${status}` : ""}`,
      adminHeaders()
    ),

  get: (id: number) =>
    http.get<BlogArticle>(`/api/blog/admin/article/${id}`, adminHeaders()),

  create: (data: Partial<BlogArticle>) =>
    http.post<BlogArticle>("/api/blog/admin/", data, adminHeaders()),

  update: (id: number, data: Partial<BlogArticle>) =>
    http.put<BlogArticle>(`/api/blog/admin/article/${id}`, data, adminHeaders()),

  publish: (id: number) =>
    http.post<BlogArticle>(`/api/blog/admin/article/${id}/publish`, {}, adminHeaders()),

  unpublish: (id: number) =>
    http.post<BlogArticle>(`/api/blog/admin/article/${id}/unpublish`, {}, adminHeaders()),

  archive: (id: number) =>
    http.delete(`/api/blog/admin/article/${id}`, adminHeaders()),
};

export const SITE_OPTIONS = [
  { value: "unapiscina",              label: "UnaPiscina.com",               lang: "es" },
  { value: "renovationremodel",       label: "RenovationRemodel.com",        lang: "en" },
  { value: "iquotesai-construction",  label: "iQuotesAI — Construction",     lang: "en" },
  { value: "iquotesai-insurance",     label: "iQuotesAI — Insurance",        lang: "en" },
  { value: "iquotesai-loans",         label: "iQuotesAI — Loans",            lang: "en" },
  { value: "iquotesai-solar",         label: "iQuotesAI — Solar",            lang: "en" },
  { value: "iquotesai-education",     label: "iQuotesAI — Education",        lang: "en" },
  { value: "nexaibuilder",            label: "NexAIBuilder.com",             lang: "en" },
  { value: "nexabuilder",             label: "NexaBuilder.com",              lang: "en" },
];

export const CATEGORIES: Record<string, string[]> = {
  unapiscina: ["Precios y Presupuestos","Construcción y Materiales","Guías y Decisiones","Mantenimiento","Diseño y Acabados"],
  renovationremodel: ["Cost Guides","Material Guides","Project Guides","Financing","Tips & How-To"],
  default: ["Guides","Cost Guides","How-To","Tips","News"],
};

export const STATUS_COLORS: Record<string, string> = {
  draft:     "#9ca3af",
  review:    "#f59e0b",
  scheduled: "#3b82f6",
  published: "#10b981",
  archived:  "#6b7280",
};
