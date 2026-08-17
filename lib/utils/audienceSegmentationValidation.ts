export type AgeSelection = {
	checked?: boolean
	percent?: string | number
}

export type AudienceSegmentationData = {
	respondents?: number | ''
	countries?: string[]
	genderMale?: number | ''
	genderFemale?: number | ''
	ageSelections?: Record<string, AgeSelection>
}

export type AudienceSegmentationValidation = {
	valid: boolean
	error: string | null
	total: number
	checkedCount: number
}

export function parseAgePercent(value: string | number | undefined): number | null {
	if (value === undefined || value === null || value === '') return null
	const num = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value)
	if (Number.isNaN(num)) return null
	return num
}

export function getCheckedAgeEntries(ageSelections: Record<string, AgeSelection> = {}) {
	return Object.entries(ageSelections).filter(([, v]) => v?.checked)
}

export function getAgeDistributionTotal(ageSelections: Record<string, AgeSelection> = {}) {
	return getCheckedAgeEntries(ageSelections).reduce((sum, [, v]) => sum + (parseAgePercent(v?.percent) ?? 0), 0)
}

export function buildAgeDistributionPayload(ageSelections: Record<string, AgeSelection> = {}) {
	const age_distribution: Record<string, number> = {}
	getCheckedAgeEntries(ageSelections).forEach(([label, v]) => {
		const num = parseAgePercent(v?.percent)
		if (num !== null && num > 0) {
			age_distribution[label] = num
		}
	})
	return age_distribution
}

export function formatAgeSplitForDisplay(ageSelections: Record<string, AgeSelection> = {}) {
	return getCheckedAgeEntries(ageSelections)
		.map(([label, v]) => {
			const num = parseAgePercent(v?.percent)
			if (num === null || num <= 0) return null
			return `${label} (${num}%)`
		})
		.filter(Boolean)
		.join(', ')
}

export function validateAudienceSegmentation(data: AudienceSegmentationData): AudienceSegmentationValidation {
	const respondents = typeof data.respondents === 'number' ? data.respondents : Number(data.respondents || 0)
	if (!respondents || respondents < 1) {
		return { valid: false, error: 'Number of respondents is required.', total: 0, checkedCount: 0 }
	}

	if (!Array.isArray(data.countries) || data.countries.length === 0) {
		return { valid: false, error: 'At least one country is required.', total: 0, checkedCount: 0 }
	}

	const checked = getCheckedAgeEntries(data.ageSelections)
	if (checked.length === 0) {
		return {
			valid: false,
			error: 'Select at least one age group. Age distribution must total 100%.',
			total: 0,
			checkedCount: 0,
		}
	}

	for (const [label, v] of checked) {
		const num = parseAgePercent(v?.percent)
		if (num === null) {
			return {
				valid: false,
				error: `Enter a percentage for ${label}.`,
				total: getAgeDistributionTotal(data.ageSelections),
				checkedCount: checked.length,
			}
		}
		if (num < 0 || num > 100) {
			return {
				valid: false,
				error: `${label} must be between 0 and 100%.`,
				total: getAgeDistributionTotal(data.ageSelections),
				checkedCount: checked.length,
			}
		}
	}

	const total = getAgeDistributionTotal(data.ageSelections)
	if (total < 100) {
		return {
			valid: false,
			error: `Age distribution must total 100%. Current total: ${total}%.`,
			total,
			checkedCount: checked.length,
		}
	}
	if (total > 100) {
		return {
			valid: false,
			error: `Age distribution cannot exceed 100%. Current total: ${total}%.`,
			total,
			checkedCount: checked.length,
		}
	}

	return { valid: true, error: null, total, checkedCount: checked.length }
}

export function getAudienceSegmentationFromLocalStorage(): AudienceSegmentationData {
	if (typeof window === 'undefined') return {}
	try {
		const raw = localStorage.getItem('cs_step6')
		if (!raw) return {}
		return JSON.parse(raw) as AudienceSegmentationData
	} catch {
		return {}
	}
}

export function isAudienceSegmentationStepValid(data?: AudienceSegmentationData) {
	return validateAudienceSegmentation(data ?? getAudienceSegmentationFromLocalStorage()).valid
}
