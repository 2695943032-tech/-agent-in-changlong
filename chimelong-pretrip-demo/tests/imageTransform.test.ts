import { describe, expect, it } from 'vitest'
import { extractImageResult, PIXEL_MEMORY_PROMPT } from '../server/utils/imageTransform'

describe('游后照片像素化接口适配', () => {
  it('兼容 OpenAI-compatible 的 base64 图片结果', () => {
    expect(extractImageResult({ data: [{ b64_json: 'pixel-base64' }] })).toEqual({
      value: 'pixel-base64',
      kind: 'base64',
    })
  })

  it('兼容返回远程图片地址的图生图服务', () => {
    expect(extractImageResult({ output: [{ url: 'https://images.example/pixel.png' }] })).toEqual({
      value: 'https://images.example/pixel.png',
      kind: 'url',
    })
  })

  it('提示词明确要求保留游客身份特征与清晰度', () => {
    expect(PIXEL_MEMORY_PROMPT).toContain('保留人物身份与可辨识特征')
    expect(PIXEL_MEMORY_PROMPT).toContain('面部清楚')
    expect(PIXEL_MEMORY_PROMPT).toContain('不要增加或删除人物')
  })
})
