export const menuItems = [
  {
    id: "shipments",
    label: "Shipments",
    columns: [
      { id: "stt", label: "No." },
      { id: "shipmentNo", label: "Shipment No." },
      { id: "carrier", label: "Carrier" },
      { id: "trackingCode", label: "Track Code" },
      { id: "status", label: "Status" },
      { id: "shippedAt", label: "Shipped Date" },
      { id: "estimatedDelivery", label: "ETA" },
      { id: "deliveredAt", label: "Delivered At" },
      { id: "notes", label: "Notes" },
    ],
  },
  {
    id: "shipment-items",
    label: "Shipment Items",
    parent: "shipments",
    columns: [
      { id: "stt", label: "No." },
      { id: "shipmentNo", label: "ShipmentNo." },
      { id: "salesOrderId", label: "Sales Order" },
      { id: "productName", label: "Product" },
      { id: "productBatch", label: "Batch No." },
      { id: "qty", label: "Quantity" },
    ],
  },
  {
    id: "tracking-events",
    label: "Tracking Events",
    parent: "shipments",
    columns: [
      { id: "stt", label: "No." },
      { id: "shipmentNo", label: "Shipment No." },
      { id: "trackingCode", label: "Track Code" },
      { id: "eventTime", label: "Event Time" },
      { id: "location", label: "Location" },
      { id: "statusText", label: "Event" },
    ],
  },
];
