import { imageCacheManager, type ParticipatePreloadPhase } from '@/lib/utils/imageCacheManager'
import { getParticipateImageUrl } from '@/lib/utils/participateImageUrls'

function flattenAssignedTasks(assigned: unknown): any[] {
  if (!Array.isArray(assigned)) return []
  return assigned.flatMap((item) => {
    if (Array.isArray(item)) return item.filter(Boolean)
    return item ? [item] : []
  })
}

/** Load respondent tasks + layer background from localStorage (participate funnel). */
export function loadParticipateTasksFromStorage(): {
  tasks: any[]
  backgroundUrl: string | null
} {
  if (typeof window === 'undefined') return { tasks: [], backgroundUrl: null }

  try {
    const detailsRaw = localStorage.getItem('current_study_details')
    const sessionRaw = localStorage.getItem('study_session')
    if (!detailsRaw) return { tasks: [], backgroundUrl: null }

    const study = JSON.parse(detailsRaw)
    const { respondentId } = sessionRaw ? JSON.parse(sessionRaw) : { respondentId: 0 }
    const studyInfo = study?.study_info || study
    const assignedTasks = study?.assigned_tasks

    let userTasks: any[] = []
    if (Array.isArray(assignedTasks) && assignedTasks.length > 0) {
      userTasks = flattenAssignedTasks(assignedTasks)
    } else {
      const tasksObj = study?.tasks || study?.data?.tasks || study?.task_map || study?.task || {}
      const respondentKey = String(respondentId ?? 0)
      let respondentTasks: any[] =
        tasksObj?.[respondentKey] || tasksObj?.[Number(respondentKey)] || []
      if (!Array.isArray(respondentTasks) || respondentTasks.length === 0) {
        if (Array.isArray(tasksObj)) {
          respondentTasks = tasksObj
        } else if (tasksObj && typeof tasksObj === 'object') {
          for (const v of Object.values(tasksObj)) {
            if (Array.isArray(v) && v.length) {
              respondentTasks = v as any[]
              break
            }
          }
        }
      }
      userTasks = respondentTasks
    }

    const backgroundUrl =
      studyInfo?.metadata?.background_image_url ||
      study?.metadata?.background_image_url ||
      studyInfo?.background_image_url ||
      null

    return { tasks: userTasks, backgroundUrl }
  } catch {
    return { tasks: [], backgroundUrl: null }
  }
}

/** Fire-and-forget staged preload for personal-info / classification / orientation. */
export function runParticipatePhasePreload(phase: ParticipatePreloadPhase): void {
  const { tasks, backgroundUrl } = loadParticipateTasksFromStorage()
  if (tasks.length === 0) return
  void imageCacheManager
    .preloadParticipatePhase(tasks, phase, backgroundUrl, getParticipateImageUrl)
    .catch(() => undefined)
}

function extractPreviewRespondentTasks(matrix: unknown): any[] {
  if (Array.isArray(matrix)) return matrix
  if (!matrix || typeof matrix !== 'object') return []

  const m = matrix as Record<string, unknown>
  if (Array.isArray(m.preview_tasks)) return m.preview_tasks
  if (Array.isArray(m.tasks)) return m.tasks

  if (m.tasks && typeof m.tasks === 'object') {
    const buckets = m.tasks as Record<string, unknown>
    if (Array.isArray(buckets['0']) && buckets['0'].length) return buckets['0']
    for (const v of Object.values(buckets)) {
      if (Array.isArray(v) && v.length) return v
    }
  }

  return []
}

/** Load respondent tasks + layer background from localStorage (preview funnel). */
export function loadPreviewTasksFromStorage(): {
  tasks: any[]
  backgroundUrl: string | null
} {
  if (typeof window === 'undefined') return { tasks: [], backgroundUrl: null }

  try {
    const step7matrixRaw = localStorage.getItem('cs_step7_matrix')
    const layerBgRaw = localStorage.getItem('cs_step5_layer_background')
    if (!step7matrixRaw) return { tasks: [], backgroundUrl: null }

    const matrix = JSON.parse(step7matrixRaw)
    const layerBg = layerBgRaw ? JSON.parse(layerBgRaw) : null
    const tasks = extractPreviewRespondentTasks(matrix)
    const backgroundUrl =
      (layerBg?.secureUrl as string | undefined) ||
      (layerBg?.previewUrl as string | undefined) ||
      null

    return { tasks, backgroundUrl }
  } catch {
    return { tasks: [], backgroundUrl: null }
  }
}

/** Staged preload for the create-study preview funnel (same strategy as participate). */
export function runPreviewPhasePreload(phase: ParticipatePreloadPhase): void {
  const { tasks, backgroundUrl } = loadPreviewTasksFromStorage()
  if (tasks.length === 0) return
  void imageCacheManager
    .preloadParticipatePhase(tasks, phase, backgroundUrl, getParticipateImageUrl)
    .catch(() => undefined)
}
