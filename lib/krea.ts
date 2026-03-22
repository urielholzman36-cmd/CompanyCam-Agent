import axios from 'axios'

// NOTE: Verify endpoint and request shape against Krea API docs before deploying
const KREA_API_BASE = 'https://api.krea.ai/v1'
const KREA_MODEL = 'nano-banana'

export async function generateAfterPhoto(inputImageBuffer: Buffer): Promise<Buffer> {
  const base64Image = inputImageBuffer.toString('base64')

  const response = await axios.post(
    `${KREA_API_BASE}/generate`,
    {
      model: KREA_MODEL,
      image: base64Image,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KREA_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const outputUrl: string = response.data.output_url
  const imageResponse = await axios.get(outputUrl, { responseType: 'arraybuffer' })
  return Buffer.from(imageResponse.data)
}
