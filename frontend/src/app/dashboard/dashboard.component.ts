import { Component, OnInit, OnDestroy } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Subscription } from 'rxjs';
import { gql } from 'apollo-angular';
import { MetricSnapshot } from '@app/shared';

const METRIC_SUBSCRIPTION = gql`
  subscription OnMetricSnapshot {
    metricSnapshot {
      timestamp
      cpu {
        currentLoad
      }
      ram {
        total
        active
      }
      disk {
        size
        used
      }
      network {
        rx_sec
        tx_sec
      }
    }
  }
`;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  public latestSnapshot?: MetricSnapshot;
  public connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  private subscription?: Subscription;

  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    this.subscription = this.apollo
      .subscribe<any>({
        query: METRIC_SUBSCRIPTION,
      })
      .subscribe({
        next: (result) => {
          this.connectionStatus = 'connected';
          if (result.data?.metricSnapshot) {
            this.latestSnapshot = result.data.metricSnapshot;
          }
        },
        error: (err) => {
          console.error('Subscription error:', err);
          this.connectionStatus = 'disconnected';
        },
        complete: () => {
          this.connectionStatus = 'disconnected';
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // Formatting utilities
  public formatPercent(val?: number): string {
    return val !== undefined ? `${val.toFixed(1)}%` : '0.0%';
  }

  public formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  public formatSpeed(bytesPerSec?: number): string {
    if (bytesPerSec === undefined) return '0 B/s';
    return `${this.formatBytes(bytesPerSec)}/s`;
  }
}
