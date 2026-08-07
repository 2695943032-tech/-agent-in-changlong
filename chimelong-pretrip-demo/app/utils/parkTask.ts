import type { ZoneTask } from '../../shared/types/park'

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextRandom(state: number): number {
  let value = state || 0x9e3779b9
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

export function shuffleTaskChoices(task: ZoneTask, sessionSeed: number): string[] {
  const choices = [...task.choices]
  let randomState = hashText(`${sessionSeed}:${task.id}`)

  for (let index = choices.length - 1; index > 0; index -= 1) {
    randomState = nextRandom(randomState)
    const swapIndex = randomState % (index + 1)
    const current = choices[index]
    choices[index] = choices[swapIndex]!
    choices[swapIndex] = current!
  }

  return choices
}
