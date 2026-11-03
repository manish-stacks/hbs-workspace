import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useBodyParser("json", { limit: "1mb" });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("HBS Workspace API").addBearerAuth().build()));
  await app.listen(4000);
}
bootstrap();
