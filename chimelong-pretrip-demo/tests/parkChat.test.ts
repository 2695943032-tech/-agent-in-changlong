import { describe, expect, it } from 'vitest'
import { sanitizeParkReply } from '../server/utils/parkChat'

describe('park chat reply sanitizer', () => {
  it('removes leading stage directions from model replies', () => {
    expect(sanitizeParkReply('（慢慢蹲步靠近围栏）你看我们的舌头，有45厘米长。'))
      .toBe('你看我们的舌头，有45厘米长。')

    expect(sanitizeParkReply('（轻轻低下头，用温和的目光看着你）腿疼的话，可以找个地方歇歇。'))
      .toBe('腿疼的话，可以找个地方歇歇。')
  })

  it('keeps normal answer content unchanged', () => {
    expect(sanitizeParkReply('腿疼的话，可以先去附近休息点坐一坐。'))
      .toBe('腿疼的话，可以先去附近休息点坐一坐。')
  })
})
