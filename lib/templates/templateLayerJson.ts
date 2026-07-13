/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LayerTemplate } from "@/lib/templates/layerTemplates"
import type { TemplateAspectRatio, TemplateRecord } from "@/lib/api/templateApi"

export const TEMPLATE_STORAGE_PREFIX = "cs_template"

export function aspectToApi(aspect: "portrait" | "landscape" | "square"): TemplateAspectRatio {
  if (aspect === "landscape") return "16:9"
  if (aspect === "square") return "1:1"
  return "9:16"
}

export function aspectFromApi(aspect: string): "portrait" | "landscape" | "square" {
  if (aspect === "16:9") return "landscape"
  if (aspect === "1:1") return "square"
  return "portrait"
}

/** Convert API / Step5 study_layers payload into frontend Layer[] for editor/localStorage. */
export function studyLayersToFrontendLayers(studyLayers: any[]): any[] {
  if (!Array.isArray(studyLayers)) return []
  return studyLayers.map((l: any, idx: number) => {
    const images = (l.images || []).map((img: any, imgIdx: number) => {
      const config = img.config && typeof img.config === "object" ? img.config : {}
      const sourceType =
        img.sourceType === "text" ||
        img.source_type === "text" ||
        l.layer_type === "text" ||
        config.text_content ||
        img.text_content ||
        img.textContent
          ? "text"
          : "upload"

      const url = img.url || img.secureUrl || img.previewUrl || ""
      const base: any = {
        id: img.image_id || img.id || crypto.randomUUID(),
        previewUrl: url,
        secureUrl: url,
        name: img.name || img.alt_text || `Element ${imgIdx + 1}`,
        x: typeof img.x === "number" ? img.x : l.transform?.x ?? 0,
        y: typeof img.y === "number" ? img.y : l.transform?.y ?? 0,
        width: typeof img.width === "number" ? img.width : l.transform?.width ?? 100,
        height: typeof img.height === "number" ? img.height : l.transform?.height ?? 100,
        sourceType,
      }

      if (sourceType === "text") {
        base.textContent = img.textContent ?? img.text_content ?? config.text_content ?? base.name
        base.htmlContent = img.htmlContent ?? img.html_content ?? config.html_content
        base.textColor = img.textColor ?? img.text_color ?? config.text_color
        base.textWeight = img.textWeight ?? img.text_weight ?? config.text_weight
        base.textSize = img.textSize ?? img.text_size ?? config.text_size
        base.textFont = img.textFont ?? img.text_font ?? config.text_font
        base.textBackgroundColor = img.textBackgroundColor ?? img.text_background_color ?? config.text_background_color
        base.textBackgroundRadius = img.textBackgroundRadius ?? img.text_background_radius ?? config.text_background_radius
        base.textStrokeColor = img.textStrokeColor ?? img.text_stroke_color ?? config.text_stroke_color
        base.textStrokeWidth = img.textStrokeWidth ?? img.text_stroke_width ?? config.text_stroke_width
        base.textLetterSpacing = img.textLetterSpacing ?? img.text_letter_spacing ?? config.text_letter_spacing
        base.textShadowColor = img.textShadowColor ?? img.text_shadow_color ?? config.text_shadow_color
        base.textShadowBlur = img.textShadowBlur ?? img.text_shadow_blur ?? config.text_shadow_blur
        base.textShadowOffsetX = img.textShadowOffsetX ?? img.text_shadow_offset_x ?? config.text_shadow_offset_x
        base.textShadowOffsetY = img.textShadowOffsetY ?? img.text_shadow_offset_y ?? config.text_shadow_offset_y
        base.textFontStyle = img.textFontStyle ?? img.text_font_style ?? config.text_font_style
        base.textDecoration = img.textDecoration ?? img.text_decoration ?? config.text_decoration
        base.textAlign = img.textAlign ?? img.text_align ?? config.text_align
        base.textOpacity = img.textOpacity ?? img.text_opacity ?? config.text_opacity
        base.textRotation = img.textRotation ?? img.text_rotation ?? config.text_rotation
      }

      return base
    })

    return {
      id: l.layer_id || l.id || crypto.randomUUID(),
      name: l.name || `Layer ${idx + 1}`,
      description: l.description || "",
      z: typeof l.z_index === "number" ? l.z_index : typeof l.z === "number" ? l.z : idx,
      images,
      open: false,
      visible: true,
      layer_type: l.layer_type === "text" ? "text" : "image",
      transform: l.transform || undefined,
    }
  })
}

