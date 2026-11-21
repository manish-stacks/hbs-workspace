import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { validateEnv } from "./config/env";

async function bootstrap() {
  const log = new Logger("Bootstrap"), { errors, warnings } = validateEnv();
  warnings.forEach(w => log.warn(w));
  if (errors.length) { errors.forEach(e => log.error(e)); process.exit(1); }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.set("trust proxy", 1);                         // behind nginx/ALB: real client IP for rate limiting + audit logs
  app.useBodyParser("json", { limit: "1mb" });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: (process.env.WEB_URL ?? "").split(",").map(s => s.trim()), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();                         // drain DB / BullMQ on SIGTERM (docker stop, rolling deploys)
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true")
    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("HBS Workspace API").addBearerAuth().build()));
  await app.listen(+(process.env.PORT || 4000), "0.0.0.0");
  log.log(`API listening on ${process.env.PORT || 4000} (${process.env.NODE_ENV || "development"})`);
}
bootstrap();
