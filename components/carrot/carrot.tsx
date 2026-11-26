"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { portfolioSections } from "@/lib/carrot/project-links";
import { CarrotChat } from "./carrot-chat";
import { useCarrotGuide } from "./use-carrot-guide";
import { useCarrotMotion } from "./use-carrot-motion";
import styles from "./carrot.module.css";

export function Carrot() {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inviteShown = useRef(false);
  const bunny = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const reduced = Boolean(useReducedMotion());
  const guide = useCarrotGuide(bunny, x, reduced);
  const movement = useCarrotMotion(open, bunny, x, reduced, guide.guide?.phase);

  useEffect(() => {
    if (!movement.entered || open || inviteShown.current || movement.reduced) return;
    let hide = 0;
    const show = window.setTimeout(() => {
      inviteShown.current = true;
      setInvite(true);
      hide = window.setTimeout(() => setInvite(false), 4200);
    }, 1800);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [movement.entered, movement.reduced, open]);

  if (!movement.entered) return null;

  return createPortal(
    <>
      <motion.button
        ref={bunny}
        type="button"
        className={styles.bunny}
        data-state={movement.mode}
        data-guide={guide.guide?.phase}
        data-guide-project={guide.guide?.project}
        aria-label="Chat with Carrot"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ x, y: guide.y }}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onClick={() => {
          setHovered(false);
          setInvite(false);
          movement.stopHop();
          setOpen(true);
        }}
      >
        {(invite || hovered) && !open && guide.guide?.phase !== "travel" && (
          <span aria-hidden="true" className={styles.invite} data-right={movement.nearRight}>
            {hovered ? "Chat with Carrot 🥕" : "Psst... I can talk! 🐰"}
          </span>
        )}
        <Image
          className={styles.sprite}
          src={movement.frame}
          alt=""
          width={192}
          height={192}
          unoptimized
          draggable={false}
          style={{ scale: (guide.guide ? guide.facingRight : movement.facingRight) ? "-1 1" : "1 1" }}
        />
      </motion.button>

      <CarrotChat
        open={open}
        anchor={bunny}
        reduced={movement.reduced}
        onGuide={(project) => {
          if (!guide.guideTo(project)) return false;
          movement.stopHop();
          setHovered(false);
          setInvite(false);
          setOpen(false);
          document.getElementById(portfolioSections["selected-works"].elementId)?.focus({ preventScroll: true });
          return true;
        }}
        onResetGuide={guide.resetGuide}
        onHide={() => {
          setOpen(false);
          requestAnimationFrame(() => bunny.current?.focus({ preventScroll: true }));
        }}
      />
    </>,
    document.body,
  );
}
