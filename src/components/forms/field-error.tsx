import { ErrorMessage } from "formik";

export function FieldError({ name }: { name: string }) {
  return (
    <ErrorMessage name={name} component="span" className="mt-1 block text-xs text-kumtru-risk" />
  );
}
