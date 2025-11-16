import FormInput from "@/components/FormInput";

export const fieldConfigs = {
  shipments: [
    {
      id: "shipmentNo",
      label: "Shipment No.",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "carrier",
      label: "Carrier",
      type: "select",
      options: [
        "GHTK",
        "GHN",
        "Viettel Post",
        "J&T",
        "Ninja Van",
        "Best Express",
      ],
      component: FormInput,
      required: true,
    },
    {
      id: "trackingCode",
      label: "Track Code",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      options: [
        "Preparing",
        "Shipped",
        "In Transit",
        "Delivered",
        "Returned",
        "Canceled",
      ],
      component: FormInput,
      required: true,
    },
    {
      id: "shippedAt",
      label: "Shipped At",
      type: "datetime",
      component: FormInput,
    },
    {
      id: "estimatedDelivery",
      label: "Estimated Delivery",
      type: "date",
      component: FormInput,
    },
    {
      id: "deliveredAt",
      label: "Delivered At",
      type: "datetime",
      component: FormInput,
      readOnly: true,
    },
    {
      id: "notes",
      label: "Notes",
      type: "text",
      component: FormInput,
    },
  ],

  "shipment-items": [
    {
      id: "ShipmentNo",
      label: "ShipmentNo.",
      type: "select",
      options: [], // load from API
      required: true,
      component: FormInput,
    },
    {
      id: "salesOrderId",
      label: "Sales Order",
      type: "select",
      options: [], // load from API
      required: true,
      component: FormInput,
    },
    {
      id: "productName",
      label: "Product",
      type: "select",
      options: [], // load from API
      required: true,
      component: FormInput,
    },
    {
      id: "productBatch",
      label: "Batch No.",
      type: "select",
      options: [], // load based on product
      required: true,
      component: FormInput,
    },
    {
      id: "qty",
      label: "Quantity",
      type: "number",
      component: FormInput,
      required: true,
      min: 1,
    },
  ],

  "tracking-events": [
    {
      id: "ShipmentNo",
      label: "ShipmentNo.",
      type: "select",
      options: [], // load from API
      required: true,
      component: FormInput,
    },
    {
      id: "trackingCode",
      label: "Track Code",
      type: "text",
      component: FormInput,
      required: true,
    },
    {
      id: "eventTime",
      label: "Event Time",
      type: "datetime",
      component: FormInput,
      required: true,
    },
    {
      id: "location",
      label: "Location",
      type: "text",
      component: FormInput,
      placeholder: "e.g., Hanoi, GHN Warehouse Cau Giay",
    },
    {
      id: "statusText",
      label: "Event Description",
      type: "text",
      component: FormInput,
      required: true,
      placeholder: "Picked up, In delivery...",
    },
  ],
};
