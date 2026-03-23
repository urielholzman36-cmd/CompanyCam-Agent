const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { 'User-Agent': 'VO360PhotoOrganizer/1.0' } }
    )
    if (!res.ok) return 'Unknown'
    const data = await res.json()
    return data.address?.city || data.address?.town || data.address?.village || 'Unknown'
  } catch {
    return 'Unknown'
  }
}
