# CLAUDE.md - Development Guidelines

## Build & Test Commands

- Development: `pnpm dev` (see note below if env vars appear empty)
- Development (safe): `env -i HOME="$HOME" PATH="$PATH" USER="$USER" SHELL="$SHELL" bash -c 'set -a && source .env && set +a && npx next dev --turbopack'`
  > Use this if the shell has stale empty env vars exported (e.g. NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, ECONOMY_LLM_PROVIDER).
  > Root cause: some tool previously sourced `.env.example` into the shell session.
- Build: `pnpm build`
- Lint: `pnpm lint`
- Run all tests: `pnpm test`
- Run AI tests: `pnpm test-ai`
- Run single test: `pnpm test __tests__/test-file.test.ts`
- Run specific AI test: `pnpm test-ai ai-categorize-senders`

## Code Style

- Use TypeScript with strict null checks
- Path aliases: Use `@/` for imports from project root
- NextJS app router structure with (app) directory
- Follow tailwindcss patterns with prettier-plugin-tailwindcss
- Prefer functional components with hooks
- Use proper error handling with try/catch blocks
- Format code with Prettier
- Consult .cursor/rules for environment variable management

## Component Guidelines

- Use shadcn/ui components when available
- Ensure responsive design with mobile-first approach
- Follow consistent naming conventions (PascalCase for components)
- Centralize types in dedicated type files when shared
- Use LoadingContent component for async data:
  ```tsx
  <LoadingContent loading={isLoading} error={error}>
    {data && <YourComponent data={data} />}
  </LoadingContent>
  ```

## Database & RLS

- When adding new tables/models to Prisma schema, evaluate whether RLS policies are needed
- User-scoped tables MUST include a `userId` or `emailAccountId` foreign key for authorization
- All Prisma queries for user-scoped data MUST include `where: { userId }` or equivalent
- RLS policies are managed via Supabase CLI (`supabase db push` or migrations)
- Connect via `supabase` CLI for direct DB operations: `supabase db execute`
- Admin role is stored in User.role field (enum: USER, ADMIN)

## Environment Variables

- Add to `.env.example`, `env.ts`, and `turbo.json`
- Client-side vars: Prefix with `NEXT_PUBLIC_`

## Git & Branching Strategy

- `main` is the source of truth — represents the latest stable Bntly code
- Create short-lived feature branches off `main` for new work (e.g., `ralph/priority-inbox`, `ralph/scan-inbox`)
- Always create a PR against `main` for review before merging
- Delete feature branches after merge
- Ralph autonomous agent branches use the `ralph/` prefix
