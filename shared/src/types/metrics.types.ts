export interface CpuMetric {
  currentLoad: number;
}

export interface RamMetric {
  total: number;
  active: number;
}

export interface DiskMetric {
  size: number;
  used: number;
}

export interface NetworkMetric {
  rx_sec: number;
  tx_sec: number;
}

export interface MetricSnapshot {
  timestamp: string;
  cpu: CpuMetric;
  ram: RamMetric;
  disk: DiskMetric;
  network: NetworkMetric;
}

