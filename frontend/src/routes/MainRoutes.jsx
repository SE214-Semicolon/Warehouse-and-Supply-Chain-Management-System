import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from '@layouts/Layout';
import Dashboard from '@pages/dashboard';
import Login from '@pages/auth/login';
import Signup from '@pages/auth/signup';
import NotFound from '@pages/notfound';
import WarehouseManagement from '@/pages/inventory';
import Supplier from '@/pages/supplier';

export default function MainRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route cha có Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<WarehouseManagement />} />
          <Route path="/supplier" element={<Supplier />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
