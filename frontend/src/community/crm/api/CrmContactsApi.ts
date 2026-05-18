import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import authFetch from "~community/common/utils/axiosInterceptor";
import { crmEndpoints } from "~community/crm/api/utils/ApiEndpoints";
import { crmQueryKeys } from "~community/crm/api/utils/QueryKeys";
import {
  CreateContactPayload,
  CrmCompaniesResponseType,
  CrmOwnersResponseType
} from "~community/crm/types/CommonTypes";

interface CompaniesParams {
  page?: number;
  size?: number;
  searchKeyword?: string;
}

interface OwnersParams {
  page?: number;
  size?: number;
  searchKeyword?: string;
}

export const useGetCrmCompanies = (
  params: CompaniesParams = {}
): UseQueryResult<CrmCompaniesResponseType> => {
  const { page = 0, size = 100, searchKeyword } = params;

  return useQuery({
    queryKey: crmQueryKeys.CRM_COMPANIES(params),
    queryFn: () =>
      authFetch.get(crmEndpoints.GET_COMPANIES, {
        params: {
          page,
          size,
          ...(searchKeyword ? { searchKeyword } : {})
        }
      }),
    select: (data) => data?.data?.results?.[0] as CrmCompaniesResponseType
  });
};

export const useGetCrmOwners = (
  params: OwnersParams = {}
): UseQueryResult<CrmOwnersResponseType> => {
  const { page = 0, size = 100, searchKeyword } = params;

  return useQuery({
    queryKey: crmQueryKeys.CRM_OWNERS(params),
    queryFn: () =>
      authFetch.get(crmEndpoints.GET_OWNERS, {
        params: {
          page,
          size,
          ...(searchKeyword ? { searchKeyword } : {})
        }
      }),
    select: (data) => data?.data?.results?.[0] as CrmOwnersResponseType
  });
};

export const useCreateContact = ({
  onSuccess,
  onError
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateContactPayload) =>
      authFetch.post(crmEndpoints.CREATE_CONTACT, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      onSuccess();
    },
    onError: (error: AxiosError<{ message?: string; results?: Array<{ message: string }> }>) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data?.results?.[0]?.message ??
        "Failed to create contact. Please try again.";
      onError(message);
    }
  });
};
