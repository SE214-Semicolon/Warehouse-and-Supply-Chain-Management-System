import FormInput from "@/components/FormInput";

export const fieldConfigs = {
  warehouses: [
    {
      id: "code",
      label: "Code",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "address",
      label: "Address",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "totalArea",
      label: "Area",
      type: "text",
      component: FormInput,
      required: true,
    },
  ],

  categories: [
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
  ],

  locations: [
    {
      id: "code",
      label: "Code",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "type",
      label: "Type",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "capacity",
      label: "Capacity",
      type: "number",
      component: FormInput,
      required: true,
    },
    {
      id: "warehouseId",
      label: "Warehouse",
      type: "select",
      options: [],
      component: FormInput,
      required: true,
    },
  ],

  products: [
    {
      id: "sku",
      label: "SKU",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "name",
      label: "Name",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "categoryId",
      label: "Category",
      type: "select",
      options: [],
      component: FormInput,
      required: true,
    },
    {
      id: "unit",
      label: "Unit",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "barcode",
      label: "Barcode",
      type: "text",
      component: FormInput,
      required: true,
    },
  ],

  batches: [
    {
      id: "batchNo",
      label: "Batch No",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "productId",
      label: "Product",
      type: "select",
      options: [],
      component: FormInput,
      required: true,
    },
    {
      id: "quantity",
      label: "Quantity",
      type: "number",
      component: FormInput,
      required: true,
    },
    {
      id: "manufactureDate",
      label: "Manufacture Date",
      type: "date",
      component: FormInput,
      required: true,
    },
    {
      id: "expiryDate",
      label: "Expiry Date",
      type: "date",
      component: FormInput,
    },
  ],
};
