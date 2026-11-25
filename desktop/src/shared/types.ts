export type Theme = 'dark' | 'light'

export type SectionKind = 'verse' | 'chorus' | 'bridge' | 'scripture' | 'text'

export interface Slide {
  id: string
  kind: SectionKind
  label: string
  lines: string[]
  reference?: string
}

export type ItemType = 'info' | 'song' | 'scripture' | 'announcement' | 'offering' | 'video'

export type ItemStatus = 'ready' | 'missing'

export interface ScheduleItem {
  id: string
  type: ItemType
  title: string
  slides: Slide[]
  status: ItemStatus
}

export type OutputMode = 'slide' | 'black' | 'logo' | 'clear'

export interface OutputState {
  mode: OutputMode
  slide: Slide | null
  theme: Theme
  alert: string | null
}

export const DEFAULT_OUTPUT: OutputState = {
  mode: 'black',
  slide: null,
  theme: 'dark',
  alert: null
}

export interface DisplayInfo {
  count: number
  outputOpen: boolean
  outputOnSecondary: boolean
}

export interface Api {
  setOutput(state: OutputState): void
  requestOutputState(): void
  onOutputState(callback: (state: OutputState) => void): () => void
  getDisplayInfo(): Promise<DisplayInfo>
  onDisplayInfo(callback: (info: DisplayInfo) => void): () => void
  toggleOutput(): Promise<DisplayInfo>
}
