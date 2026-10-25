import type { z } from "zod";
import { badRequest } from "./errors.js";

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    throw badRequest(r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  }
  return r.data;
}

export const idParam = (params: unknown) => {
  const id = Number((params as { id?: string }).id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Invalid id");
  return id;
};
