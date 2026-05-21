import { ButtonV2, InputField } from "@rootcodelabs/skapp-ui";
import { useFormik } from "formik";
import { useEffect, useMemo, useState } from "react";
import * as Yup from "yup";
import CloseIcon from "~community/common/assets/Icons/CloseIcon";
import { characterLengths } from "~community/common/constants/stringConstants";
import { isValidPhoneNumber } from "~community/common/regex/regexPatterns";

import { ToastType } from "~community/common/enums/ComponentEnums";
import { useTranslator } from "~community/common/hooks/useTranslator";
import useSessionData from "~community/common/hooks/useSessionData";
import { useToast } from "~community/common/providers/ToastProvider";
import { useGetUserPersonalDetails } from "~community/people/api/PeopleApi";
import useGetDefaultCountryCode from "~community/people/hooks/useGetDefaultCountryCode";
import {
  useCreateContact,
  useGetCrmCompanies,
  useGetCrmOwners
} from "~community/crm/api/CrmContactsApi";
import CompanySearchField from "~community/crm/components/molecules/CompanySearchField/CompanySearchField";
import OwnerSearchField from "~community/crm/components/molecules/OwnerSearchField/OwnerSearchField";
import { useCrmStore } from "~community/crm/store/store";
import { ContactOwner } from "~community/crm/types/CommonTypes";
import { CrmModalTypes } from "~community/crm/types/ModalTypes";

interface CreateContactFormValues {
  name: string;
  email: string;
  company: string;
  companyId: number | null;
  contactNumber: string;
  countryCode: string;
  ownerId: number | null;
}

