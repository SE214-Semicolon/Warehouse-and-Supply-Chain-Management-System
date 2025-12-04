export const menuItems = [
  {
    id: "inventory",
    label: "Inventory",
    columns: [
      { id: "stt", label: "STT" },
      { id: "sku", label: "SKU" },
      { id: "product", label: "Sản phẩm" },
      { id: "batch", label: "Batch" },
      { id: "warehouse", label: "Kho" },
      { id: "location", label: "Location" },
      { id: "available", label: "Available Qty" },
      { id: "reserved", label: "Reserved Qty" },
      { id: "createdAt", label: "Ngày cập nhật" },
    ],
  },
  {
    id: "movements",
    label: "Stock Movements",
    columns: [
      { id: "stt", label: "STT" },
      { id: "date", label: "Ngày giờ" },
      { id: "type", label: "Loại" },
      { id: "product", label: "Sản phẩm" },
      { id: "batch", label: "Batch" },
      { id: "from", label: "From Location" },
      { id: "to", label: "To Location" },
      { id: "qty", label: "Qty" },
      { id: "reference", label: "Reference" },
    ],
  },
];
