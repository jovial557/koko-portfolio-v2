"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CarrotChat } from "./carrot-chat";
import { useCarrotMotion } from "./use-carrot-motion";
import styles from "./carrot.module.css";

export function Carrot() {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inviteShown = useRef(false);
  const bunny = useRef<HTMLButtonElement>(null);
  const movement = useCarrotMotion(open, bunny);

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
        aria-label="Chat with Carrot"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ x: movement.x }}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onClick={() => {
          setHovered(false);
          setInvite(false);
          movement.stopHop();
          setOpen(true);
        }}
      >
        {(invite || hovered) && !open && (
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
          style={{ scale: movement.facingRight ? "-1 1" : "1 1" }}
        />
      </motion.button>

      <CarrotChat
        open={open}
        anchor={bunny}
        reduced={movement.reduced}
        onHide={() => {
          setOpen(false);
          requestAnimationFrame(() => bunny.current?.focus({ preventScroll: true }));
        }}
      />
    </>,
    document.body,
  );
}
