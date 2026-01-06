import SOService from '../../../services/so.service';
import { columns } from '../components/so.columns/columns';
import FormDialog from '../components/so.form-dialog/FormDialog';

export const soConfig = {
  columns: columns,
  service: SOService,
  FormComponent: FormDialog,
  searchFields: ['code'],
  canDelete: false,
  uri: '/sales-order/detail',
};
