export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg, "bad_request");
export const notFound = (what = "Item") => new HttpError(404, `${what} not found`, "not_found");
export const forbidden = (msg: string) => new HttpError(403, msg, "forbidden");
export const needsConfirmation = (msg = "This action needs confirmation") =>
  new HttpError(428, msg, "confirmation_required");
export const notConfigured = (msg: string) => new HttpError(424, msg, "not_configured");
