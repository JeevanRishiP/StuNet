"use client";

import { useEffect, useRef } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size?: "normal" | "compact" | "invisible";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({
  onSuccess,
  onError,
  onExpire,
  className,
}: TurnstileProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] || "2x00000000000000000000AB"; // Cloudflare's official always-passing invisible testing sitekey

  useEffect(() => {
    function renderWidget() {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: "invisible",
          theme: "auto",
          callback: (token: string) => {
            onSuccess(token);
          },
          "error-callback": () => {
            onError?.();
          },
          "expired-callback": () => {
            onExpire?.();
          },
        });
      } catch (e) {
        console.warn("[Turnstile] Render error:", e);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]',
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderWidget();
        };
        script.onerror = () => {
          console.warn("[Turnstile] Script failed to load (offline or blocked).");
          if (process.env.NODE_ENV !== "production") {
            onSuccess("dummy-turnstile-token-always-pass");
          } else {
            onError?.();
          }
        };
        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkInterval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }

    let devTimeout: NodeJS.Timeout | null = null;
    if (process.env.NODE_ENV !== "production") {
      devTimeout = setTimeout(() => {
        if (!widgetIdRef.current) {
          onSuccess("dummy-turnstile-token-always-pass");
        }
      }, 1500);
    }

    return () => {
      if (devTimeout) clearTimeout(devTimeout);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onSuccess, onError, onExpire]);

  return (
    <div className={className || "hidden"} aria-hidden="true">
      <div ref={containerRef} data-testid="turnstile-widget" />
    </div>
  );
}
