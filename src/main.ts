import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import { ErrorInterceptor, TransformInterceptor } from './common/interceptors'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get<ConfigService>(ConfigService)

  // CORS
  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
    credentials: true,
  })

  //interceptor
  app.useGlobalInterceptors(new TransformInterceptor(), new ErrorInterceptor())

  // validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  //OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('portfolio apis')
    .setDescription('The portfolio management apis')
    .addServer(
      `http://localhost:${config.get('PORT')}`,
      `Development API[PORT=${config.get('PORT')}]`,
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      description: `Please enter token in following format: Bearer <JWT>`,
      name: 'Authorization',
      bearerFormat: 'Bearer',
      scheme: 'Bearer',
      type: 'http',
      in: 'Header',
    })
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  })
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      uiConfig: {
        docExpansion: 'none',
      },
    },
  })

  await app.listen(config.get<number>('PORT') ?? 3000)

  return app.getUrl()
}
void bootstrap().then((url) => {
  console.log(`Server is running on: ${url}`)
})
