import { fetchProjects, fetchPhotos, extractCity } from '@/lib/companycam'

jest.mock('axios')
import axios from 'axios'
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('extractCity', () => {
  it('returns city from address object when available', () => {
    const address = { city: 'Chula Vista', state: 'CA', street_address_1: '123 Main St', postal_code: '91910' }
    expect(extractCity(address)).toBe('Chula Vista')
  })

  it('returns empty string when city is missing', () => {
    const address = { city: '', state: 'CA', street_address_1: '123 Main St, San Diego, CA', postal_code: '92101' }
    expect(extractCity(address)).toBe('')
  })
})

describe('fetchProjects', () => {
  it('returns list of projects from CompanyCam', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: '1', name: 'Test Project', address: { city: 'Chula Vista', state: 'CA', street_address_1: '123 Main', postal_code: '91910' } }],
      headers: { link: '' },
    })
    const projects = await fetchProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Test Project')
  })
})

describe('fetchPhotos', () => {
  it('returns all photos for a project', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 'p1', uri: 'https://example.com/photo1.jpg' }],
      headers: { link: '' },
    })
    const photos = await fetchPhotos('project-1')
    expect(photos).toHaveLength(1)
    expect(photos[0].uri).toBe('https://example.com/photo1.jpg')
  })
})
