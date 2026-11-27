import type { Metadata } from "next";
import { Inter } from "next/font/google";
import FilmDiary from "@/components/about/film-diary";
import TextsCloud from "@/components/about/texts-cloud";
import styles from "./about.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-film-diary" });

export const metadata: Metadata = { title: "About | Kokona Akatsu" };

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className={`${styles.about} ${inter.variable}`}>
      <section aria-labelledby="film-diary-heading">
        <h1 className={styles.heading} id="film-diary-heading">Drag to move</h1>
        <div className={styles.clip}>
          <div className={styles.diary}>
            <FilmDiary />
          </div>
        </div>
      </section>
      <section className={styles.toolbox} aria-labelledby="toolbox-heading">
        <h2 id="toolbox-heading" className={styles.toolboxHeading}>My toolbox:</h2>
        <TextsCloud />
      </section>
    </main>
  );
}
