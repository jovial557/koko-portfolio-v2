import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AboutPreviewTrigger, PlayfulAbout } from "@/components/playful-about";
import { PortfolioCursorList } from "@/components/portfolio-cursor-list";
import { Carrot } from "@/components/carrot/carrot";
import babyMe from "@/public/images/baby-me.png";
import catHeart from "@/public/images/cat-heart.png";
import crossword from "@/public/images/crossword.png";
import fingerHeart from "@/public/images/finger-heart.png";
import hayaoMiyazaki from "@/public/images/hayao-miyazaki.png";
import pointeShoes from "@/public/images/pointe-shoes.png";

const projects = [
  { id: "upcoming", number: "01", href: null, image: null },
  { id: "muji", number: "02", href: "https://konatsukoko.com/muji", image: "/images/muji-preview.png" },
  { id: "redline", number: "03", href: null, image: "/images/redline-preview.jpg" },
  { id: "nypl", number: "04", href: "https://konatsukoko.com/nypl", image: "/images/nypl-preview.png" },
] as const;

const previewSources = {
  equation: "/images/equation.png",
  worldBuilding: "/images/world-building.jpeg",
  apple: "/images/apple.jpg",
  ghibli: "/images/ghibli%20meme.jpg",
  bauhaus: "/images/bauhaus%20chair.jpg",
} as const;

const introStyles = {
  babyMe: () => (
    <Image className="intro-illustration" src={babyMe} alt="" unoptimized />
  ),
  catHeart: () => (
    <Image className="intro-illustration" src={catHeart} alt="" unoptimized />
  ),
  miyazaki: (text: ReactNode) => (
    <span className="inline-block whitespace-nowrap">
      <span className="intro-underline">{text}</span>
      <Image className="intro-illustration" src={hayaoMiyazaki} alt="" unoptimized />
    </span>
  ),
  fingerHeart: (text: ReactNode) => (
    <span className="inline-block whitespace-nowrap">
      {text}
      <Image className="intro-illustration intro-finger-heart" src={fingerHeart} alt="" unoptimized />
    </span>
  ),
  crossword: (text: ReactNode) => (
    <span className="inline-block whitespace-nowrap">
      {text}
      <Image className="intro-illustration" src={crossword} alt="" unoptimized />
    </span>
  ),
  pointeShoes: (text: ReactNode) => (
    <span className="inline-block whitespace-nowrap">
      {text}
      <Image className="intro-illustration" src={pointeShoes} alt="" unoptimized />
    </span>
  ),
  emphasis: (text: ReactNode) => <span className="intro-underline">{text}</span>,
  firstNote: (text: ReactNode) => <AboutPreviewTrigger id="equation">{text}</AboutPreviewTrigger>,
  worldBuilding: (text: ReactNode) => <AboutPreviewTrigger id="worldBuilding">{text}</AboutPreviewTrigger>,
  secondNote: (text: ReactNode) => <AboutPreviewTrigger id="apple">{text}</AboutPreviewTrigger>,
  ghibli: (text: ReactNode) => <AboutPreviewTrigger id="ghibli" underline={false}>{text}</AboutPreviewTrigger>,
  thirdNote: (text: ReactNode) => <AboutPreviewTrigger id="bauhaus">{text}</AboutPreviewTrigger>,
};

export default async function HomePage() {
  const t = await getTranslations("home");
  const previews = Object.fromEntries(
    Object.entries(previewSources).map(([id, src]) => [id, { src, alt: t(`previewAlt.${id}`) }]),
  );

  return (
    <main id="main-content" className="homepage" tabIndex={-1}>
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">{t("title")}</h1>
        <PlayfulAbout previews={previews}>
          <div className="intro-columns">
            <div>
              <p>{t.rich("first", introStyles)}</p>
              <p>{t.rich("second", introStyles)}</p>
            </div>
            <p>{t.rich("third", introStyles)}</p>
          </div>
        </PlayfulAbout>
      </section>

      <section className="selected-works" aria-labelledby="selected-works">
        <h2 id="selected-works">
          {t("selectedWorks")} <span>(01-04)</span>
        </h2>
        <PortfolioCursorList
          projects={projects.map((project) => ({
            ...project,
            title: t(`projects.${project.id}.title`),
            category: t(`projects.${project.id}.category`),
          }))}
          viewProject={t("viewProject")}
        />
      </section>
      <Carrot />
    </main>
  );
}
