/**
 * Shared TypeScript types for API responses.
 * Intentionally structural — independent of the backend package.
 */

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "creator" | "admin";
  verified: boolean;
  avatar?: string;
  bio?: string;
  status: "active" | "suspended";
  createdAt: string;
  orders?: number;
  spent?: number;
}

export interface ApiBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  country?: string;
  description?: string;
  status?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  parent?: string | null;
  image?: string | null;
  productCount?: number;
  order?: number;
  status?: "active" | "hidden";
  children?: ApiCategory[];
}

export interface ApiProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand?: ApiBrand | string | null;
  category?: ApiCategory | string;
  subCategory?: ApiCategory | string | null;
  tags?: string[];
  price: number;
  currency?: string;
  isFree?: boolean;
  attributes?: {
    material?: string;
    style?: string;
    color?: string;
    dimensions?: { w?: number; l?: number; h?: number };
  };
  fileSizeMb?: number;
  formats?: string[];
  file?: {
    b2FileName?: string;
    sizeBytes?: number;
    mimeType?: string;
  };
  thumbnail?: string;
  hoverImage?: string;
  images?: string[];
  status: "draft" | "review" | "published" | "removed";
  publishedAt?: string;
  createdAt?: string;
  views?: number;
  likes?: number;
  downloadCount?: number;
  rating?: { avg: number; count: number };
}

export interface ApiBundle {
  id: string;
  slug: string;
  name: string;
  tag?: string;
  badge?: string;
  description?: string;
  image?: string;
  images?: string[];
  productIds: Array<string | ApiProduct>;
  bundlePrice: number;
  originalPrice: number;
  savingsPct: number;
  modelCount: number;
  fileSizeMb?: number;
  formats?: string[];
  status: "draft" | "published" | "removed";
}

export interface ApiBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  image?: string;
  author?: string;
  authorName?: string;
  tags?: string[];
  status: "draft" | "published";
  publishedAt?: string;
  createdAt?: string;
}

export interface ApiHeroSlideStyles {
  tagSize?: number;
  titleSize?: number;
  subSize?: number;
  ctaSize?: number;
  accentSize?: number;
}

export interface ApiHeroSlide {
  id: string;
  order: number;
  active: boolean;
  img: string;
  tag?: string;
  title: [string, string];
  sub?: string;
  cta?: string;
  href?: string;
  accent?: string;
  styles?: ApiHeroSlideStyles;
}

export interface ApiOrderItem {
  type: "product" | "bundle";
  product?: ApiProduct | null;
  bundle?: ApiBundle | null;
  qty: number;
  priceAtPurchase: number;
  title?: string;
}

export interface ApiOrder {
  id: string;
  buyer: string | ApiUser;
  items: ApiOrderItem[];
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  downloadToken?: string | null;
  downloadCount?: number;
  downloadLimit?: number;
  billing?: { name?: string; email?: string; country?: string };
  createdAt: string;
  payment?: { paidAt?: string; method?: string; zohoPaymentId?: string };
}

export interface DashboardStats {
  revenue: { value: number; deltaPct: number };
  orders: { value: number; deltaPct: number };
  customers: { value: number; deltaPct: number };
  products: { value: number; deltaPct: number };
}

export interface ApiSettings {
  storeName: string;
  supportEmail?: string;
  defaultCurrency: string;
  payments: { zohoEnabled?: boolean; stripeEnabled?: boolean; paypalEnabled?: boolean };
  social?: Record<string, string>;
  seo?: Record<string, string>;
  legal?: Record<string, string>;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ApiAuditLog {
  id: string;
  actor?: string | ApiUser;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  createdAt: string;
}
