/**
 * Study text fonts are loaded in the browser from Google Fonts.
 * next/font downloads those files during `next build` and currently crashes
 * when a font URL does not end in .woff2.
 */
export const googleFontsStylesheet =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Inter:wght@300;400;600;700&family=Poppins:wght@300;400;600;700&family=Roboto:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Open+Sans:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Oswald:wght@300;400;600;700&family=Raleway:wght@300;400;600;700&family=Merriweather:wght@300;400;700&family=Playfair+Display:wght@400;600;700&family=Rubik:wght@300;400;600;700&family=Ubuntu:wght@300;400;700&family=Nunito:wght@300;400;600;700&family=Source+Sans+3:wght@300;400;600;700&family=PT+Sans:wght@400;700&family=Noto+Sans:wght@300;400;600;700&family=Work+Sans:wght@300;400;600;700&family=Quicksand:wght@300;400;600;700&family=Bebas+Neue&family=Dancing+Script:wght@400;700&family=Pacifico&family=Lobster&family=Great+Vibes&family=Satisfy&family=Caveat:wght@400;700&family=Indie+Flower&display=swap"

/** Kept so existing layout imports stay valid. Families are set on :root. */
export const inter = { variable: "" }

export const studyFontVariables = ""
