export interface LayerTemplateImage {
  id: string
  name: string
  secureUrl: string
  /** Position/size as % of the canvas. Baked full-frame assets use 0/0/100/100. */
  x: number
  y: number
  width: number
  height: number
}

export interface LayerTemplateLayer {
  name: string
  images: LayerTemplateImage[]
  layer_type?: 'image' | 'text'
}

export interface LayerTemplate {
  id: string
  name: string
  description?: string
  thumbnailUrl: string
  aspect: 'portrait' | 'landscape' | 'square'
  /** Optional — many templates bake the base into layer 0 instead. */
  background?: { secureUrl: string; name?: string }
  /** Ordered bottom → top (z = index). */
  layers: LayerTemplateLayer[]
  /** Full Step-5 compatible payload when loaded from the API (preferred on apply). */
  rawLayerJson?: Record<string, unknown>
}

/**
 * Local starter catalog removed — templates now come from the Manage Templates API.
 * Kept as an empty array so older imports remain type-safe.
 */
export const LAYER_TEMPLATES: LayerTemplate[] = []

export function aspectLabel(aspect: LayerTemplate['aspect']): string {
  if (aspect === 'portrait') return '9:16'
  if (aspect === 'landscape') return '16:9'
  return '1:1'
}

/** Convert a template into the layer shape expected by LayerPreview. */
export function templateToPreviewModel(template: LayerTemplate) {
  const layers = template.layers.map((l, idx) => ({
    id: `${template.id}-layer-${idx}`,
    name: l.name,
    z: idx,
    visible: true,
    images: l.images,
  }))

  const selectedImageIds: Record<string, string> = {}
  layers.forEach((l) => {
    if (l.images[0]) selectedImageIds[l.id] = l.images[0].id
  })

  return {
    background: template.background ?? null,
    layers,
    selectedImageIds,
  }
}

export type TemplatePreviewModel = ReturnType<typeof templateToPreviewModel>
