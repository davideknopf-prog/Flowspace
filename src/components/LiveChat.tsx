"use client";

import { useEffect } from "react";

// Loads the Crisp live-chat widget on every page (public site + teacher
// portal). Chats push to David's phone via the Crisp mobile app. Inert until
// NEXT_PUBLIC_CRISP_WEBSITE_ID is set in the environment, so it's safe to ship
// before the Crisp account exists — it activates the moment the ID is added.
declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

export function LiveChat() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!id) return;
    if (document.getElementById("crisp-loader")) return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = id;

    const s = document.createElement("script");
    s.id = "crisp-loader";
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return null;
}

// Tell Crisp who's chatting when a signed-in teacher is present (portal), so
// David sees their name/email in the conversation instead of "anonymous".
export function ChatIdentify({ email, name }: { email: string; name: string }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) return;
    window.$crisp = window.$crisp || [];
    if (email) window.$crisp.push(["set", "user:email", [email]]);
    if (name) window.$crisp.push(["set", "user:nickname", [name]]);
  }, [email, name]);
  return null;
}
