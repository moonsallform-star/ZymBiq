// Zymbiq — src/app/api/auth/[...nextauth]/route.ts
// NextAuth v5 App Router catch-all handler — delegates entirely to auth config.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;