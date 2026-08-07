export interface JourneyPhase {
  id: 'pretrip' | 'inpark' | 'posttrip'
  index: string
  eyebrow: string
  title: string
  englishTitle: string
  description: string
  to: string
  accent: string
  accentSoft: string
  image: string
  animal: string
  status: string
}
