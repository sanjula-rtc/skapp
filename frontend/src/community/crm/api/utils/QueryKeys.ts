export const crmQueryKeys = {
  CRM_OWNERS: (params?: object) =>
    ["crm-owners", params].filter((val) => val !== undefined),
  CRM_COMPANIES: (params?: object) =>
    ["crm-companies", params].filter((val) => val !== undefined)
}

export const companyQueryKeys = {
  GET_COMPANY_DATA: ["get-company-data"],
  CHECK_COMPANY_NAME_EXISTS: ["check-company-name-exists"]
};
