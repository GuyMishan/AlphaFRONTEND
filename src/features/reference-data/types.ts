export type CityOption = {
  cityCode: number;
  cityName: string;
  regionCode: number | null;
  regionName: string;
};

export type StreetOption = {
  streetCode: number;
  streetName: string;
  officialCode: number;
};

export type ReferenceOption = {
  value: string;
  label: string;
  scope: string;
};

export type SalaryLayerOption = { code: number; name: string };

export type PensionEditorInterfaceOption = {
  code: number;
  name: string;
  scope: string;
};

export type PensionEditorContributionLimit = {
  year: number;
  productType: number;
  party: number;
  component: number;
  maxPercentage: number;
};

export type PensionEditorReferenceData = {
  referenceOptions: Record<string, ReferenceOption[]>;
  interfaceOptions: Record<string, PensionEditorInterfaceOption[]>;
  salaryLayers: SalaryLayerOption[];
  contributionLimits: PensionEditorContributionLimit[];
};

export type BankOption = {
  bankCode: number;
  bankName: string;
};

export type BankBranchOption = {
  branchCode: number;
  branchName: string;
  branchAddress: string;
  city: string;
};
