Expanded versions of the original short guides in data/blog.ts.
Each file exports `override: Partial<BlogPost>`, merged over the post with
the same slug in data/blog.ts (see `withCoreOverride` there).
