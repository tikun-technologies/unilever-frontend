const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'])

export type FolderGroup = {
  folderName: string
  files: File[]
}

export type FolderParseResult = {
  groups: FolderGroup[]
  skippedNestedCount: number
  errors: string[]
  warnings: string[]
}

export type FolderParseOptions = {
  maxGroups?: number
  maxImagesPerGroup?: number
  remainingGroupSlots?: number
  groupLabel?: string
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  const dot = file.name.lastIndexOf('.')
  if (dot === -1) return false
  return IMAGE_EXTENSIONS.has(file.name.slice(dot).toLowerCase())
}

export function getImageFilesFromList(files: File[] | FileList): File[] {
  return Array.from(files).filter(isImageFile)
}

function getFilePath(file: File, pathOverrides: WeakMap<File, string>): string {
  return (pathOverrides.get(file) || file.webkitRelativePath || file.name).replace(/\\/g, '/')
}

function getFileParts(file: File, pathOverrides: WeakMap<File, string>): string[] {
  return getFilePath(file, pathOverrides).split('/').filter(Boolean)
}

function sortFilesAlphabetically(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

function sortNamesAlphabetically(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/**
 * Strip a shared wrapper folder prefix when every image is nested deeper than
 * subfolder/image (e.g. MG-upload/MG-upload/Category/img.png).
 */
function canStripSharedWrapperPrefix(files: File[], pathOverrides: WeakMap<File, string>): boolean {
  if (files.length === 0) return false
  const partsList = files.map((file) => getFileParts(file, pathOverrides))
  if (partsList.some((parts) => parts.length < 3)) return false
  const firstSegment = partsList[0][0]
  return partsList.every((parts) => parts[0] === firstSegment)
}

function stripSharedWrapperPrefix(files: File[], pathOverrides: WeakMap<File, string>): void {
  for (const file of files) {
    const parts = getFileParts(file, pathOverrides).slice(1)
    pathOverrides.set(file, parts.join('/'))
  }
}

function normalizeWrapperFolders(files: File[], pathOverrides: WeakMap<File, string>): { wrapperStripCount: number } {
  let wrapperStripCount = 0
  const maxStrips = 8

  while (wrapperStripCount < maxStrips && canStripSharedWrapperPrefix(files, pathOverrides)) {
    stripSharedWrapperPrefix(files, pathOverrides)
    wrapperStripCount++
  }

  return { wrapperStripCount }
}

function parseNormalizedFiles(
  imageFiles: File[],
  pathOverrides: WeakMap<File, string>,
  options: FolderParseOptions
): FolderParseResult {
  const { maxGroups, maxImagesPerGroup = 10, remainingGroupSlots, groupLabel = 'category' } = options
  const groupLabelPlural = groupLabel === 'layer' ? 'layers' : 'categories'

  const rootImages: File[] = []
  const subfolderMap = new Map<string, File[]>()
  const subfolderNames = new Set<string>()
  let skippedNestedCount = 0

  for (const file of imageFiles) {
    const parts = getFileParts(file, pathOverrides)

    if (parts.length === 1) {
      rootImages.push(file)
    } else if (parts.length === 2) {
      const subfolder = parts[0]
      subfolderNames.add(subfolder)
      const existing = subfolderMap.get(subfolder) || []
      existing.push(file)
      subfolderMap.set(subfolder, existing)
    } else {
      skippedNestedCount++
      if (parts.length >= 2) subfolderNames.add(parts[0])
    }
  }

  const errors: string[] = []
  const warnings: string[] = []

  if (skippedNestedCount > 0) {
    warnings.push(
      `${skippedNestedCount} image${skippedNestedCount === 1 ? '' : 's'} in deeper subfolders were skipped. Use at most 2 folder levels (folder → subfolder → images).`
    )
  }

  const hasSubfolders = subfolderNames.size > 0

  if (hasSubfolders) {
    if (rootImages.length > 0) {
      warnings.push(
        `${rootImages.length} image${rootImages.length === 1 ? '' : 's'} in the root of the selected folder were skipped. Put images inside subfolders, or select the folder that directly contains them.`
      )
    }

    const sortedNames = sortNamesAlphabetically(Array.from(subfolderNames))
    const emptyFolders: string[] = []
    const overLimitFolders: string[] = []
    const groups: FolderGroup[] = []

    for (const name of sortedNames) {
      const files = sortFilesAlphabetically(subfolderMap.get(name) || [])
      if (files.length === 0) {
        emptyFolders.push(name)
        continue
      }
      if (files.length > maxImagesPerGroup) {
        overLimitFolders.push(`${name} (${files.length} images, max ${maxImagesPerGroup})`)
        continue
      }
      groups.push({ folderName: name, files })
    }

    if (emptyFolders.length > 0) {
      errors.push(
        `These subfolders have no images: ${emptyFolders.join(', ')}. Each subfolder must contain images directly (not inside another folder). Try selecting the inner folder that contains your category folders.`
      )
    }

    if (overLimitFolders.length > 0) {
      errors.push(`Too many images in: ${overLimitFolders.join('; ')}.`)
    }

    if (groups.length === 0 && errors.length === 0) {
      errors.push('No valid images found. Place images directly inside each subfolder (max 2 folder levels).')
    }

    if (remainingGroupSlots !== undefined && groups.length > remainingGroupSlots) {
      errors.push(
        `The folder contains ${groups.length} subfolders but you can only add ${remainingGroupSlots} more ${groupLabelPlural} (max ${maxGroups ?? remainingGroupSlots}).`
      )
    }

    return { groups, skippedNestedCount, errors, warnings }
  }

  const sortedRoot = sortFilesAlphabetically(rootImages)
  if (sortedRoot.length === 0) {
    return {
      groups: [],
      skippedNestedCount,
      errors: ['No valid images found at the selected folder level.'],
      warnings,
    }
  }

  if (sortedRoot.length > maxImagesPerGroup) {
    errors.push(
      `The folder contains ${sortedRoot.length} images but the maximum is ${maxImagesPerGroup} per ${groupLabel}.`
    )
    return { groups: [], skippedNestedCount, errors, warnings }
  }

  if (remainingGroupSlots !== undefined && remainingGroupSlots < 1) {
    errors.push(`You have reached the maximum number of ${groupLabelPlural}.`)
    return { groups: [], skippedNestedCount, errors, warnings }
  }

  return {
    groups: [{ folderName: 'Imported Images', files: sortedRoot }],
    skippedNestedCount,
    errors,
    warnings,
  }
}

/**
 * Parse a folder selection (webkitdirectory).
 * Supports up to 2 folder levels after normalizing wrapper folders:
 * selected-root/subfolder/image.png
 */
export function parseFolderSelection(
  rawFiles: File[] | FileList,
  options: FolderParseOptions = {}
): FolderParseResult {
  const pathOverrides = new WeakMap<File, string>()
  const imageFiles = getImageFilesFromList(rawFiles)

  if (imageFiles.length === 0) {
    return {
      groups: [],
      skippedNestedCount: 0,
      errors: ['No images found in the selected folder. Add JPG, PNG, or other image files and try again.'],
      warnings: [],
    }
  }

  const { wrapperStripCount } = normalizeWrapperFolders(imageFiles, pathOverrides)
  const result = parseNormalizedFiles(imageFiles, pathOverrides, options)

  if (wrapperStripCount > 0) {
    result.warnings.unshift(
      wrapperStripCount === 1
        ? 'Detected a wrapper folder and adjusted automatically.'
        : `Detected ${wrapperStripCount} nested wrapper folders and adjusted automatically.`
    )
  }

  return result
}

export function openFolderPicker(onSelect: (files: File[]) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.setAttribute('webkitdirectory', '')
  input.onchange = () => {
    if (input.files?.length) onSelect(Array.from(input.files))
  }
  input.click()
}

export function stripFileExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}

export function generateUniqueName(base: string, usedNames: Set<string>): string {
  const trimmed = (base || '').trim() || 'Untitled'
  if (!usedNames.has(trimmed)) return trimmed
  let i = 1
  let candidate = `${trimmed}(${i})`
  while (usedNames.has(candidate)) {
    i += 1
    candidate = `${trimmed}(${i})`
  }
  return candidate
}
