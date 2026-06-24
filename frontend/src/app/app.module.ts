import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GraphQLModule } from './graphql.module';
import { AppRoutingModule } from './app-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    HttpClientModule,
    GraphQLModule,
    MatCardModule,
    MatProgressBarModule,
    AppRoutingModule
  ],
  exports: [
    DashboardComponent,
    HttpClientModule,
    GraphQLModule,
    MatCardModule,
    MatProgressBarModule,
    AppRoutingModule
  ]
})
export class AppModule {}
