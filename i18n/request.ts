import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

const catalogs = {
  en: () => import("../messages/en.json").then((catalog) => catalog.default),
  ja: () => import("../messages/ja.json").then((catalog) => catalog.default),
};

export default getRequestConfig(async ({ locale }) => {
  const requested = locale ?? routing.defaultLocale;

  if (!hasLocale(routing.locales, requested)) notFound();

  return { locale: requested, messages: await catalogs[requested]() };
});
