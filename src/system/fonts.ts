import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/700.css";
import "@fontsource/archivo/900.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { font } from "./tokens";

const FACES = [
  `400 64px "${font.sans}"`,
  `500 64px "${font.sans}"`,
  `400 64px "${font.mono}"`,
  `700 64px "${font.mono}"`,
  `900 64px "${font.display}"`,
];

let ready: Promise<unknown> | null = null;

/**
 * Canvas layers draw text immediately, so the render must wait for webfonts.
 * Every template calls this once at its root.
 */
export const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading fonts"));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    ready ??= Promise.all(FACES.map((f) => document.fonts.load(f)));
    ready
      .then(() => {
        setLoaded(true);
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
  return loaded;
};
