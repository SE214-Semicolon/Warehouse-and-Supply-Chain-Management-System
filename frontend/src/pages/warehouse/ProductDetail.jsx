import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Paper } from "@mui/material";
import ProductService from "@/services/product.service";
import ProductBatchService from "@/services/batch.service";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { formatDate } from "@/utils/formatDate";

import FormDialog from "./components/FormDialog";
import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import ProductBatchesSection from "./components/product_detail/ProductBatchesSection";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchMode, setBatchMode] = useState("add");

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  const fetchProductDetail = async () => {
    setLoading(true);
    try {
      const res = await ProductService.getAll();
      const allProducts = res.data?.data || [];
      const foundProduct = allProducts.find((p) => p.id === id);

      setProduct(foundProduct || null);
    } catch (error) {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    localStorage.setItem("selectedMenu", "products");
    navigate("/warehouse");
  };

  const handleEditProduct = () => setOpenEditDialog(true);

  const handleSaveProduct = async (formData) => {
    await ProductService.update(id, formData);
    await fetchProductDetail();
    setOpenEditDialog(false);
  };

  // Batch handlers
  const handleAddBatch = () => {
    setBatchMode("add");
    setSelectedBatch(null);
    setOpenBatchDialog(true);
  };

  const handleEditBatch = (batch) => {
    setBatchMode("total");
    setSelectedBatch(batch);
    setOpenBatchDialog(true);
  };

  const handleDeleteBatch = (batch) => {
    setSelectedBatch(batch);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteBatch = async () => {
    if (!selectedBatch?.id) return;

    await ProductBatchService.delete(selectedBatch.id);
    await fetchProductDetail();
    setOpenDeleteDialog(false);
  };

  const handleSaveBatch = async (formData) => {
    const batchData = { ...formData, productId: id };

    if (batchMode === "edit" && selectedBatch?.id) {
      await ProductBatchService.update(selectedBatch.id, batchData);
    } else {
      await ProductBatchService.create(batchData);
    }

    await fetchProductDetail();
    setOpenBatchDialog(false);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!product) {
    return (
      <EmptyStateCard
        title="Không tìm thấy sản phẩm"
        description="Sản phẩm có thể đã bị xóa hoặc không tồn tại"
        buttonText="Quay lại danh sách sản phẩm"
        onButtonClick={handleBack}
      />
    );
  }

  const totalQuantity =
    product.batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;

  return (
    <Box>
      <DetailHeader
        title={product.name}
        onBack={handleBack}
        onEdit={handleEditProduct}
        subtitleItems={[
          { label: "SKU", value: product.sku },
          { label: "Category", value: product.category?.name || "-" },
        ]}
        statItems={[
          { label: "Total Quantity", value: totalQuantity.toLocaleString() },
          { label: "Batch Number", value: product.batches?.length || 0 },
        ]}
      />

      <InfoCard
        title="Detail Information"
        subtitle="Full product details"
        headerColor="#764ba2"
        leftFields={[
          { label: "Name", value: product.name },
          { label: "SKU", value: product.sku },
          { label: "Category", value: product.category?.name },
          { label: "Unit", value: product.unit },
        ]}
        rightFields={[
          { label: "Barcode", value: product.barcode },
          { label: "Total batch", value: product.batches?.length || 0 },
          { label: "Create Date", value: formatDate(product.createdAt) },
          { label: "Update Date", value: formatDate(product.updatedAt) },
        ]}
      />

      <ProductBatchesSection
        batches={product.batches || []}
        onAddBatch={handleAddBatch}
        onEditBatch={handleEditBatch}
        onDeleteBatch={handleDeleteBatch}
      />

      <FormDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onAction={handleSaveProduct}
        mode="edit"
        selectedMenu="products"
        selectedRow={product}
      />

      {openBatchDialog && (
        <FormDialog
          open={openBatchDialog}
          onClose={() => setOpenBatchDialog(false)}
          onAction={handleSaveBatch}
          mode={batchMode}
          selectedMenu="batches"
          selectedRow={batchMode === "edit" ? selectedBatch : null}
        />
      )}

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDeleteBatch}
        selectedRow={selectedBatch}
      />
    </Box>
  );
};

export default ProductDetail;
