import type { AnalysisRow } from "@/lib/analysis-engine/types"

type Cell = string | number | boolean | null

interface PackedColumn {
  name: string
  /** Distinct values; null means the row has no value in this column. */
  values: Cell[]
  bits: number
  data: string
}

export interface PackedRows {
  format: "columns-v1"
  count: number
  columns: PackedColumn[]
}

function cellKey(value: Cell): string {
  return value === null ? "n" : `${typeof value}:${String(value)}`
}

function bitsFor(size: number): number {
  if (size <= 1) return 0
  for (const bits of [1, 2, 4, 8, 16]) if (size <= 2 ** bits) return bits
  return 32
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function writeIndexes(indexes: Uint32Array, bits: number): Uint8Array {
  if (bits === 0) return new Uint8Array(0)
  if (bits >= 8) {
    const width = bits / 8
    const bytes = new Uint8Array(indexes.length * width)
    for (let row = 0; row < indexes.length; row += 1) {
      let value = indexes[row]
      for (let byte = 0; byte < width; byte += 1) {
        bytes[row * width + byte] = value & 0xff
        value >>>= 8
      }
    }
    return bytes
  }
  const perByte = 8 / bits
  const bytes = new Uint8Array(Math.ceil(indexes.length / perByte))
  for (let row = 0; row < indexes.length; row += 1) {
    bytes[Math.floor(row / perByte)] |= indexes[row] << ((row % perByte) * bits)
  }
  return bytes
}

function readIndexes(bytes: Uint8Array, bits: number, count: number): Uint32Array {
  const indexes = new Uint32Array(count)
  if (bits === 0) return indexes
  if (bits >= 8) {
    const width = bits / 8
    for (let row = 0; row < count; row += 1) {
      let value = 0
      for (let byte = width - 1; byte >= 0; byte -= 1) value = value * 256 + bytes[row * width + byte]
      indexes[row] = value
    }
    return indexes
  }
  const perByte = 8 / bits
  const mask = (1 << bits) - 1
  for (let row = 0; row < count; row += 1) {
    indexes[row] = (bytes[Math.floor(row / perByte)] >> ((row % perByte) * bits)) & mask
  }
  return indexes
}

/** Store rows column by column: each distinct value once, then one small index per row. */
export function packRows(rows: AnalysisRow[]): PackedRows {
  const names: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      names.push(key)
    }
  }
  const columns = names.map((name) => {
    const values: Cell[] = [null]
    const lookup = new Map<string, number>([["n", 0]])
    const indexes = new Uint32Array(rows.length)
    rows.forEach((row, rowIndex) => {
      const raw = row[name]
      const value: Cell =
        raw === undefined || raw === null || (typeof raw === "number" && !Number.isFinite(raw))
          ? null
          : typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
            ? raw
            : String(raw)
      const key = cellKey(value)
      let index = lookup.get(key)
      if (index === undefined) {
        index = values.length
        values.push(value)
        lookup.set(key, index)
      }
      indexes[rowIndex] = index
    })
    const bits = bitsFor(values.length)
    return { name, values, bits, data: toBase64(writeIndexes(indexes, bits)) }
  })
  return { format: "columns-v1", count: rows.length, columns }
}

export function unpackRows(packed: PackedRows): AnalysisRow[] {
  const decoded = packed.columns.map((column) => ({
    name: column.name,
    values: column.values,
    indexes: readIndexes(fromBase64(column.data), column.bits, packed.count),
  }))
  const rows: AnalysisRow[] = new Array(packed.count)
  for (let rowIndex = 0; rowIndex < packed.count; rowIndex += 1) {
    const row: AnalysisRow = {}
    for (const column of decoded) {
      const value = column.values[column.indexes[rowIndex]]
      if (value !== null) row[column.name] = value
    }
    rows[rowIndex] = row
  }
  return rows
}
