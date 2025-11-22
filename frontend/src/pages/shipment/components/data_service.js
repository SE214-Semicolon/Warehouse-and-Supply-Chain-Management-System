export const shipmentsData = [
  {
    id: 1,
    shipmentNo: "SHP001",
    carrier: "GHN",
    trackingCode: "TRK001",
    status: "Shipped",
    shippedAt: "2024-03-20 07:00 AM",
    estimatedDelivery: "2024-03-25",
    deliveredAt: null,
    notes: "I want to sleep",
  },
];

export const shipmentItemsData = [
  {
    id: 1,
    shipmentNo: "SHP001",
    salesOrderId: "SO-123",
    productName: "Product A",
    productBatch: "BATCH001",
    qty: 10,
  },
];

export const trackingEventsData = [
  {
    id: 1,
    shipmentNo: "SHP001",
    trackingCode: "TRK001",
    eventTime: "2024-03-20 10:00 AM",
    location: "Hanoi Hub",
    statusText: "Picked up",
  },
];

// Data provider

export const dataProvider = async (menu) => {
  switch (menu) {
    case "shipments":
      return shipmentsData;

    case "shipment-items":
      return shipmentItemsData;

    case "tracking-events":
      return trackingEventsData;

    default:
      console.warn("Chưa có dữ liệu cho menu:", menu);
      return [];
  }
};
