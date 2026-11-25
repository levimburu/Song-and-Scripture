import { describe, expect, it } from 'vitest'
import { classifyFile, isMediaUrl, mediaUrl } from './media'

describe('media helpers', () => {
  it('classifies by extension, ignoring case', () => {
    expect(classifyFile('Sunrise.JPG')).toBe('image')
    expect(classifyFile('a.b.png')).toBe('image')
    expect(classifyFile('loop.MP4')).toBe('video')
    expect(classifyFile('notes.txt')).toBeNull()
    expect(classifyFile('noextension')).toBeNull()
  })

  it('builds urls the protocol handler recognises', () => {
    const url = mediaUrl('m1 x.jpg')
    expect(url).toBe('sas-media://local/m1%20x.jpg')
    expect(isMediaUrl(url)).toBe(true)
    expect(isMediaUrl('https://evil.example/x.jpg')).toBe(false)
    expect(isMediaUrl(5)).toBe(false)
  })
})
