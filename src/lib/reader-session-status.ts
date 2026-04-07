import { ReaderSessionAccessState } from "@/lib/reader-session";

export function resolveReaderSessionStatusPayload(input: {
  access: ReaderSessionAccessState;
  sidProvided: boolean;
}) {
  if (!input.access.allowed) {
    return { status: 403, body: { mode: "EXPIRED" as const } };
  }

  if (input.access.mode === "GRACE") {
    if (!input.sidProvided) {
      return { status: 403, body: { mode: "EXPIRED" as const } };
    }
    return {
      status: 200,
      body: {
        mode: "GRACE" as const,
        graceEndsAt: input.access.graceEndsAt.toISOString(),
      },
    };
  }

  return { status: 200, body: { mode: "ACTIVE" as const } };
}
