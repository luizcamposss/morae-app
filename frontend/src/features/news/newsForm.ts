import { NEWS_PRIORITY } from "./newsPriority";
import type { NewsPriority, NewsResponse } from "./types";

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

export type NewsFormErrors = { title?: string; description?: string };

// Trims the texts and checks the same minimums as the backend DTOs.
export function validateNewsForm<T extends NewsForm>(form: T): { form: T; errors: NewsFormErrors; isValid: boolean } {
  const title = form.title.trim();
  const description = form.description.trim();
  const errors = {
    title: title.length < 3 ? "Escreva um título com pelo menos 3 caracteres." : undefined,
    description: description.length < 3 ? "Escreva o texto do aviso." : undefined,
  };
  return { form: { ...form, title, description }, errors, isValid: !errors.title && !errors.description };
}
