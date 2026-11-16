# Profile

Personal website. Plain HTML, CSS and JavaScript, with no build step.

## Files

- Pages: `index.html`, `about.html`, `projects.html`, `research.html`, `writing.html`, `post.html`, `contact.html`
- `style.css` holds the design. The colours for light and dark mode are defined once at the top.
- `script.js` holds the interactions (page changes, theme switch, quick menu, posts).
- `Naveen_Ragav_CV.pdf` is the CV linked from the site. Replace the file to update it.
- `fonts/` and `vendor/` hold the bundled fonts and the Markdown library.

## Adding a blog post

1. Write the post in Markdown and save it as `posts/my-post-name.md`. Start with the first paragraph, not a title.
2. Add an entry to the top of `posts/posts.json`:

   ```json
   {
     "slug": "my-post-name",
     "title": "The title of the post",
     "date": "2026-12-01",
     "summary": "One sentence shown in the list of posts.",
     "tags": ["agents"]
   }
   ```

   The `slug` must match the file name. Add `"draft": true` to hide a post from the list while you work on it.
3. Commit and push. The post appears on the Writing page and on the home page.

`posts/example-post.md` is a hidden template that shows the formatting.

## Hosting

GitHub Pages: Settings → Pages → Deploy from a branch → choose the branch and `/ (root)`.
