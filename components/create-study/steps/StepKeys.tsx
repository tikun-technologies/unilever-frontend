"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { putUpdateStudyAsync } from "@/lib/api/StudyAPI"
import { validateProduct, ValidateProductResponse } from "@/api/projectApi"

interface StepKeysProps {
  onNext: () => void
  onBack: () => void
  onDataChange?: () => void
  isReadOnly?: boolean
}

function clampPercentage(n: number): number {
  return Math.max(0, Math.min(100.01, n))
}

const PRODUCT_ID_MAX_LENGTH = 100
const MIN_KEYS = 4
/** Per-key cap; sum of all keys may be up to this same value (100.01) to allow rounding. */
const MAX_KEY_PERCENTAGE = 100.01
const MAX_TOTAL_KEYS_PERCENTAGE = MAX_KEY_PERCENTAGE

function roundPercentage(n: number): number {
  return Math.round(n * 100) / 100
}

export function StepKeys({ onNext, onBack, onDataChange, isReadOnly = false }: StepKeysProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)

  const stored = ((): { productId: string; keys: { name: string; percentage: number }[] } => {
    if (typeof window === "undefined") return { productId: "", keys: [] }
    try {
      const raw = localStorage.getItem("cs_step_keys")
      if (!raw) return { productId: "", keys: [] }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return {
          productId: "",
          keys: parsed.map((item: { name?: string; percentage?: number }) => ({
            name: String(item?.name ?? "").trim(),
            percentage: clampPercentage(Number(item?.percentage) || 0),
          })),
        }
      }
      const arr = parsed?.keys ?? []
      const keyArr = Array.isArray(arr) ? arr : []
      return {
        productId: String(parsed?.productId ?? "").trim().slice(0, PRODUCT_ID_MAX_LENGTH),
        keys: keyArr.map((item: { name?: string; percentage?: number }) => ({
          name: String(item?.name ?? "").trim(),
          percentage: clampPercentage(Number(item?.percentage) || 0),
        })),
      }
    } catch {
      return { productId: "", keys: [] }
    }
  })()

  const [productId, setProductId] = useState(stored.productId)
  const [keys, setKeys] = useState<{ name: string; percentage: number }[]>(() => {
    const loaded = stored.keys.length >= MIN_KEYS ? stored.keys : stored.keys.slice()
    while (loaded.length < MIN_KEYS) {
      loaded.push({ name: "", percentage: 0 })
    }
    return loaded
  })

  const filledKeys = keys.filter((k) => k.name.trim().length > 0)
  const toStoreKeys = filledKeys.map((k) => ({ name: k.name.trim(), percentage: roundPercentage(clampPercentage(k.percentage)) }))
  const totalPercentage = roundPercentage(toStoreKeys.reduce((sum, k) => sum + k.percentage, 0))
  const totalIsValid =
    totalPercentage >= 100 && totalPercentage <= MAX_TOTAL_KEYS_PERCENTAGE
  const productIdValid = productId.trim().length > 0
  const allKeysFilled =
    keys.length > 0 &&
    keys.every((k) => k.name.trim().length > 0 && typeof k.percentage === "number" && k.percentage >= 0)

  // Duplicate name check: two keys cannot have the same name (case-sensitive)
  const keyNames = toStoreKeys.map((k) => k.name)
  const nameCounts = keyNames.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
  const duplicateNames = Object.entries(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
  const hasDuplicateNames = duplicateNames.length > 0

  const canProceed = productIdValid && allKeysFilled && totalIsValid && !hasDuplicateNames

  const hasPercentageError = filledKeys.length > 0 && !totalIsValid

  useEffect(() => {
    if (typeof window === "undefined") return
    if (toStoreKeys.length === 0 && !productId.trim()) {
      localStorage.removeItem("cs_step_keys")
      onDataChange?.()
      return
    }
    const payload = { productId: productId.trim().slice(0, PRODUCT_ID_MAX_LENGTH), keys: toStoreKeys }
    localStorage.setItem("cs_step_keys", JSON.stringify(payload))
    onDataChange?.()
  }, [keys, productId, onDataChange])

  const setKey = (index: number, field: "name" | "percentage", value: string | number) => {
    setKeys((prev) =>
      prev.map((k, i) =>
        i === index
          ? field === "name"
            ? { ...k, name: String(value) }
            : { ...k, percentage: value === "" || value === undefined ? 0 : clampPercentage(Number(value) || 0) }
          : k
      )
    )
  }

  const addKey = () => {
    setKeys((prev) => [...prev, { name: "", percentage: 0 }])
  }

  const removeKey = (index: number) => {
    if (keys.length <= MIN_KEYS) return
    setKeys((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveAndNext = async () => {
    if (isReadOnly) {
      onNext()
      return
    }
    setValidateError(null)
    const productIdTrimmed = productId.trim().slice(0, PRODUCT_ID_MAX_LENGTH)

    setIsSaving(true)
    try {
      const studyIdRaw = localStorage.getItem("cs_study_id")
      let studyId: string | null = null
      if (studyIdRaw) {
        try {
          studyId = JSON.parse(studyIdRaw)
        } catch {
          studyId = studyIdRaw
        }
      }
      const validatePayload = {
        study_id: studyId ?? undefined,
        product_id: productIdTrimmed || undefined,
        product_keys: toStoreKeys,
      }
      const result: ValidateProductResponse = await validateProduct(validatePayload)

      if (!result.valid) {
        const messages: string[] = []
        if (result.product_id_taken) messages.push("This product ID is already used in this project.")
        if (result.key_combination_taken) messages.push("This key combination is already used in this project.")
        setValidateError(messages.length > 0 ? messages.join(" ") : "Validation failed. Please change product ID or keys.")
        setIsSaving(false)
        return
      }

      if (studyId && toStoreKeys.length > 0 && productIdValid) {
        await putUpdateStudyAsync(
          String(studyId),
          { product_keys: toStoreKeys, product_id: productIdTrimmed },
          7
        )
      }
      onNext()
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "Validation failed. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Keys</h3>
        <p className="text-sm text-gray-600">
          Add product keys with name and percentage. Each key can be up to {MAX_KEY_PERCENTAGE}%, and the sum of all keys must be between 100% and {MAX_TOTAL_KEYS_PERCENTAGE}% (inclusive).
        </p>
      </div>

      <div className={`space-y-6 mt-5 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}>
        <div className="max-w-md">
          <label className="text-sm font-medium text-gray-800 block mb-1">Product ID (required)</label>
          <Input
            type="text"
            placeholder="Product ID (max 100 characters)"
            value={productId}
            onChange={(e) => setProductId(e.target.value.slice(0, PRODUCT_ID_MAX_LENGTH))}
            maxLength={PRODUCT_ID_MAX_LENGTH}
            className="rounded-lg"
            disabled={isReadOnly}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {keys.map((key, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border rounded-lg p-3 sm:p-4">
              <label className="text-sm font-medium text-gray-800 min-w-[60px]">Key {idx + 1}</label>
              <Input
                type="text"
                placeholder="Name"
                value={key.name}
                onChange={(e) => setKey(idx, "name", e.target.value)}
                className="flex-1 rounded-lg"
                disabled={isReadOnly}
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={MAX_KEY_PERCENTAGE}
                  step="0.01"
                  value={key.percentage === 0 ? "" : key.percentage}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "") setKey(idx, "percentage", 0)
                    else setKey(idx, "percentage", roundPercentage(parseFloat(v) || 0))
                  }}
                  className="w-20 text-center rounded-lg"
                  disabled={isReadOnly || !key.name.trim()}
                  placeholder="0.00"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              {keys.length > MIN_KEYS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  onClick={() => removeKey(idx)}
                  disabled={isReadOnly}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={addKey}
          >
            Add key
          </Button>
        )}
        {hasPercentageError && (
          <p className="text-sm text-red-600">
            The keys should total between 100% and {MAX_TOTAL_KEYS_PERCENTAGE}%. Current total: {totalPercentage}%.
          </p>
        )}
        {hasDuplicateNames && (
          <p className="text-sm text-red-600">
            Key names must be unique. Duplicate name(s): {duplicateNames.join(", ")}.
          </p>
        )}
        {validateError && (
          <p className="text-sm text-red-600">
            {validateError}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-10">
        <Button
          variant="outline"
          className="rounded-full cursor-pointer px-6 w-full sm:w-auto"
          onClick={onBack}
          disabled={isSaving}
        >
          Back
        </Button>
        <Button
          className="rounded-full px-6 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] w-full sm:w-auto cursor-pointer disabled:opacity-60"
          onClick={handleSaveAndNext}
          disabled={(!canProceed && !isReadOnly) || isSaving}
        >
          {isSaving ? "Saving…" : "Save & Next"}
        </Button>
      </div>
    </div>
  )
}