const CreateContactModal = () => {
  const translateText = useTranslator(
    "crmModule",
    "contacts",
    "createContactModal"
  );
  const countryCode = useGetDefaultCountryCode();
  const { setToastMessage } = useToast();

  const { setIsAddContactModalOpen, setCrmModalType } = useCrmStore((state) => state);

  const { isCrmAdmin, isCrmSalesManager, isCrmSalesRepresentative, isSuperAdmin } = useSessionData();
  const { data: me } = useGetUserPersonalDetails();

  const crmRole = useMemo((): ContactOwner["crmRole"] => {
    if (isCrmAdmin) return "CRM_ADMIN";
    if (isCrmSalesManager) return "CRM_SALES_MANAGER";
    return "CRM_SALES_REPRESENTATIVE";
  }, [isCrmAdmin, isCrmSalesManager]);

  const defaultOwner = useMemo((): ContactOwner | null => {
    if (!me?.employeeId) return null;
    return {
      employeeId: me.employeeId as number,
      firstName: me.firstName ?? "",
      lastName: me.lastName ?? "",
      email: me.email ?? "",
      authPic: (me.authPic as string | null) ?? null,
      crmRole
    };
  }, [me, crmRole]);

  const [selectedOwner, setSelectedOwner] = useState<ContactOwner | null>(null);

  const { data: companiesData }= useGetCrmCompanies({ page: 0, size: 100 });
  const { data: ownersData } = useGetCrmOwners({ page: 0, size: 100 });

  const companyOptions = (companiesData?.items ?? []).map((c) => ({
    id: c.id,
    name: c.name
  }));

  const ownerOptions: ContactOwner[] = (ownersData?.items ?? []).map((o) => ({
    employeeId: o.employeeId,
    firstName: o.firstName,
    lastName: o.lastName,
    email: o.email,
    authPic: o.authPic,
    crmRole: o.crmRole
  }));

  const validationSchema = Yup.object({
    name: Yup.string().required(translateText(["validations", "contactNameRequired"])),
    email: Yup.string()
      .required(translateText(["validations", "emailRequired"]))
      .email(translateText(["validations", "emailInvalid"])),
    contactNumber: Yup.string()
      .nullable()
      .optional()
      .test(
        "valid-contact-number",
        translateText(["validations", "contactNumber"]),
        function (inputContactNumber) {
          if (!inputContactNumber || inputContactNumber === "") {
            return true;
          }
          return isValidPhoneNumber().test(inputContactNumber);
        }
      )
      .max(
        characterLengths.PHONE_NUMBER_LENGTH_MAX,
        translateText(["validations", "contactNumberLength"])
      ),
  });

  const formik = useFormik<CreateContactFormValues>({
    initialValues: {
      name: "",
      email: "",
      company: "",
      companyId: null,
      contactNumber: "",
      countryCode,
      ownerId: defaultOwner?.employeeId ?? null
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values) => {
      mutate({
        name: values.name,
        email: values.email,
        companyId: values.companyId || undefined,
        contactNumber:
          values.contactNumber
            ? `+${values.countryCode}${values.contactNumber}`
            : undefined,
        ownerId: values.ownerId || undefined
      });
    }
  });

  useEffect(() => {
    if (defaultOwner && !selectedOwner) {
      setSelectedOwner(defaultOwner);
      formik.setFieldValue("ownerId", defaultOwner.employeeId);
    }
  }, [defaultOwner]);

  const { values, errors, handleChange, isSubmitting, setFieldValue, setSubmitting, submitForm } = formik;

  const { mutate, isPending } = useCreateContact({
    onSuccess: () => {
      setSubmitting(false);
      setIsAddContactModalOpen(false);
      setCrmModalType(CrmModalTypes.ADD_CONTACT_MODAL);
      setToastMessage({
        open: true,
        toastType: ToastType.SUCCESS,
        title: translateText(["toasts", "successTitle"]),
        description: translateText(["toasts", "successDescription"])
      });
    },
    onError: (message: string) => {
      setSubmitting(false);
      setToastMessage({
        open: true,
        toastType: ToastType.ERROR,
        title: translateText(["toasts", "errorTitle"]),
        description: message
      });
    }
  });

  const handleCloseModal = () => {
    setIsAddContactModalOpen(false);
    setCrmModalType(CrmModalTypes.ADD_CONTACT_MODAL);
  };

  const handleOwnerSelect = (owner: ContactOwner) => {
    setSelectedOwner(owner);
    setFieldValue("ownerId", owner.employeeId);
  };

  const handleOwnerClear = () => {
    setSelectedOwner(null);
    setFieldValue("ownerId", null);
  };

  return (
    <div className="flex flex-col h-full justify-between gap-[0.625rem]">
      <InputField
        name="name"
        label={translateText(["labels", "contactName"])}
        placeholder={translateText(["placeholders", "contactName"])}
        value={values.name}
        errorMessage={errors.name || ""}
        state={errors.name ? "error" : "default"}
        required
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "contactName"])}
        fullWidth
      />

      <InputField
        name="email"
        label={translateText(["labels", "email"])}
        placeholder={translateText(["placeholders", "email"])}
        value={values.email}
        errorMessage={errors.email || ""}
        state={errors.email ? "error" : "default"}
        required
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "email"])}
        fullWidth
      />

      <CompanySearchField
        label={translateText(["labels", "company"])}
        placeholder={translateText(["placeholders", "company"])}
        value={values.company}
        onChange={(name, id) => {
          setFieldValue("company", name);
          setFieldValue("companyId", id);
        }}
        options={companyOptions}
        onAddCompany={() => {}}
        addCompanyLabel={translateText(["buttons", "addCompany"])}
        noResultsText={translateText(["noResults", "company"])}
        aria-label={translateText(["ariaLabels", "company"])}
      />

      <InputField
        name="contactNumber"
        label={translateText(["labels", "contactNo"])}
        placeholder={translateText(["placeholders", "contactNo"])}
        value={values.contactNumber}
        errorMessage={errors.contactNumber || ""}
        state={errors.contactNumber ? "error" : "default"}
        onChange={handleChange}
        aria-label={translateText(["ariaLabels", "contactNo"])}
        fullWidth
      />

      <OwnerSearchField
        label={translateText(["labels", "contactOwner"])}
        placeholder={translateText(["placeholders", "contactOwner"])}
        selectedOwner={selectedOwner}
        onSelect={handleOwnerSelect}
        onClear={handleOwnerClear}
        options={ownerOptions}
        noResultsText={translateText(["noResults", "owner"])}
        aria-label={translateText(["ariaLabels", "contactOwner"])}
        readonly={isCrmSalesRepresentative && !isCrmSalesManager && !isCrmAdmin && !isSuperAdmin}
      />

      <div className="flex flex-row justify-end py-[0.85rem] gap-[1rem]">
        <ButtonV2
          variant="tertiary"
          icon={<CloseIcon />}
          iconPosition="end"
          type="button"
          disabled={isSubmitting}
          onClick={handleCloseModal}
          aria-label={translateText(["ariaLabels", "cancel"])}
        >
          {translateText(["buttons", "cancel"])}
        </ButtonV2>
        <ButtonV2
          variant="primary"
          type="button"
          disabled={isSubmitting || isPending}
          onClick={() => submitForm()}
          aria-label={translateText(["ariaLabels", "save"])}
        >
          {translateText(["buttons", "save"])}
        </ButtonV2>
      </div>
    </div>
  );
};

export default CreateContactModal;
