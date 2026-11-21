import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "../common/auth.types";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_ACCESS_SECRET! }); }
  validate(p: AuthUser) { return p; }
}
