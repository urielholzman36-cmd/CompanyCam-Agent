import Anthropic from '@anthropic-ai/sdk'
import { ClassificationResult } from '@/types'

const PROMPT = `You are analyzing a construction or renovation photo.
Identify the type of work shown in the image and return a JSON response:
{
  "keyword": "snake_case_description_of_work",
  "confidence": "high" | "low"
}
Use short descriptive keywords like "bathroom_remodeling", "roof_inspection", "kitchen_plumbing", "flooring_installation", "window_replacement", "electrical_work", "plumbing_repair", etc.
Return confidence "low" if the image is blurry, unclear, or does not clearly show a specific type of work.
Return only valid JSON, no other text.`

export async function classifyPhoto(imageUrl: string): Promise<ClassificationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)

    return {
      keyword: parsed.keyword as string,
      confidence: parsed.confidence as 'high' | 'low',
    }
  } catch {
    return { keyword: 'unclassified', confidence: 'low' }
  }
}
