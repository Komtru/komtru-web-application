export type RequestHeaders = Record<string, string>;

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number>
>;

/** Base shape: every facade method takes a single object argument. */
export interface IDelete {
  url: string;
  body?: unknown;
  headers?: RequestHeaders;
}

export interface IPost extends IDelete {
  query?: QueryParams;
}

export type IPatch = IPost;
export type IPut = IPost;

export interface IGet {
  url: string;
  query?: QueryParams;
  headers?: RequestHeaders;
}

export interface IPostMultipart {
  url: string;
  data: FormData;
  query?: QueryParams;
  headers?: RequestHeaders;
}

/**
 * Standard success envelope: `{ status: 'success', data }`.
 *
 * `message` is optional because several endpoints deliberately answer with a
 * message and no data (`POST /auth/password/forgot`) or data and no message
 * (`POST /auth/login`).
 */
export interface IResponse<D = unknown> {
  status: "success";
  message?: string;
  data: D;
}

/** Standard error envelope: `{ status: 'error', code, message }`. Callers read `message`. */
export interface RequestError {
  status?: "error";
  code: number;
  message: string;
  /** Development only. */
  stack?: string;
  /**
   * Some 4xx bodies carry a `data` block with the detail needed to continue —
   * the social-link challenge (409) is the one that matters today.
   */
  data?: Record<string, unknown>;
}

/** Standard pagination envelope for every list endpoint. */
export interface QueryResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** A downloaded file plus the filename parsed from `content-disposition`. */
export interface IBlobResponse {
  blob: Blob;
  filename: string;
  contentType: string;
}
