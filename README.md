# Taskly

A responsive task manager and product browser built with React and Vite.

## Features

- Add a task with an optional repeat count, such as `Make Food 3`.
- Edit, complete, filter, search, and delete tasks. Each saved edit increments that task's update counter.
- Tasks and their update counts persist in the browser with local storage.
- Demo sign-in and sign-up screens, with a local profile session and sign-out.
- Browse, search, and filter Fake Store products; select a product for full details.
- Light/dark theme and responsive desktop/mobile layouts.

## Demo sign-in

Use any valid email address and password to sign in. Sign-up checks the name, email, password length, and confirmation, then stores only the profile name and email locally. This is a front-end demo, not secure authentication: it does not verify credentials, protect tasks, or create real accounts. Connect a service such as Supabase or Firebase before using real users or passwords.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To verify a production build, run `npm run build` and optionally `npm run preview`.

## Deploy to Netlify

1. Push this project to a GitHub repository.
2. In Netlify, choose **Add new site** → **Import an existing project**, then connect the repository.
3. Use build command `npm run build` and publish directory `dist` (also configured in `netlify.toml`).
4. Deploy the site; Netlify will provide its public URL.

The product catalog tries `https://fakestoreapi.com/products` first and falls back to `https://dummyjson.com/products` if Fake Store is unavailable. Both response formats are normalized for the product grid. The catalog requires an internet connection.
