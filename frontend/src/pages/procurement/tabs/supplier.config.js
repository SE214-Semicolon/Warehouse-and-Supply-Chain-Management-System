import SupplierService from '../../../services/supplier.service';
import FormDialog from '../../supplier/components/FormDialog';
import { columns } from '../../supplier/components/columns';

export const supplierConfig = {
  columns,
  service: SupplierService,
  FormComponent: FormDialog,
  searchFields: [],
  uri: '/supplier/detail',
};
