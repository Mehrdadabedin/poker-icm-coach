/* Simplified Chinese: the player's photo on the profile page (plan 113). */
import type { portrait as en } from "../en/portrait";

export const portrait: Record<keyof typeof en, string> = {
  "portrait.title": "你的照片",
  "portrait.status.none": "没有照片",
  "portrait.status.pending": "等待审核",
  "portrait.status.approved": "已通过",
  "portrait.status.rejected": "未通过",
  "portrait.hint.none": "添加一张你自己的照片。管理员批准之前不会显示。",
  "portrait.hint.pending": "照片在牌桌座位上显示之前，管理员会先审核。",
  "portrait.hint.approved": "你的照片会显示在牌桌座位上。",
  "portrait.hint.rejected": "管理员没有批准这张照片。请换一张。",
  "portrait.choose": "选择照片",
  "portrait.change": "换一张照片",
  "portrait.camera": "拍照",
  "portrait.remove": "删除照片",
  "portrait.uploading": "正在上传…",
  "portrait.note": "JPG、PNG 或 WebP。照片上传前会自动缩小。",
  "portrait.error": "这个文件无法使用。请选择 JPG、PNG 或 WebP 照片。",
  "portrait.alt": "你的照片",
};
