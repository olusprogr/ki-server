import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-dashboard-component',
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.css',
})
export class DashboardComponent {
  operations = [
    { name: 'Operation 1', link: '/op1' },
    { name: 'Operation 2', link: '/op2' },
    { name: 'Operation 3', link: '/op3' },
    { name: 'Operation 4', link: '/op4' },
  ];
}
