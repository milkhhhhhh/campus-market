/**
 * Server-side database entrypoint.
 *
 * @campus/db owns the globalThis-backed PrismaClient singleton; re-exporting it
 * here prevents Next.js code from accidentally creating a second client.
 */
export { prisma } from "@campus/db";
