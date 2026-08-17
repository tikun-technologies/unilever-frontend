"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { putUpdateStudyAsync } from "@/lib/api/StudyAPI"
import {
	buildAgeDistributionPayload,
	validateAudienceSegmentation,
} from "@/lib/utils/audienceSegmentationValidation"

const COUNTRIES = [
	"Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
	"Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
	"Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
	"Denmark", "Djibouti", "Dominica", "Dominican Republic",
	"Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
	"Fiji", "Finland", "France",
	"Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana",
	"Haiti", "Honduras", "Hungary",
	"Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
	"Jamaica", "Japan", "Jordan",
	"Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
	"Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
	"Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
	"Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
	"Oman",
	"Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
	"Qatar",
	"Romania", "Russia", "Rwanda",
	"Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
	"Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
	"Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
	"Vanuatu", "Venezuela", "Vietnam",
	"Yemen",
	"Zambia", "Zimbabwe"
]

function useCountryFilter(query: string) {
	return useMemo(() => {
		if (!query) return []
		const q = query.toLowerCase()
		return COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0, 8)
	}, [query])
}

interface Step6AudienceSegmentationProps {
	onNext: () => void
	onBack: () => void
	onDataChange?: () => void
	isReadOnly?: boolean
	/** When Keys step exists (special creator), Audience is step 7; otherwise 6 */
	lastStepNumber?: number
}

