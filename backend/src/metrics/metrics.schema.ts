import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class MetricSnapshot extends Document {
  @Prop({ required: true, default: Date.now, index: { expireAfterSeconds: 604800 } })
  timestamp: Date;

  @Prop({
    type: {
      currentLoad: { type: Number, required: true },
    },
    required: true,
  })
  cpu: {
    currentLoad: number;
  };

  @Prop({
    type: {
      total: { type: Number, required: true },
      active: { type: Number, required: true },
    },
    required: true,
  })
  ram: {
    total: number;
    active: number;
  };

  @Prop({
    type: {
      size: { type: Number, required: true },
      used: { type: Number, required: true },
    },
    required: true,
  })
  disk: {
    size: number;
    used: number;
  };

  @Prop({
    type: {
      rx_sec: { type: Number, required: true },
      tx_sec: { type: Number, required: true },
    },
    required: true,
  })
  network: {
    rx_sec: number;
    tx_sec: number;
  };
}

export const MetricSnapshotSchema = SchemaFactory.createForClass(MetricSnapshot);
