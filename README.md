Kuleo — the business OS for yoga teachers. Next.js (App Router) on Vercel,
Neon Postgres, Clerk auth, Stripe, Resend. **This repo is the source of truth
and deploys to kuleo.io on every push to `main`.**

## Deploying (read this before pushing)

Pushing to `main` auto-deploys production via Vercel. The reliable flow:

```bash
git clone git@github.com:davideknopf-prog/Flowspace.git && cd Flowspace
git checkout -b my-change
# ...make changes...
npm install && npm run build     # must pass before pushing
git commit -am "..." && git push -u origin my-change   # PR, or push straight to main to deploy
```

Schema lives in `src/lib/schema.sql`; apply additive migrations to the prod DB
with `npm run db:migrate` **before** the code that needs them deploys (they're
backward-compatible, so the currently-live code just ignores new tables/columns).

> ⚠️ **Some AI/agent workspaces run a nested copy of this app** (e.g. the code
> sitting under `wellness-tracker/web/…` with a stale git `HEAD`). Do **not**
> `git push` from those — the layout and history don't line up with this repo
> and a push can fork history or clobber the deployed branch. Instead, make
> changes there, then transplant them into a **fresh clone of this repo** (which
> keeps the app at the root, `src/…`), build, and push from the clone.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