/** Convert frontend Layer[] (+ background/aspect) into API layer_json. */
export function frontendLayersToLayerJson(opts: {
  layers: any[]
  background?: { secureUrl?: string; previewUrl?: string } | null
  aspect: "portrait" | "landscape" | "square"
  designConstraints?: any[]
}): Record<string, any> {
  const study_layers = (opts.layers || []).map((l: any, layerIdx: number) => {
    const images = (l.images || []).map((img: any, imgIdx: number) => {
      const imageObj: any = {
        image_id: img.id || crypto.randomUUID(),
        name: img.name || `Element ${imgIdx + 1}`,
        url: img.secureUrl || img.previewUrl || "",
        alt_text: img.name || "",
        order: imgIdx,
        x: typeof img.x === "number" ? img.x : 0,
        y: typeof img.y === "number" ? img.y : 0,
        width: typeof img.width === "number" ? img.width : 100,
        height: typeof img.height === "number" ? img.height : 100,
      }

      if (img.sourceType === "text") {
        imageObj.source_type = "text"
        imageObj.sourceType = "text"
        imageObj.text_content = img.textContent || img.name
        imageObj.textContent = img.textContent || img.name
        if (img.htmlContent) {
          imageObj.html_content = img.htmlContent
          imageObj.htmlContent = img.htmlContent
        }
        imageObj.config = {
          text_content: img.textContent || img.name,
          ...(img.htmlContent ? { html_content: img.htmlContent } : {}),
          ...(img.textColor ? { text_color: img.textColor } : {}),
          ...(img.textWeight ? { text_weight: img.textWeight } : {}),
          ...(typeof img.textSize === "number" ? { text_size: img.textSize } : {}),
          ...(img.textFont ? { text_font: img.textFont } : {}),
          ...(img.textBackgroundColor ? { text_background_color: img.textBackgroundColor } : {}),
          ...(typeof img.textBackgroundRadius === "number" ? { text_background_radius: img.textBackgroundRadius } : {}),
          ...(img.textStrokeColor ? { text_stroke_color: img.textStrokeColor } : {}),
          ...(typeof img.textStrokeWidth === "number" ? { text_stroke_width: img.textStrokeWidth } : {}),
          ...(typeof img.textLetterSpacing === "number" ? { text_letter_spacing: img.textLetterSpacing } : {}),
          ...(img.textShadowColor ? { text_shadow_color: img.textShadowColor } : {}),
          ...(typeof img.textShadowBlur === "number" ? { text_shadow_blur: img.textShadowBlur } : {}),
          ...(typeof img.textShadowOffsetX === "number" ? { text_shadow_offset_x: img.textShadowOffsetX } : {}),
          ...(typeof img.textShadowOffsetY === "number" ? { text_shadow_offset_y: img.textShadowOffsetY } : {}),
          ...(img.textFontStyle ? { text_font_style: img.textFontStyle } : {}),
          ...(img.textDecoration ? { text_decoration: img.textDecoration } : {}),
          ...(img.textAlign ? { text_align: img.textAlign } : {}),
          ...(typeof img.textOpacity === "number" ? { text_opacity: img.textOpacity } : {}),
          ...(typeof img.textRotation === "number" ? { text_rotation: img.textRotation } : {}),
        }
        // Flat copies for editor round-trip
        Object.assign(imageObj, {
          textColor: img.textColor,
          textWeight: img.textWeight,
          textSize: img.textSize,
          textFont: img.textFont,
          textBackgroundColor: img.textBackgroundColor,
          textBackgroundRadius: img.textBackgroundRadius,
          textStrokeColor: img.textStrokeColor,
          textStrokeWidth: img.textStrokeWidth,
          textLetterSpacing: img.textLetterSpacing,
          textShadowColor: img.textShadowColor,
          textShadowBlur: img.textShadowBlur,
          textShadowOffsetX: img.textShadowOffsetX,
          textShadowOffsetY: img.textShadowOffsetY,
          textFontStyle: img.textFontStyle,
          textDecoration: img.textDecoration,
          textAlign: img.textAlign,
          textOpacity: img.textOpacity,
          textRotation: img.textRotation,
        })
      }

      return imageObj
    })

    const hasImages = images.length > 0
    const allText = hasImages && (l.images || []).every((img: any) => (img.sourceType ?? "upload") === "text")
    const layerObj: any = {
      layer_id: l.id || crypto.randomUUID(),
      name: l.name || `Layer ${layerIdx + 1}`,
      description: l.description || "",
      layer_type: allText || l.layer_type === "text" ? "text" : "image",
      z_index: typeof l.z === "number" ? l.z : layerIdx,
      order: typeof l.z === "number" ? l.z : layerIdx,
      images,
    }
    if (l.transform) {
      layerObj.transform = {
        x: l.transform.x || 0,
        y: l.transform.y || 0,
        width: l.transform.width || 100,
        height: l.transform.height || 100,
      }
    }
    return layerObj
  })

  const payload: Record<string, any> = {
    aspect_ratio: aspectToApi(opts.aspect),
    study_layers,
    design_constraints: opts.designConstraints || [],
  }

  // Always include the key so removal clears a previously saved background in the DB.
  const bgUrl = pickPersistedImageUrl(opts.background)
  payload.background_image_url = bgUrl
  return payload
}

