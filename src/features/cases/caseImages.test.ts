import { describe, expect, it } from 'vitest'
import { textToHtml } from './bullets'
import { findImageMarkers, imageIdOfLine, nextImageId, referencedImageIds, removeImageMarker, withoutImageMarkers } from './caseImages'
import type { CaseImage } from './caseImages'

const image = (id: number): CaseImage => ({ id, dataUrl: `data:image/png;base64,AAA${id}`, width: 400, height: 200 })
const images = { 1: image(1), 2: image(2) }

describe('image markers', () => {
  it('recognises a line that is only a marker', () => {
    expect(imageIdOfLine('[image 12]')).toBe(12)
    expect(imageIdOfLine('  [image 3]  ')).toBe(3)
    expect(imageIdOfLine('see [image 3]')).toBeNull()
    expect(imageIdOfLine('[image]')).toBeNull()
    expect(imageIdOfLine('[image 3] and more')).toBeNull()
  })

  it('finds where each marker is', () => {
    const text = 'Hello\n\n[image 2]\nand\n[image 1]'
    const found = findImageMarkers(text)
    expect(found.map((m) => m.id)).toEqual([2, 1])
    expect(text.slice(found[0].start, found[0].end)).toBe('[image 2]')
    expect(text.slice(found[1].start, found[1].end)).toBe('[image 1]')
  })

  it('lists each used picture once, in order', () => {
    expect(referencedImageIds('[image 2]\n[image 1]\n[image 2]')).toEqual([2, 1])
  })

  it('numbers a new picture above every stored one', () => {
    expect(nextImageId([])).toBe(1)
    expect(nextImageId([1, 4, 2])).toBe(5)
  })
})

describe('removing markers', () => {
  it('takes one picture out and closes the gap', () => {
    expect(removeImageMarker('Hi\n\n[image 1]\n\nBye', 1)).toBe('Hi\n\nBye')
    expect(removeImageMarker('[image 1]\n\nBye', 1)).toBe('Bye')
  })

  it('keeps the other pictures and leaves an unknown number alone', () => {
    expect(removeImageMarker('[image 1]\n\n[image 2]', 1)).toBe('[image 2]')
    expect(removeImageMarker('Hi\n\n', 7)).toBe('Hi\n\n')
  })

  it('leaves no markers for the plain-text copy, and changes nothing without any', () => {
    expect(withoutImageMarkers('Hi\n\n[image 1]\n\nBye\n[image 2]')).toBe('Hi\n\nBye')
    expect(withoutImageMarkers('Hi\n\nBye\n')).toBe('Hi\n\nBye\n')
  })
})

describe('textToHtml with pictures', () => {
  it('puts the picture where its line was, in its own paragraph', () => {
    const html = textToHtml('Hello\n\n[image 1]\n\nThanks', images)
    expect(html).toBe('<p>Hello</p><p><img src="data:image/png;base64,AAA1" width="400" height="200" alt="Image 1"></p><p>Thanks</p>')
  })

  it('ends a list or paragraph that runs into the marker', () => {
    expect(textToHtml('• one\n[image 2]\ntext', images)).toBe(
      '<ul><li>one</li></ul><p><img src="data:image/png;base64,AAA2" width="400" height="200" alt="Image 2"></p><p>text</p>',
    )
    expect(textToHtml('line\n[image 1]', images)).toContain('<p>line</p><p><img')
  })

  it('skips a marker whose picture is gone', () => {
    expect(textToHtml('a\n\n[image 9]\n\nb', images)).toBe('<p>a</p><p>b</p>')
  })

  it('shows the marker as text when no pictures are supplied', () => {
    expect(textToHtml('[image 1]')).toBe('<p>[image 1]</p>')
  })
})
