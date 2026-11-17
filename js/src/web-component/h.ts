export type Child = Node | string | number | null | undefined | false;
export type Attrs = Record<string, string | number | boolean | null | undefined>;

/**
 * Tiny element builder. Keys starting with "." set properties
 * (e.g. ".checked", ".indeterminate"); others set attributes.
 * true sets an empty attribute; false/null/undefined skip it.
 */
export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;

    if (key.startsWith('.')) {
      (el as unknown as Record<string, unknown>)[key.slice(1)] = value;
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }

  return el;
}
