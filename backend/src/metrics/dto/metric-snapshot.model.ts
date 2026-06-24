import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class CpuMetricModel {
  @Field(() => Float)
  currentLoad: number;
}

@ObjectType()
export class RamMetricModel {
  @Field(() => Float)
  total: number;

  @Field(() => Float)
  active: number;
}

@ObjectType()
export class DiskMetricModel {
  @Field(() => Float)
  size: number;

  @Field(() => Float)
  used: number;
}

@ObjectType()
export class NetworkMetricModel {
  @Field(() => Float)
  rx_sec: number;

  @Field(() => Float)
  tx_sec: number;
}

@ObjectType('MetricSnapshot')
export class MetricSnapshotModel {
  @Field(() => String)
  timestamp: string;

  @Field(() => CpuMetricModel)
  cpu: CpuMetricModel;

  @Field(() => RamMetricModel)
  ram: RamMetricModel;

  @Field(() => DiskMetricModel)
  disk: DiskMetricModel;

  @Field(() => NetworkMetricModel)
  network: NetworkMetricModel;
}
