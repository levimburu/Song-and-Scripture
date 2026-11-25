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
  /** undefined = use the service default, null = no background, string = a media id. */
  background?: string | null
}

export type MediaKind = 'image' | 'video'

export interface MediaFile {
  id: string
  name: string
  kind: MediaKind
  /** File name inside the app's media folder. */
  file: string
  size: number
}

export interface OutputBackground {
  kind: MediaKind
  url: string
}

export type OutputMode = 'slide' | 'black' | 'logo' | 'clear'

export interface OutputState {
  mode: OutputMode
  slide: Slide | null
  theme: Theme
  alert: string | null
  background: OutputBackground | null
  /** How much to darken the background, 0 to 90 percent. */
  dim: number
}

export const DEFAULT_DIM = 40

export const DEFAULT_OUTPUT: OutputState = {
  mode: 'black',
  slide: null,
  theme: 'dark',
  alert: null,
  background: null,
  dim: DEFAULT_DIM
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
  listMedia(): Promise<MediaFile[]>
  /** Opens a file picker, copies the chosen files into the app, returns the full list. */
  addMedia(): Promise<MediaFile[]>
  removeMedia(id: string): Promise<MediaFile[]>
}
