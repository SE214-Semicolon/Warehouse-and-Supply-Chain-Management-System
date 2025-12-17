import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from '@layouts/Layout';
import Dashboard from '@pages/dashboard';
import Login from '@pages/auth/login';
import Signup from '@pages/auth/signup';
import NotFound from '@pages/notfound';
import Inventory from '@/pages/inventory';
import Warehouse from '@/pages/warehouse';
import ProductDetail from '@/pages/warehouse/ProductDetail';
import BatchDetail from '@/pages/warehouse/BatchDetail';
import Supplier from '@/pages/supplier';
import Shipment from '@/pages/shipment';
import SupplierDetail from '@/pages/supplier/SupplierDetail';
import PurchaseOrder from '@/pages/purchase-order';
import PODetail from '@/pages/purchase-order/PODetail';

export default function MainRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route cha có Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/warehouse/products/:id" element={<ProductDetail />} />
          <Route path="/warehouse/batches/:id" element={<BatchDetail />} />
          <Route path="/supplier" element={<Supplier />} />
          <Route path="/shipment" element={<Shipment />} />
          <Route path="/supplier/detail" element={<SupplierDetail />} />
          <Route path="purchase-order" element={<PurchaseOrder />} />
          <Route path="purchase-order/detail" element={<PODetail />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
