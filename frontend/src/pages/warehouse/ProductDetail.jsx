import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import ProductService from "@/services/product.service";
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

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteProductDialog, setOpenDeleteProductDialog] = useState(false);

  const fetchProductDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ProductService.getById(id);
      setProduct(res?.data ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

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

  const handleDeleteProduct = () => setOpenDeleteProductDialog(true);

  const confirmDeleteProduct = async () => {
    if (!id) return;
    await ProductService.delete(id);
    localStorage.setItem("selectedMenu", "products");
    navigate("/warehouse");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!product) {
    return (
      <EmptyStateCard
        title="Product not found"
        description="The product may have been deleted or does not exist"
        buttonText="Back to product list"
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
        onDelete={handleDeleteProduct}
        disableDelete={product.batches && product.batches.length > 0}
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
        productId={id}
        onRefresh={fetchProductDetail}
      />

      <FormDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onAction={handleSaveProduct}
        mode="edit"
        selectedMenu="products"
        selectedRow={product}
      />

      <ConfirmDeleteDialog
        open={openDeleteProductDialog}
        onClose={() => setOpenDeleteProductDialog(false)}
        onConfirm={confirmDeleteProduct}
        selectedRow={product}
      />
    </Box>
  );
};

export default ProductDetail;
