import FormDialog from '../components/customer.form-dialog/FormDialog';
import { columns } from '../components/customer.columns/columns';
import CustomerService from '../../../services/customer.service';

export const customerConfig = {
  columns,
  service: CustomerService,
  FormComponent: FormDialog,
  searchFields: [],
  uri: '/customer/detail',
};
