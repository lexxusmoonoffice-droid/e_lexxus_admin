"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiError } from "./api";
import type {
  ApiAuditLog,
  ApiBlogPost,
  ApiBrand,
  ApiBundle,
  ApiCategory,
  ApiHeroSlide,
  ApiNotification,
  ApiOrder,
  ApiProduct,
  ApiSettings,
  ApiUser,
  DashboardStats,
  Paginated,
} from "./types";

/* ─── dashboard ─────────────────────────────────────── */

export function useDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: () => apiGet<DashboardStats>("/admin/dashboard/stats"),
  });
}

export function useRevenueChart(year?: number) {
  return useQuery({
    queryKey: ["admin", "dashboard", "revenue", year],
    queryFn: () => apiGet<{ year: number; months: number[] }>("/admin/dashboard/revenue", year ? { year } : undefined),
  });
}

export function useTopCategories() {
  return useQuery({
    queryKey: ["admin", "dashboard", "top-categories"],
    queryFn: () => apiGet<{ data: Array<{ name: string; sales: number; pct: number }> }>(
      "/admin/dashboard/top-categories",
    ),
  });
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ["admin", "dashboard", "recent-orders", limit],
    queryFn: () => apiGet<{ data: ApiOrder[] }>(`/admin/dashboard/recent-orders`, { limit }),
  });
}

/* ─── products ──────────────────────────────────────── */

export function useAdminProducts(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => apiGet<Paginated<ApiProduct>>("/admin/products", params),
  });
}

export function useAdminProduct(id?: string) {
  return useQuery({
    queryKey: ["admin", "products", "detail", id],
    queryFn: () => apiGet<{ product: ApiProduct }>(`/admin/products/${id}`),
    enabled: !!id,
  });
}

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return (...keys: string[]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] }));
  };
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiProduct>) => apiPost<{ product: ApiProduct }>("/admin/products", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiProduct>) => apiPut<{ product: ApiProduct }>(`/admin/products/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function usePatchProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/admin/products/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useBulkProductAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; action: "publish" | "unpublish" | "delete" }) =>
      apiPost<{ action: string; affected: number }>("/admin/products/bulk", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

/* ─── bundles ───────────────────────────────────────── */

export function useAdminBundles(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "bundles", params],
    queryFn: () => apiGet<Paginated<ApiBundle>>("/admin/bundles", params),
  });
}

export function useAdminBundle(id?: string) {
  return useQuery({
    queryKey: ["admin", "bundles", "detail", id],
    queryFn: () => apiGet<{ bundle: ApiBundle }>(`/admin/bundles/${id}`),
    enabled: !!id,
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBundle>) => apiPost<{ bundle: ApiBundle }>("/admin/bundles", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bundles"] }),
  });
}

export function useUpdateBundle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBundle>) => apiPut<{ bundle: ApiBundle }>(`/admin/bundles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bundles"] }),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/bundles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bundles"] }),
  });
}

/* ─── categories / brands ───────────────────────────── */

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => apiGet<Paginated<ApiCategory>>("/admin/categories", { limit: 200 }),
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: ["admin", "brands"],
    queryFn: () => apiGet<Paginated<ApiBrand>>("/admin/brands", { limit: 200 }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiCategory>) => apiPost<{ category: ApiCategory }>("/admin/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiCategory>) => apiPut<{ category: ApiCategory }>(`/admin/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function usePatchCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<ApiCategory>) =>
      apiPut<{ category: ApiCategory }>(`/admin/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

/* ─── brands ────────────────────────────────────────── */

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBrand>) => apiPost<{ brand: ApiBrand }>("/admin/brands", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useUpdateBrand(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBrand>) => apiPut<{ brand: ApiBrand }>(`/admin/brands/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/brands/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

/* ─── blog ──────────────────────────────────────────── */

export function useAdminBlog(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "blog", params],
    queryFn: () => apiGet<Paginated<ApiBlogPost>>("/admin/blog", params),
  });
}

export function useAdminBlogPost(id?: string) {
  return useQuery({
    queryKey: ["admin", "blog", "detail", id],
    queryFn: () => apiGet<{ post: ApiBlogPost }>(`/admin/blog/${id}`),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBlogPost>) => apiPost<{ post: ApiBlogPost }>("/admin/blog", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });
}

