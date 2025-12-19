import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRING_SOON = 'EXPIRING_SOON',
  PO_LATE_DELIVERY = 'PO_LATE_DELIVERY',
  SO_PENDING_TOO_LONG = 'SO_PENDING_TOO_LONG',
}

export enum AlertSeverity {
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum RelatedEntityType {
  PRODUCT = 'Product',
  INVENTORY = 'Inventory',
  PURCHASE_ORDER = 'PurchaseOrder',
  SALES_ORDER = 'SalesOrder',
}

@Schema({ _id: false, versionKey: false })
class RelatedEntity {
  @Prop({ type: String, enum: Object.values(RelatedEntityType), required: true })
  type: RelatedEntityType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, refPath: 'type' })
  id: MongooseSchema.Types.ObjectId;
}

const RelatedEntitySchema = SchemaFactory.createForClass(RelatedEntity);

@Schema({
  collection: 'alerts',
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toHexString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Alert extends Document {
  @Prop({
    type: String,
    enum: Object.values(AlertType),
    required: true,
    index: true,
  })
  type: AlertType;

  @Prop({
    type: String,
    enum: Object.values(AlertSeverity),
    required: true,
    index: true,
  })
  severity: AlertSeverity;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: RelatedEntitySchema })
  relatedEntity?: RelatedEntity;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
