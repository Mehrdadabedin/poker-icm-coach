/* Player portraits (plan 094): the player's own photo and the Admin review. */
import { useEffect, useState } from "react";
import { getToken, request } from "./api";

export type PortraitStatus = "none" | "pending" | "approved" | "rejected";
export interface MyPortrait {
  status: PortraitStatus;
  image: string | null; // a data: URL
}
export interface PendingPortrait {
  username: string;
  image: string;
  updatedAt: string;
}
export interface PortraitUpload {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  data: string; // base64 without the data: prefix
}

// The table polls every 350 ms, so the seat must not fetch the photo each time.
// The cache belongs to one sign-in, so another account never sees this photo.
// It keeps only an approved photo, for a minute: one still waiting is asked
// again when the seat next mounts (each hand), so an approval shows from the
// next hand without a reload.
const CACHE_MS = 60_000;
let cached: Promise<MyPortrait> | null = null;
let cachedFor: string | null = null;
let cachedAt = 0;
const listeners = new Set<(p: MyPortrait) => void>();

function keep(portrait: MyPortrait): MyPortrait {
  if (portrait.status !== "approved") cached = null;
  return portrait;
}

function remember(portrait: MyPortrait): MyPortrait {
  cached = portrait.status === "approved" ? Promise.resolve(portrait) : null;
  cachedFor = getToken();
  cachedAt = Date.now();
  listeners.forEach((listen) => listen(portrait));
  return portrait;
}

export function getMyPortrait({ fresh = false } = {}): Promise<MyPortrait> {
  if (fresh || cachedFor !== getToken() || Date.now() - cachedAt > CACHE_MS) cached = null;
  if (!cached) {
    cachedFor = getToken();
    cachedAt = Date.now();
  }
  cached ??= request<MyPortrait>("/api/portrait").then(keep).catch((error: unknown) => {
    cached = null;
    throw error;
  });
  return cached;
}

export const uploadPortrait = (upload: PortraitUpload): Promise<MyPortrait> =>
  request<MyPortrait>("/api/portrait", { method: "PUT", body: JSON.stringify(upload) }).then(remember);

export const removePortrait = (): Promise<MyPortrait> =>
  request<MyPortrait>("/api/portrait", { method: "DELETE" }).then(remember);

/** The player's photo once an Admin approved it; null before, and for any other state. */
export function useApprovedPortrait(enabled: boolean): string | null {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !getToken()) return; // a signed-out page (the landing demo) never asks
    let live = true;
    const show = (p: MyPortrait) => { if (live) setImage(p.status === "approved" ? p.image : null); };
    listeners.add(show);
    getMyPortrait().then(show).catch(() => undefined);
    return () => { live = false; listeners.delete(show); };
  }, [enabled]);
  return enabled ? image : null;
}

export const pendingPortraits = (): Promise<{ portraits: PendingPortrait[] }> =>
  request<{ portraits: PendingPortrait[] }>("/api/admin/portraits");

export const reviewPortrait = (username: string, decision: "approve" | "reject") =>
  request<{ username: string; status: PortraitStatus }>(
    `/api/admin/portraits/${encodeURIComponent(username)}/${decision}`, { method: "POST" });
