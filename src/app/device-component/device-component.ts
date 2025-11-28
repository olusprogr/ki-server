import { Component } from '@angular/core';
import { WebsocketService } from '../websocket-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private websocketService: WebsocketService
  ) {
    this.websocketService.getMessages().subscribe((message: any) => {
      console.log('Nachricht empfangen:', message);
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
}
