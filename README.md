# EVE Visual Industry

This is a web-app that will (eventually) be a way to visualise and try out different ideas for industry activities in EVE Online.

It's currently also my learning space for trying out a few things at once:
- Svelte and SvelteKit
- Publishing to GitHub Pages
- Building a web app from scratch

It's currently just a personal project and is not meant to be used by others yet, so I won't (yet?) be answering any queries with regards to its functionality. 

The instructions below are currently targeted at my future self should I forget how to set things up.

Ongoing documentation will be included in (docs/), which is NOT used for GitHub pages.


# Setting up

```bash
npm install
npm run dev
```


# Deploying to GitHub pages

```bash
git checkout -b gh-pages   # Create a local branch called "gh-pages"
npm run build   # Build the Svelte app using the currently specified adapter into the "/dist" folder
git subtree push --prefix dist origin gh-pages   # Push the "/dist" folder onto the "gh-pages" branch on GitHub to update Pages

git checkout main   # Switch back to the main branch
git branch -D gh-pages   # Delete the local branch
```

Some parts of this app will be a Single-Page App, so the approach at (https://github.com/rafgraph/spa-github-pages) was followed to use a `404.html` redirect to the built `index.html`.