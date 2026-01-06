import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from '@layouts/Layout';
import Dashboard from '@pages/dashboard';
import Login from '@pages/auth/login';
import Signup from '@pages/auth/signup';
import NotFound from '@pages/notfound';
import Warehouse from '@/pages/warehouse';
import ProductDetail from '@/pages/warehouse/ProductDetail';
import BatchDetail from '@/pages/warehouse/BatchDetail';
import LocationDetail from '@/pages/warehouse/LocationDetail';
import WarehouseDetail from '@/pages/warehouse/WarehouseDetail';
import Inventory from '@/pages/inventory';
// import Supplier from '@/pages/supplier';
import SupplierDetail from '@/pages/supplier/SupplierDetail';
import PODetail from '@/pages/purchase-order/PODetail';
import Procurement from '@/pages/procurement';
import ShipmentList from '@/pages/shipment';
import ShipmentCreate from '@/pages/shipment/ShipmentCreate';
import ShipmentDetail from '@/pages/shipment/ShipmentDetail';
import ShipmentTracking from '@/pages/shipment/ShipmentTracking';
import Report from '@/pages/reports';
import Alert from '@/pages/alert';
import DemandPlanning from '@/pages/demand-planning';
import Sales from '@/pages/sales';
import CustomerDetail from '@/pages/sales/CustomerDetail';
import SODetail from '../pages/sales/SODetail';
import AuditLog from '../pages/audit-log';

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
          <Route path="/inventory" element={<Inventory />} />
          {/* <Route path="/supplier" element={<Supplier />} /> */}
          <Route path="/supplier/detail" element={<SupplierDetail />} />
          <Route path="/purchase-order/detail" element={<PODetail />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/shipments" element={<ShipmentList />} />
          <Route path="/shipments/create" element={<ShipmentCreate />} />
          <Route path="/shipments/track" element={<ShipmentTracking />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/reports" element={<Report />} />
          <Route path="/alerts" element={<Alert />} />
          <Route path="/demand-planning" element={<DemandPlanning />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/customer/detail" element={<CustomerDetail />} />
          <Route path="/sales-order/detail" element={<SODetail />} />
          <Route path="/audit-logs" element={<AuditLog />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
