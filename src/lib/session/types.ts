export type Session = {
  mode: "oidc";
  userId?: string;
  platformAdmin: boolean;
  isReferent?: boolean;
  displayName: string;
};

export type RefreshedSession = {
  legalConsentRequired?: boolean;
  userId: string;
  platformAdmin: boolean;
  isReferent?: boolean;
  displayName: string;
};
