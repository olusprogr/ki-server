import { Component } from '@angular/core';
import { WebsocketService } from '../../websocket-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api-service';

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

  private readonly MAX_LOG_SIZE = 200;

  constructor(
    private websocketService: WebsocketService,
    private apiService: ApiService,
  ) {
    this.websocketService.getMessages().subscribe((message: any) => {
      if (!message) {
        this.isConnected = false;
        return;
      }
      this.isConnected = true;
      this.pushMessage({ type: 'received', content: message.message, timestamp: new Date() });
    });
  }

  trackMessage(_index: number, msg: Message): string {
    return msg.timestamp.getTime() + msg.content;
  }

  private pushMessage(msg: Message): void {
    this.messageLog.push(msg);
    if (this.messageLog.length > this.MAX_LOG_SIZE) {
      this.messageLog.splice(0, this.messageLog.length - this.MAX_LOG_SIZE);
    }
  }

  sendMessage(): void {
    if (this.messageInput.trim() === '') {
      return;
    }

    this.websocketService.sendMessage({message: this.messageInput});

    this.pushMessage({ type: 'sent', content: this.messageInput, timestamp: new Date() });

    this.messageInput = '';
  }


  public sendOperation(operation: string): void {
    if (!this.validOperations.includes(operation)) return;

    this.apiService.sendSSHCommandToDevice(operation).subscribe({
      error: () => {}
    });
  }
}
