import { Resolver, Query, Subscription, Args, Int } from '@nestjs/graphql';
import { MetricsService } from './metrics.service';
import { MetricSnapshotModel } from './dto/metric-snapshot.model';

@Resolver(() => MetricSnapshotModel)
export class MetricsResolver {
  constructor(private readonly metricsService: MetricsService) {}

  @Query(() => [MetricSnapshotModel], { name: 'getMetricsHistory' })
  async getMetricsHistory(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<any[]> {
    return this.metricsService.getHistory(limit);
  }

  @Subscription(() => MetricSnapshotModel, {
    name: 'metricSnapshot',
  })
  metricSnapshot() {
    return (this.metricsService.getPubSub() as any).asyncIterator(this.metricsService.getMetricTopic());
  }

}
