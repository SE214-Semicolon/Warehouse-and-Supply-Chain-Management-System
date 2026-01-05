import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from '@layouts/Layout';
import Dashboard from '@pages/dashboard';
import Login from '@pages/auth/login';
import Signup from '@pages/auth/signup';
import NotFound from '@pages/notfound';
import Warehouse from '../pages/warehouse';
import ProductDetail from '@/pages/warehouse/ProductDetail';
import BatchDetail from '@/pages/warehouse/BatchDetail';
import LocationDetail from '@/pages/warehouse/LocationDetail';
import WarehouseDetail from '@/pages/warehouse/WarehouseDetail';
import Shipment from '@/pages/shipment';
import SupplierDetail from '@/pages/supplier/SupplierDetail';
import PODetail from '@/pages/purchase-order/PODetail';
import Procurement from '@/pages/procurement';
import Report from '@/pages/reports';
import Sales from '@/pages/sales';

export default function MainRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route cha có Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/warehouse/products/:id" element={<ProductDetail />} />
          <Route path="/warehouse/batches/:id" element={<BatchDetail />} />
          <Route path="/warehouse/locations/:id" element={<LocationDetail />} />
          <Route
            path="/warehouse/warehouses/:id"
            element={<WarehouseDetail />}
          />
          <Route path="/shipment" element={<Shipment />} />
          <Route path="/supplier/detail" element={<SupplierDetail />} />
          <Route path="/purchase-order/detail" element={<PODetail />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/reports" element={<Report />} />
          <Route path="/sales" element={<Sales />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