export function useUpdateBlogPost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiBlogPost>) => apiPut<{ post: ApiBlogPost }>(`/admin/blog/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/blog/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });
}

/* ─── hero slides ───────────────────────────────────── */

export function useAdminHeroSlides() {
  return useQuery({
    queryKey: ["admin", "hero-slides"],
    queryFn: () => apiGet<{ data: ApiHeroSlide[] }>("/admin/hero-slides"),
  });
}

export function useAdminHeroSlide(id: string) {
  return useQuery({
    queryKey: ["admin", "hero-slides", id],
    queryFn: () => apiGet<{ slide: ApiHeroSlide }>(`/admin/hero-slides/${id}`),
    enabled: !!id,
  });
}

export function useCreateHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiHeroSlide>) => apiPost<{ slide: ApiHeroSlide }>("/admin/hero-slides", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hero-slides"] }),
  });
}

export function useUpdateHeroSlide(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ApiHeroSlide>) => apiPut<{ slide: ApiHeroSlide }>(`/admin/hero-slides/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hero-slides"] }),
  });
}

export function useToggleHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch(`/admin/hero-slides/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hero-slides"] }),
  });
}

export function useReorderHeroSlides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiPut<{ data: ApiHeroSlide[] }>("/admin/hero-slides/reorder", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hero-slides"] }),
  });
}

export function useDeleteHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/hero-slides/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hero-slides"] }),
  });
}

/* ─── users ─────────────────────────────────────────── */

export function useAdminUsers(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => apiGet<Paginated<ApiUser>>("/admin/users", params),
  });
}

export function useAdminUser(id?: string) {
  return useQuery({
    queryKey: ["admin", "users", "detail", id],
    queryFn: () => apiGet<{ user: ApiUser }>(`/admin/users/${id}`),
    enabled: !!id,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      apiPatch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

/* ─── orders ────────────────────────────────────────── */

export function useAdminOrders(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () => apiGet<Paginated<ApiOrder>>("/admin/orders", params),
  });
}

export function useAdminOrder(id?: string) {
  return useQuery({
    queryKey: ["admin", "orders", "detail", id],
    queryFn: () => apiGet<{ order: ApiOrder }>(`/admin/orders/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPost(`/admin/orders/${id}/refund`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useResendReceipt() {
  return useMutation({
    mutationFn: (id: string) => apiPost(`/admin/orders/${id}/resend-receipt`),
  });
}

/* ─── settings + audit log ──────────────────────────── */

function unwrapSettings(
  res: { settings: ApiSettings } | ApiSettings,
): ApiSettings {
  return res && typeof res === "object" && "settings" in res
    ? (res as { settings: ApiSettings }).settings
    : (res as ApiSettings);
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () =>
      unwrapSettings(await apiGet<{ settings: ApiSettings } | ApiSettings>("/admin/settings")),
  });
}

/* ─── notifications ──────────────────────────────────── */

export function useNotifications(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => apiGet<Paginated<ApiNotification>>("/notifications", params),
    staleTime: 0,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPatch("/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ApiSettings>) =>
      unwrapSettings(
        await apiPut<{ settings: ApiSettings } | ApiSettings>("/admin/settings", body),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useAuditLog(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "audit-log", params],
    queryFn: () => apiGet<Paginated<ApiAuditLog>>("/admin/audit-log", params),
  });
}

/* ─── reviews moderation ────────────────────────────── */

export type AdminReview = {
  id: string;
  rating: number;
  comment?: string;
  status: "visible" | "hidden";
  verifiedPurchase?: boolean;
  createdAt: string;
  user?: { id: string; name: string; email: string; avatar?: string };
  product?: { id: string; title: string; slug: string; thumbnail?: string };
};

export function useAdminReviews(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () => apiGet<Paginated<AdminReview>>("/admin/reviews", params),
  });
}

export function useSetReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "visible" | "hidden" }) =>
      apiPatch<{ review: AdminReview }>(`/admin/reviews/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useDeleteAdminReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export { apiError, apiPost, apiGet };
