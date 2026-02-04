import { useEffect } from "react";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

type HastNode =
  | { type: "root"; children?: HastNode[] }
  | { type: "element"; tagName: string; properties?: Record<string, unknown>; children?: HastNode[] }
  | { type: "text"; value: string };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toClassString = (className: unknown) => {
  if (!className) return "";
  if (Array.isArray(className)) return className.filter(Boolean).join(" ");
  if (typeof className === "string") return className;
  return "";
};

const renderHast = (node: HastNode): string => {
  if (!node) return "";

  if (node.type === "text") {
    return escapeHtml(node.value ?? "");
  }

  const childrenHtml = (node.children ?? []).map(renderHast).join("");

  if (node.type === "root") {
    return childrenHtml;
  }

  if (node.type === "element") {
    const props = node.properties ?? {};
    const classAttr = toClassString((props as any).className);
    const classPart = classAttr ? ` class="${escapeHtml(classAttr)}"` : "";
    // lowlight only needs className for our CSS mapping; keep output minimal
    return `<${node.tagName}${classPart}>${childrenHtml}</${node.tagName}>`;
  }

  return "";
};

const getLanguageFromCodeEl = (codeEl: HTMLElement) => {
  const classList = Array.from(codeEl.classList);
  const langClass = classList.find((c) => c.startsWith("language-")) ?? classList.find((c) => c.startsWith("lang-"));
  if (!langClass) return null;
  return langClass.replace(/^language-/, "").replace(/^lang-/, "") || null;
};

export function useCodeBlockEnhancements(
  containerRef: React.RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pres = Array.from(container.querySelectorAll("pre"));

    pres.forEach((pre) => {
      // 1) Copy button
      if (!pre.querySelector(".code-copy-button")) {
        const button = document.createElement("button");
        button.className = "code-copy-button";
        button.textContent = "Копировать";
        button.onclick = () => {
          const code = pre.querySelector("code")?.textContent || pre.textContent || "";
          navigator.clipboard.writeText(code);
          button.textContent = "Скопировано!";
          setTimeout(() => {
            button.textContent = "Копировать";
          }, 2000);
        };
        (pre as HTMLElement).style.position = "relative";
        pre.appendChild(button);
      }

      // 2) Syntax highlighting (viewer)
      const codeEl = pre.querySelector("code") as HTMLElement | null;
      if (!codeEl) return;
      if (codeEl.dataset.highlighted === "true") return;

      const raw = codeEl.textContent ?? "";
      const language = getLanguageFromCodeEl(codeEl);

      try {
        const result = language
          ? (lowlight as any).highlight(language, raw)
          : (lowlight as any).highlightAuto?.(raw) ?? (lowlight as any).highlight("plaintext", raw);

        // lowlight returns a HAST root-like node.
        codeEl.innerHTML = renderHast(result as HastNode);
        codeEl.classList.add("hljs");
        codeEl.dataset.highlighted = "true";
      } catch {
        // If language isn't registered or highlighting fails, keep plain text.
        codeEl.dataset.highlighted = "true";
      }
    });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
