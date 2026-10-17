import { NEWS_PRIORITY } from "../news/newsPriority";
import type { NewsPriority, NewsResponse } from "../news/types";

// Limits from CreateNewsDto / UpdateNewsDto.
export const TITLE_MAX = 100;
export const TEXT_MAX = 1000;

export type NewsForm = { title: string; description: string; priority: NewsPriority };

export function toNewsForm(news?: NewsResponse | null): NewsForm {
  return {
    title: news?.title ?? "",
    description: news?.description ?? "",
    priority: news && news.priority >= 1 && news.priority <= 3 ? news.priority : NEWS_PRIORITY.normal,
  };
}
