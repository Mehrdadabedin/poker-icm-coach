/* Simplified Chinese: the photo reminder on the home page (plan 113). */
import type { portraitPrompt as en } from "../en/portraitPrompt";

export const portraitPrompt: Record<keyof typeof en, string> = {
  "portraitPrompt.none.title": "添加你的照片",
  "portraitPrompt.none.text": "你的座位还没有照片。添加一张，牌桌上就会像 Emma 和其他机器人一样显示你。管理员会先审核；在此期间你可以继续打牌。",
  "portraitPrompt.pending.title": "你的照片正在等待审核",
  "portraitPrompt.pending.text": "管理员批准之前，你的座位显示你名字的首字母。",
  "portraitPrompt.rejected.title": "你的照片未通过审核",
  "portraitPrompt.rejected.text": "请换一张。在此期间，你的座位显示你名字的首字母。",
  "portraitPrompt.add": "添加照片",
  "portraitPrompt.later": "以后再说",
  "portraitPrompt.choose": "换一张",
  "portraitPrompt.ok": "知道了",
};
