export const crmQueryKeys = {
  CRM_OWNERS: (params?: object) =>
    ["crm-owners", params].filter((val) => val !== undefined),
  CRM_COMPANIES: (params?: object) =>
    ["crm-companies", params].filter((val) => val !== undefined)
};