/** Prefer a durable CDN/http URL; never persist blob: preview URLs. */
function pickPersistedImageUrl(
  background?: { secureUrl?: string; previewUrl?: string } | null
): string | null {
  if (!background) return null
  const candidates = [background.secureUrl, background.previewUrl].filter(Boolean) as string[]
  for (const url of candidates) {
    if (/^https?:\/\//i.test(url)) return url
  }
  return null
}

/** Build a LayerTemplate for the picker / LayerPreview from an API template. */
export function apiTemplateToLayerTemplate(t: TemplateRecord): LayerTemplate {
  const layers = studyLayersToFrontendLayers(t.layer_json?.study_layers || [])
  const aspect = aspectFromApi(t.aspect_ratio)
  const firstUrl =
    layers[0]?.images?.[0]?.secureUrl ||
    t.layer_json?.background_image_url ||
    ""

  return {
    id: t.id,
    name: t.title,
    description: `${t.layer_count} layers · ${t.element_count} elements`,
    thumbnailUrl: firstUrl,
    aspect,
    background: typeof t.layer_json?.background_image_url === "string" && t.layer_json.background_image_url.trim()
      ? { secureUrl: t.layer_json.background_image_url.trim(), name: "Background" }
      : undefined,
    layers: layers.map((l: any) => ({
      name: l.name,
      layer_type: l.layer_type,
      images: (l.images || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        secureUrl: img.secureUrl || img.previewUrl,
        x: img.x ?? 0,
        y: img.y ?? 0,
        width: img.width ?? 100,
        height: img.height ?? 100,
      })),
    })),
    rawLayerJson: t.layer_json,
  }
}

export function seedTemplateEditorStorage(layerJson: Record<string, any>) {
  const layers = studyLayersToFrontendLayers(layerJson?.study_layers || [])
  const aspect = aspectFromApi(layerJson?.aspect_ratio || "9:16")
  localStorage.setItem(`${TEMPLATE_STORAGE_PREFIX}_layer`, JSON.stringify(layers))
  localStorage.setItem(`${TEMPLATE_STORAGE_PREFIX}_layer_preview_aspect`, aspect)

  const bgUrl =
    typeof layerJson?.background_image_url === "string" && layerJson.background_image_url.trim()
      ? layerJson.background_image_url.trim()
      : null

  if (bgUrl) {
    localStorage.setItem(
      `${TEMPLATE_STORAGE_PREFIX}_layer_background`,
      JSON.stringify({
        id: crypto.randomUUID(),
        secureUrl: bgUrl,
        previewUrl: bgUrl,
        name: "Background",
      })
    )
  } else {
    // Explicitly clear so a removed background does not linger from a previous edit session
    localStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}_layer_background`)
  }
  if (Array.isArray(layerJson?.design_constraints) && layerJson.design_constraints.length > 0) {
    localStorage.setItem("cs_template_design_constraints", JSON.stringify(layerJson.design_constraints))
  } else {
    localStorage.removeItem("cs_template_design_constraints")
  }
}

export function clearTemplateEditorStorage() {
  localStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}_layer`)
  localStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}_layer_background`)
  localStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}_layer_preview_aspect`)
  localStorage.removeItem("cs_template_design_constraints")
}

export function readTemplateEditorLayerJson(): Record<string, any> {
  let layers: any[] = []
  let background: any = null
  let aspect: "portrait" | "landscape" | "square" = "portrait"
  try {
    layers = JSON.parse(localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}_layer`) || "[]")
  } catch {
    layers = []
  }
  try {
    background = JSON.parse(localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}_layer_background`) || "null")
  } catch {
    background = null
  }
  try {
    const a = localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}_layer_preview_aspect`)
    if (a === "landscape" || a === "square" || a === "portrait") aspect = a
  } catch {
    /* ignore */
  }
  let designConstraints: any[] = []
  try {
    designConstraints = JSON.parse(localStorage.getItem("cs_template_design_constraints") || "[]")
  } catch {
    designConstraints = []
  }
  return frontendLayersToLayerJson({ layers, background, aspect, designConstraints })
}
