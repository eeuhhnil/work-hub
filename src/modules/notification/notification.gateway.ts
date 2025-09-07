import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

@WebSocketGateway({ cors: true })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}
  @WebSocketServer() server: Server

  //Inject NotificationService để gọi sendPendingNotifications
  private notificationService: any

  setNotificationService(notificationService: any) {
    this.notificationService = notificationService
  }

  sendNotification(userId: string, payload: any) {
    return this.server.to(userId).emit('notification', payload)
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const userId = client.data?.sub || data.userId
    client.join(userId.toString())
    console.log(`User ${userId} joined room`)

    // Gửi các thông báo chưa đọc khi user join room
    if (this.notificationService) {
      await this.notificationService.sendPendingNotifications(userId.toString())
    }
    return { event: 'joined', userId }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const authHeader = client.handshake.headers['authorization']

    if (authHeader) {
      try {
        const token = authHeader
        const decoded = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        })
        client.data = decoded

        // Auto join user to their own room
        const userId = decoded.userId || decoded.sub
        if (userId) {
          client.join(userId.toString())
          console.log(`User ${userId} auto-joined their room`)

          // Gửi các thông báo chưa đọc khi user kết nối
          if (this.notificationService) {
            await this.notificationService.sendPendingNotifications(
              userId.toString(),
            )
          }
        }

        console.log('Client connected:', client.id, 'User:', userId)
      } catch (error) {
        console.log('JWT verification failed:', error.message)

        client.emit('error', {
          message: 'Unauthorized - Invalid token',
        })
        client.disconnect()
        return
      }
    } else {
      client.emit('error', {
        message: 'Unauthorized - No token provided',
      })
      client.disconnect()
      return
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId || client.data?.sub
    console.log('Client disconnected:', client.id, 'User:', userId)
  }
}
