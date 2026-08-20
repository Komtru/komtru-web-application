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

/** Standard success envelope returned by the Kumtru API. */
export interface IResponse<D = unknown> {
  status: "success" | "error";
  message: string;
  data: D;
}

/** Standard error envelope. Callers read `err.message`. */
export interface RequestError {
  status?: "error";
  code: number;
  message: string;
  errorCode?: string;
  stack?: string;
  errors?: Record<string, string[]>;
}

/** A downloaded file plus the filename parsed from `content-disposition`. */
export interface IBlobResponse {
  blob: Blob;
  filename: string;
  contentType: string;
}
