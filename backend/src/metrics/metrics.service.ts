import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PubSub } from 'graphql-subscriptions';
import * as si from 'systeminformation';
import { MetricSnapshot } from './metrics.schema';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly pubSub = new PubSub();
  private readonly METRIC_TOPIC = 'metricSnapshot';
  private intervalId?: NodeJS.Timeout;

  constructor(
    @InjectModel(MetricSnapshot.name)
    private readonly metricModel: Model<MetricSnapshot>,
  ) {}

  getPubSub(): PubSub {
    return this.pubSub;
  }

  getMetricTopic(): string {
    return this.METRIC_TOPIC;
  }

  async onModuleInit() {
    this.intervalId = setInterval(async () => {
      try {
        const snapshotData = await this.collectSnapshot();
        const saved = await this.metricModel.create(snapshotData);

        const gqlSnapshot = {
          timestamp: saved.timestamp.toISOString(),
          cpu: saved.cpu,
          ram: saved.ram,
          disk: saved.disk,
          network: saved.network,
        };

        // TODO: Replace PubSub with Redis for multi-instance scaling
        await this.pubSub.publish(this.METRIC_TOPIC, {
          metricSnapshot: gqlSnapshot,
        });
      } catch (err) {
        console.error('Failed to collect or stream system metrics:', err);
      }
    }, 2000);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async getHistory(limit: number): Promise<any[]> {
    const docs = await this.metricModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    return docs.map((doc) => ({
      timestamp: doc.timestamp.toISOString(),
      cpu: doc.cpu,
      ram: doc.ram,
      disk: doc.disk,
      network: doc.network,
    }));
  }

  private async collectSnapshot() {
    const [load, mem, diskLayout, fsSize, netStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.diskLayout(),
      si.fsSize(),
      si.networkStats(),
    ]);

    // calculate disk size and used
    const totalDiskSize = diskLayout.length > 0
      ? diskLayout.reduce((acc, d) => acc + (d.size || 0), 0)
      : fsSize.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalDiskUsed = fsSize.reduce((acc, f) => acc + (f.used || 0), 0);

    // calculate network traffic
    let rx_sec = 0;
    let tx_sec = 0;
    if (netStats && Array.isArray(netStats)) {
      for (const iface of netStats) {
        rx_sec += Math.max(0, iface.rx_sec || 0);
        tx_sec += Math.max(0, iface.tx_sec || 0);
      }
    }

    return {
      timestamp: new Date(),
      cpu: {
        currentLoad: load.currentLoad,
      },
      ram: {
        total: mem.total,
        active: mem.active,
      },
      disk: {
        size: totalDiskSize,
        used: totalDiskUsed,
      },
      network: {
        rx_sec,
        tx_sec,
      },
    };
  }
}
