import { classifyPhoto } from '@/lib/claude-vision'

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: jest.fn() },
    })),
  }
})

import Anthropic from '@anthropic-ai/sdk'

describe('classifyPhoto', () => {
  it('returns keyword and high confidence when Claude responds clearly', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"keyword":"bathroom_remodeling","confidence":"high"}' }],
    })
    ;(Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/photo.jpg')
    expect(result.keyword).toBe('bathroom_remodeling')
    expect(result.confidence).toBe('high')
  })

  it('returns low confidence when Claude returns low confidence', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"keyword":"unclear_image","confidence":"low"}' }],
    })
    ;(Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/blurry.jpg')
    expect(result.confidence).toBe('low')
  })

  it('returns low confidence when Claude response is invalid JSON', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I cannot determine the work type.' }],
    })
    ;(Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/photo.jpg')
    expect(result.confidence).toBe('low')
  })
})
