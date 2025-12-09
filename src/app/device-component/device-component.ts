import { Component } from '@angular/core';
import { WebsocketService } from '../websocket-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api-service';
import { response } from 'express';
import { Router } from '@angular/router';

interface Message {
  type: 'sent' | 'received' | 'system';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-device-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './device-component.html',
  styleUrls: ['./device-component.css'],
})
export class DeviceComponent {
  messageLog: Message[] = [];
  isConnected: boolean = false;
  messageInput: string = '';
  validOperations: string[] = ['start', 'stop', 'restart', 'status'];
  token: string | null = null;

  constructor(
    private websocketService: WebsocketService,
    private apiService: ApiService,
    private router: Router
  ) {
    this.token = localStorage.getItem('authToken') || null;

    if (!this.token) {
      this.router.navigate(['/login']);
    }

    this.websocketService.getMessages().subscribe((message: any) => {
      console.log('Nachricht empfangen:', message);
      if (!message) {
        this.isConnected = false;
        return;
      }
      this.isConnected = true;
      this.messageLog.push({
        type: 'received',
        content: message.message,
        timestamp: new Date()
      });
    });
  }

  sendMessage(): void {
    if (this.messageInput.trim() === '') {
      return;
    }
    
    this.websocketService.sendMessage({message: this.messageInput});

    this.messageLog.push({
      type: 'sent',
      content: this.messageInput,
      timestamp: new Date()
    });

    this.messageInput = '';

  }

  public sendOperation(operation: string): void {
    if (!this.validOperations.includes(operation)) {
      console.error(`Ungültige Operation: ${operation}`);
      return;
    }

    this.apiService.sendSSHCommandToDevice(operation, this.token!).subscribe({
      next: (response) => {
        console.log(`Operation "${operation}" erfolgreich gesendet.`, JSON.stringify(response));
      error: (err: any) => {
        console.error(`Fehler beim Senden der Operation "${operation}":`, err);
      }}
    })
  }
}
