import { generateAfterPhoto } from '@/lib/krea'

jest.mock('axios')
import axios from 'axios'
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('generateAfterPhoto', () => {
  it('returns a buffer from Krea API response URL', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { output_url: 'https://krea.ai/generated/result.jpg' },
    })
    mockedAxios.get.mockResolvedValueOnce({
      data: Buffer.from('fake-image-data'),
    })

    const inputBuffer = Buffer.from('fake-input-image')
    const result = await generateAfterPhoto(inputBuffer)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('throws on Krea API error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Krea API error'))
    const inputBuffer = Buffer.from('fake-input-image')
    await expect(generateAfterPhoto(inputBuffer)).rejects.toThrow('Krea API error')
  })
})
