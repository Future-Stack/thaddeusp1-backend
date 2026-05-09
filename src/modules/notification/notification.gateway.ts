import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationGateway');

  afterInit(server: Server) {
    this.logger.log('Socket.io initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Method to send notification to all users
  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Method to send notification to a specific user (room)
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  // Method to send updated unread count to a specific user
  sendUnreadCount(userId: string, count: number) {
    this.server.to(userId).emit('unread-count', { count });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, userId: string) {
    client.join(userId);
    this.logger.log(`Client ${client.id} joined room ${userId}`);
  }
}
