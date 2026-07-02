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
