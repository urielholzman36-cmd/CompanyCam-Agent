import { buildFilename, buildFolderName, cityToFileCase } from '@/lib/google-drive'

describe('cityToFileCase', () => {
  it('converts city name to underscore title case', () => {
    expect(cityToFileCase('Chula Vista')).toBe('Chula_Vista')
    expect(cityToFileCase('San Diego')).toBe('San_Diego')
    expect(cityToFileCase('Phoenix')).toBe('Phoenix')
  })
})

describe('buildFilename', () => {
  it('builds correct original filename', () => {
    expect(buildFilename('bathroom_remodeling', 'Chula Vista')).toBe('bathroom_remodeling_Chula_Vista.jpg')
  })

  it('builds correct after filename', () => {
    expect(buildFilename('bathroom_remodeling', 'Chula Vista', true)).toBe('bathroom_remodeling_Chula_Vista_after.jpg')
  })

  it('builds unclassified filename', () => {
    expect(buildFilename('unclassified', 'Chula Vista')).toBe('unclassified_Chula_Vista.jpg')
  })
})

describe('buildFolderName', () => {
  it('builds title case folder name', () => {
    expect(buildFolderName('bathroom_remodeling', 'Chula Vista')).toBe('Bathroom Remodeling Chula Vista')
  })

  it('handles unclassified keyword', () => {
    expect(buildFolderName('unclassified', 'Chula Vista')).toBe('Unclassified')
  })
})
