import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';

// Owner rule: every guide is SEO + AEO + GEO (CLAUDE.md). These checks keep new and edited posts honest.
const indexed = blogPosts.filter((b) => !NOINDEX_POSTS.includes(b.slug));
const slugs = new Set(blogPosts.map((b) => b.slug));
const publicFile = (p: string) => existsSync(join(process.cwd(), 'public', p));

describe('blog posts', () => {
  it('have unique slugs', () => {
    expect(slugs.size).toBe(blogPosts.length);
  });

  it('fit Google snippets: meta_title up to 60 chars, meta_description up to 160', () => {
    for (const b of indexed) {
      expect(b.meta_title.length, b.slug).toBeLessThanOrEqual(60);
      expect(b.meta_description.length, b.slug).toBeLessThanOrEqual(160);
    }
  });

  it('open with a bold Short answer and carry FAQs (AEO)', () => {
    for (const b of indexed) {
      expect(b.content, b.slug).toMatch(/\*\*Short answer:?\*\*/);
      expect(b.faqs?.length || 0, b.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('link only to guides that exist', () => {
    for (const b of blogPosts) {
      for (const r of b.related_slugs || []) expect(slugs.has(r), `${b.slug} related ${r}`).toBe(true);
      for (const m of Array.from(b.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)(#[^)]*)?\)/g))) {
        expect(slugs.has(m[1]), `${b.slug} links /blog/${m[1]}`).toBe(true);
      }
    }
  });

  it('use self-hosted photos that exist', () => {
    for (const b of blogPosts) {
      expect(publicFile(b.image), `${b.slug} hero ${b.image}`).toBe(true);
      for (const m of Array.from(b.content.matchAll(/\]\((\/images\/places\/[a-z0-9-]+\.jpg)\)/g))) {
        expect(publicFile(m[1]), `${b.slug} photo ${m[1]}`).toBe(true);
      }
    }
  });
});
