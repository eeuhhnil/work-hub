import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { ConfigService } from '@nestjs/config'
import sharp from 'sharp'

@Injectable()
export class StorageService implements OnModuleInit {
  private logger = new Logger(StorageService.name)
  private s3Client: S3Client
  private s3Bucket: string

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): any {
    this.s3Client = new S3Client({
      region: this.config.get<string>('S3_REGION') || '',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY') || '',
      },
    })

    this.s3Bucket = this.config.get<string>('S3_BUCKET_NAME') || ''
  }

  async proccessAvatarFile(file: Express.Multer.File) {
    let processImage: Buffer
    let outputMineType: string
    let extension: string

    if (file.mimetype === 'image/png') {
      processImage = await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .png({ compressionLevel: 8 })
        .toBuffer()

      outputMineType = 'image/png'
      extension = '.png'
    } else {
      processImage = await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()

      outputMineType = 'image/jpeg'
      extension = '.jpg'
    }

    const originalName = file.originalname || `file${extension}`

    return {
      ...file,
      buffer: processImage,
      mimeType: outputMineType,
      originalName: originalName.replace(/\.[^/.]+$/, extension),
    }
  }

  async processDocumentFile(file: Express.Multer.File) {
    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`)
    }

    // For documents, we don't process the content, just validate and return
    return {
      ...file,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }
  }

  isDocumentFile(mimetype: string): boolean {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]
    return documentMimeTypes.includes(mimetype)
  }

  async uploadFile(fileKey: string, file: Express.Multer.File) {
    const uploadParam: PutObjectCommandInput = {
      Bucket: this.s3Bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: (file as any).mimeType || file.mimetype,
    }

    const command = new PutObjectCommand(uploadParam)
    await this.s3Client.send(command)

    return `https://${this.s3Bucket}.s3.${this.config.get<string>('S3_REGION')}.amazonaws.com/${fileKey}`
  }

  async deleteFile(fileKey: string) {
    const deleteParam = {
      Bucket: this.s3Bucket,
      Key: fileKey,
    }

    const command = new DeleteObjectCommand(deleteParam)

    try {
      await this.s3Client.send(command)
      this.logger.log(`File with key '${fileKey}' deleted successfully.`)
    } catch (error) {
      this.logger.error(`Error deleting file with key '${fileKey}':`, error)
      throw error
    }
  }

  extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.substring(1)
    } catch (error) {
      console.error(`Invalid URL format: ${url}`, error)
      throw new Error(`Invalid URL format: ${url}`)
    }
  }
}
