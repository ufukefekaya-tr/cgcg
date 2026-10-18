// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  machine: <><path d="M4 20V9h16v11M7 9V4h10v5M2 20h20M9 13h6M12 9v7"/></>,
  presets: <><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></>,
  file: <><path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 12h8M8 16h5"/></>,
  book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15"/></>,
  spark: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z"/></>,
  play: <path d="m8 5 11 7-11 7V5Z"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  plus: <path d="M12 4v16M4 12h16"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  code: <><path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  circle: <circle cx="12" cy="12" r="8"/>,
  rectangle: <rect x="3" y="6" width="18" height="12" rx="2"/>,
  line: <><path d="m4 19 16-14"/><circle cx="4" cy="19" r="1.5"/><circle cx="20" cy="5" r="1.5"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/></>,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/></>,
  upload: <><path d="M12 17V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  reset: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/></>,
};
export default function Icon({name, size=20, ...props}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.grid}</svg>;
}
