import POService from '../../../services/po.service';
import { columns } from '../../purchase-order/components/columns';
import FormDialog from '../../purchase-order/components/FormDialog';

export const poConfig = {
  columns: columns,
  service: POService,
  FormComponent: FormDialog,
  searchFields: ['code'],
  canDelete: false,
  canEdit: (row) => row?.status === 'draft',
  uri: '/purchase-order/detail',
};
