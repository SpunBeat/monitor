import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsService } from './metrics.service';
import { MetricsResolver } from './metrics.resolver';
import { MetricSnapshot, MetricSnapshotSchema } from './metrics.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MetricSnapshot.name, schema: MetricSnapshotSchema },
    ]),
  ],
  providers: [MetricsService, MetricsResolver],
  exports: [MetricsService],
})
export class MetricsModule {}
