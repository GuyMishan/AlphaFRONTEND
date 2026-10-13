export type Session = {
  mode: "oidc";
  userId?: string;
  platformAdmin: boolean;
  isReferent?: boolean;
  displayName: string;
};

export type RefreshedSession = {
  userId: string;
  platformAdmin: boolean;
  isReferent?: boolean;
  displayName: string;
};
