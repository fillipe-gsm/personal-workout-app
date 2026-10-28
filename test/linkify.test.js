// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { linkify } from '../src/components/base.js'

describe('linkify', () => {
  it('turns http(s) URLs into anchors and keeps trailing punctuation outside', () => {
    const html = linkify('See more at https://example.com/a.')
    expect(html).toBe(
      'See more at <a class="text-link" href="https://example.com/a" target="_blank" rel="noopener noreferrer">https://example.com/a</a>.'
    )
  })

  it('handles several URLs and query strings', () => {
    const html = linkify('A https://a.example/?x=1&y=2, B http://b.example/path!')
    expect(html).toContain('href="https://a.example/?x=1&amp;y=2"')
    expect(html).toContain('href="http://b.example/path"')
    expect(html.match(/<a /g)).toHaveLength(2)
    expect(html).toContain('</a>,')
    expect(html).toContain('</a>!')
  })

  it('escapes HTML so user descriptions cannot inject markup', () => {
    const html = linkify('<img src=x onerror=alert(1)> https://example.com')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('<a class="text-link" href="https://example.com"')
  })

  it('does not link non-http schemes', () => {
    expect(linkify('javascript:alert(1)')).toBe('javascript:alert(1)')
    expect(linkify('data:text/html,hi')).toBe('data:text/html,hi')
    expect(linkify('ftp://example.com')).toBe('ftp://example.com')
  })

  it('leaves plain text alone', () => {
    expect(linkify('Push day — no links here')).toBe('Push day — no links here')
    expect(linkify('')).toBe('')
    expect(linkify(null)).toBe('')
  })
})