export function Step6AudienceSegmentation({ onNext, onBack, onDataChange, isReadOnly = false, lastStepNumber = 6 }: Step6AudienceSegmentationProps) {
	const [respondents, setRespondents] = useState<number | ''>(() => { try { const v = localStorage.getItem('cs_step6'); if (v) { const o = JSON.parse(v); if (typeof o.respondents === 'number' && o.respondents > 0) return Math.min(1500, o.respondents); return '' } } catch { }; return '' })
	const [countryQuery, setCountryQuery] = useState("")
	const [countries, setCountries] = useState<string[]>(() => { try { const v = localStorage.getItem('cs_step6'); if (v) { const o = JSON.parse(v); return Array.isArray(o.countries) ? o.countries : [] } } catch { }; return [] })
	const [genderMale, setGenderMale] = useState<number | ''>(() => { try { const v = localStorage.getItem('cs_step6'); if (v) { const o = JSON.parse(v); return typeof o.genderMale === 'number' ? o.genderMale : 50 } } catch { }; return 50 })
	const [genderFemale, setGenderFemale] = useState<number | ''>(() => { try { const v = localStorage.getItem('cs_step6'); if (v) { const o = JSON.parse(v); return typeof o.genderFemale === 'number' ? o.genderFemale : 50 } } catch { }; return 50 })
	const [ageSelections, setAgeSelections] = useState<Record<string, { checked: boolean; percent: string }>>(() => {
		const defaults: Record<string, { checked: boolean; percent: string }> = {
			"18 - 24": { checked: false, percent: "" },
			"25 - 34": { checked: false, percent: "" },
			"35 - 44": { checked: false, percent: "" },
			"45 - 54": { checked: false, percent: "" },
			"55 - 64": { checked: false, percent: "" },
			"65+": { checked: false, percent: "" }
		}
		try {
			const v = localStorage.getItem('cs_step6')
			if (v) {
				const o = JSON.parse(v)
				if (o.ageSelections && typeof o.ageSelections === 'object') {
					const merged = { ...defaults }
					Object.keys(defaults).forEach((k) => {
						if (o.ageSelections[k]) {
							merged[k] = o.ageSelections[k]
						}
					})
					return merged
				}
			}
		} catch { }
		return defaults
	})

	const suggestions = useCountryFilter(countryQuery)

	// Helper function to balance gender percentages
	const handleGenderChange = (type: 'male' | 'female', value: number | '') => {
		// Validate percentage range (0-100)
		if (typeof value === 'number' && (value < 0 || value > 100)) {
			return // Don't update if invalid
		}

		if (type === 'male') {
			setGenderMale(value)
			if (typeof value === 'number') {
				setGenderFemale(100 - value)
			}
		} else {
			setGenderFemale(value)
			if (typeof value === 'number') {
				setGenderMale(100 - value)
			}
		}
	}

	const handleAgeChange = (label: string, checked: boolean) => {
		setAgeSelections(prev => {
			const next = {
				...prev,
				[label]: {
					...prev[label],
					checked,
					percent: checked ? prev[label]?.percent || '' : '',
				},
			}
			const checkedEntries = Object.entries(next).filter(([, value]) => value.checked)
			if (checkedEntries.length === 1 && !checkedEntries[0][1].percent) {
				const [onlyLabel, onlyValue] = checkedEntries[0]
				next[onlyLabel] = { ...onlyValue, percent: '100' }
			}
			return next
		})
	}

	const handleAgePercentChange = (label: string, percent: string) => {
		if (percent !== '' && !/^\d+$/.test(percent)) return
		const percentValue = percent === '' ? null : Number(percent)
		if (percentValue !== null && (percentValue < 0 || percentValue > 100)) return

		setAgeSelections(prev => ({
			...prev,
			[label]: { ...prev[label], checked: true, percent },
		}))
	}

	const handleAgePercentFocus = (label: string) => {
		if (!ageSelections[label]?.checked) {
			handleAgeChange(label, true)
		}
	}

	const audienceValidation = useMemo(
		() => validateAudienceSegmentation({ respondents, countries, genderMale, genderFemale, ageSelections }),
		[respondents, countries, genderMale, genderFemale, ageSelections]
	)

	const ageDistributionError = audienceValidation.error

	const addCountry = (name: string) => {
		if (!countries.includes(name)) {
			setCountries(prev => [...prev, name])
		}
		setCountryQuery("")
	}

	const removeCountry = (name: string) => {
		setCountries(prev => prev.filter(c => c !== name))
	}

	const canProceed = audienceValidation.valid

	useEffect(() => {
		if (typeof window === 'undefined') return
		localStorage.setItem('cs_step6', JSON.stringify({ respondents, countries, genderMale, genderFemale, ageSelections }))
		onDataChange?.()
	}, [respondents, countries, genderMale, genderFemale, ageSelections, onDataChange])

	return (
		<div>
			<div>
				<h3 className="text-lg font-semibold text-gray-800">Audience Segmentation</h3>
				<p className="text-sm text-gray-600">Configure the parameters that will be used to generate the RDE task matrix.</p>
			</div>

			<div className={`space-y-6 mt-5 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}>
				<div>
					<label className="block text-sm font-semibold text-gray-800 mb-2">Number of Respondents <span className="text-red-500">*</span></label>
					<Input
						type="number"
						min={1}
						max={1500}
						value={respondents}
						onChange={(e) => {
							const v = e.target.value
							if (v === '') { setRespondents(''); return }
							const n = Math.max(1, Math.min(1500, Number(v)))
							setRespondents(Number.isNaN(n) ? 1 : n)
						}}
						className="rounded-lg"
					/>
					<div className="mt-1 text-xs text-gray-500">Between 1 and 1500 respondents.</div>
				</div>

				<div>
					<label className="block text-sm font-semibold text-gray-800 mb-2">Country Selection <span className="text-red-500">*</span></label>
					<div className="relative">
						<div className="flex flex-wrap gap-2 border rounded-lg p-2 min-h-[42px] focus-within:ring-2 focus-within:ring-[rgba(38,116,186,0.3)]">
							{countries.map((country) => (
								<div key={country} className="px-2 py-1 bg-[rgba(38,116,186,0.1)] text-[rgba(38,116,186,1)] rounded-md text-sm flex items-center gap-1 group">
									{country}
									<button
										type="button"
										className="text-gray-400 hover:text-[rgba(38,116,186,1)] transition-colors"
										onClick={() => removeCountry(country)}
									>
										×
									</button>
								</div>
							))}
							<input
								className="flex-1 min-w-[120px] outline-none px-2 bg-transparent text-sm"
								placeholder={countries.length === 0 ? "Type a country..." : "Add another..."}
								value={countryQuery}
								onChange={(e) => setCountryQuery(e.target.value)}
							/>
						</div>
						{suggestions.length > 0 && (
							<div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto">
								{suggestions.map((s) => (
									<button
										type="button"
										key={s}
										onClick={() => addCountry(s)}
										className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-sm ${countries.includes(s) ? 'opacity-50 cursor-not-allowed' : ''}`}
										disabled={countries.includes(s)}
									>
										{s}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div>
					<div className="text-sm font-semibold text-gray-800 mb-2">Audience Distribution</div>
					<div className="flex items-center gap-2">
						<div className="px-4 py-2 rounded-md bg-slate-100 border text-sm">Male</div>
						<Input
							type="number"
							value={genderMale}
							onChange={(e) => handleGenderChange('male', e.target.value === '' ? '' : Number(e.target.value))}
							className="w-20 text-center"
							min="0"
							max="100"
						/>
						<div className="text-sm">%</div>
						<div className="px-4 py-2 rounded-md bg-slate-100 border text-sm ml-4">Female</div>
						<Input
							type="number"
							value={genderFemale}
							onChange={(e) => handleGenderChange('female', e.target.value === '' ? '' : Number(e.target.value))}
							className="w-20 text-center"
							min="0"
							max="100"
						/>
						<div className="text-sm">%</div>
					</div>
				</div>

				<div>
					<div className="text-sm font-semibold text-gray-800 mb-2">Age Distribution <span className="text-red-500">*</span></div>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
						{Object.entries(ageSelections).map(([label, v]) => (
							<div key={label} className="flex items-center gap-2 border rounded-md p-2">
								<input type="checkbox" checked={v.checked} onChange={(e) => handleAgeChange(label, e.target.checked)} />
								<div className="flex-1 text-sm">{label}</div>
								<Input
									value={v.percent}
									onChange={(e) => handleAgePercentChange(label, e.target.value)}
									onFocus={() => handleAgePercentFocus(label)}
									className="w-16 text-center"
									type="number"
									min="0"
									max="100"
								/>
								<div className="text-sm">%</div>
							</div>
						))}
					</div>
					{ageDistributionError && (
						<p className="mt-2 text-sm text-red-600">{ageDistributionError}</p>
					)}
					{audienceValidation.checkedCount > 0 && !ageDistributionError && (
						<p className="mt-2 text-sm text-green-600">Age distribution total: 100%</p>
					)}
				</div>
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-10">
				<Button variant="outline" className="rounded-full cursor-pointer px-6 w-full sm:w-auto" onClick={onBack}>Back</Button>
				<Button
					className="rounded-full px-6 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] w-full sm:w-auto cursor-pointer"
					onClick={() => {
						if (isReadOnly) {
							onNext()
							return
						}
						try {
							// Read study id robustly (handle plain string or JSON string)
							let studyId: string | null = null
							try {
								const raw = localStorage.getItem('cs_study_id')
								if (raw) {
									try { studyId = JSON.parse(raw) } catch { studyId = raw }
								}
							} catch { }

							// Build audience_segmentation payload from current local state
							const age_distribution = buildAgeDistributionPayload(ageSelections)

							const payload = {
								last_step: lastStepNumber,
								audience_segmentation: {

									number_of_respondents: Math.min(1500, Math.max(1, Number(respondents || 0))),
									country: Array.isArray(countries) ? countries.join(', ') : String(countries || ''),
									gender_distribution: { male: Number(genderMale || 0), female: Number(genderFemale || 0) },
									age_distribution,
								}
							}

							if (studyId) {
								// Fire-and-forget background PUT update
								putUpdateStudyAsync(String(studyId), payload)
								console.log('[Step6] Scheduled background PUT update for audience_segmentation', payload)
							} else {
								console.log('[Step6] No study id found in localStorage; skipping background PUT')
							}
						} catch (err) {
							console.warn('[Step6] Failed to schedule background PUT update', err)
						}

						// Proceed immediately without waiting for the background update
						onNext()
					}}
					disabled={!canProceed}
				>
					Save & Next
				</Button>
			</div>
		</div>
	)
}


