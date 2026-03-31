// This file is left for compatibility but not actively used
// The app uses Firebase authentication directly (see app/(auth)/login/page.tsx and app/api/session/route.ts)

export const handlers = {
  GET: (req: Request) => {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
  },
  POST: (req: Request) => {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
  },
};
