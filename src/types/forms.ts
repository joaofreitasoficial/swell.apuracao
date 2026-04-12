export type FormState = {
  success?: string;
  error?: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormState: FormState = {};
