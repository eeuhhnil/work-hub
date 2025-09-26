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
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name)

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
    console.log('🚀 Gateway sending notification:', {
      userId,
      type: payload.type,
      actorName: payload.actorName,
      data: payload.data,
      notificationId: payload._id,
    })

    // Check if server is available
    if (!this.server) {
      console.error('❌ WebSocket server not available')
      return
    }

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

    // Note: Pending notifications are already sent in handleConnection
    // No need to send them again here to avoid duplicates
    return { event: 'joined', userId }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`🔌 New socket connection attempt: ${client.id}`)

    try {
      // Try to get token from multiple sources
      let token: string | null = null

      // 1. From authorization header
      const authHeader = client.handshake.headers['authorization'] as string
      if (authHeader) {
        token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader
      }

      // 2. From query params
      if (!token && client.handshake.query.token) {
        token = client.handshake.query.token as string
      }

      // 3. From auth object
      if (!token && client.handshake.auth?.token) {
        token = client.handshake.auth.token as string
      }

      this.logger.log(`Token found: ${token ? 'Yes' : 'No'}`)

      if (!token) {
        this.logger.warn('❌ No token provided in any format')
        client.emit('unauthorized', { message: 'No token provided' })
        client.disconnect(true)
        return
      }

      this.logger.log(`Token extracted: ${token.substring(0, 20)}...`)

      // Verify JWT token
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      })

      this.logger.log(`Token decoded successfully for user: ${decoded.sub}`)

      // Store user data in socket
      client.data = {
        userId: decoded.sub,
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      }

      // Auto join user to their own room for notifications
      const userId = decoded.sub
      await client.join(userId.toString())
      this.logger.log(`✅ User ${userId} joined their notification room`)

      // Send pending notifications after a short delay to avoid race conditions
      if (this.notificationService) {
        setTimeout(async () => {
          try {
            console.log(
              '🔄 Sending pending notifications after connection established',
            )
            await this.notificationService.sendPendingNotifications(
              userId.toString(),
            )
          } catch (error) {
            this.logger.error('❌ Error sending pending notifications:', error)
          }
        }, 1000) // 1 second delay
      } else {
        this.logger.warn(
          '⚠️ NotificationService not available for sending pending notifications',
        )
      }

      // Emit successful connection
      client.emit('connected', {
        message: 'Connected successfully',
        userId: userId,
      })

      this.logger.log(
        `✅ Client connected successfully: ${client.id} (User: ${userId})`,
      )
    } catch (error) {
      this.logger.error(`❌ JWT verification failed: ${error.message}`)
      this.logger.error('Error details:', error)

      client.emit('unauthorized', {
        message: 'Invalid token',
        error: error.message,
      })
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId
    this.logger.log(
      `❌ Client disconnected: ${client.id} (User: ${userId || 'Unknown'})`,
    )
  }
}
