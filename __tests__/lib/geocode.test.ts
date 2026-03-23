import { reverseGeocode } from '@/lib/geocode'

global.fetch = jest.fn()

describe('reverseGeocode', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns city from Nominatim response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { city: 'San Diego', state: 'California', country: 'United States' },
      }),
    })

    const city = await reverseGeocode(32.7157, -117.1611)
    expect(city).toBe('San Diego')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lat=32.7157&lon=-117.1611'),
      expect.any(Object)
    )
  })

  it('falls back to town if city is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { town: 'Chula Vista', state: 'California' },
      }),
    })

    const city = await reverseGeocode(32.64, -117.08)
    expect(city).toBe('Chula Vista')
  })

  it('returns "Unknown" when geocoding fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false })

    const city = await reverseGeocode(0, 0)
    expect(city).toBe('Unknown')
  })
})
