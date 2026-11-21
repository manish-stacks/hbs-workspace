import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, StreamableFile } from "@nestjs/common";
import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { AuthUser, CurrentUser, RequirePerms } from "../common/auth.types";
import { OpsService } from "./ops.service";
import { CATALOG, ReportsService } from "./reports.service";

const S = (min = 1, max = 2000) => [IsString(), MinLength(min), MaxLength(max)];
class AnnDto { @IsString() @MinLength(3) @MaxLength(150) title: string; @IsString() @MinLength(3) @MaxLength(3000) body: string; @IsOptional() @IsBoolean() pinned?: boolean; @IsOptional() @IsDateString() expiresAt?: string }
class ExpDto { @IsString() @MinLength(2) category: string; @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(10000000) amount: number; @IsDateString() expenseDate: string; @IsString() @MinLength(3) @MaxLength(500) description: string; @IsOptional() @IsString() @MaxLength(1000000) receipt?: string }
class NoteDto { @IsOptional() @IsString() @MaxLength(500) note?: string }
class PayDto { @IsOptional() @IsBoolean() viaPayroll?: boolean }
class AssetDto { @IsString() @MinLength(1) tag: string; @IsString() @MinLength(2) name: string; @IsString() @MinLength(2) category: string; @IsOptional() @IsString() serial?: string; @IsOptional() @IsDateString() purchaseDate?: string }
class AssetPatch extends PartialType(AssetDto) { @IsOptional() @IsIn(["AVAILABLE", "RETIRED"]) status?: string }
class AssignDto { @IsString() employeeId: string }
class JobDto { @IsString() @MinLength(3) title: string; @IsOptional() @IsString() departmentId?: string; @IsOptional() @IsString() branchId?: string; @IsOptional() @IsInt() @Min(1) openings?: number; @IsOptional() @IsString() description?: string }
class JobPatch { @IsOptional() @IsIn(["OPEN", "CLOSED"]) status?: string; @IsOptional() @IsInt() @Min(1) openings?: number; @IsOptional() @IsString() title?: string }
class CandDto { @IsString() jobId: string; @IsString() @MinLength(2) name: string; @IsOptional() @IsString() email?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() source?: string; @IsOptional() @IsString() notes?: string }
class CandPatch { @IsOptional() @IsIn(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]) stage?: string; @IsOptional() @IsString() notes?: string }
class IntDto { @IsDateString() scheduledAt: string; @IsOptional() @IsString() interviewerId?: string; @IsOptional() @IsString() mode?: string }
class IntPatch { @IsOptional() @IsIn(["SCHEDULED", "DONE", "CANCELLED"]) status?: string; @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number; @IsOptional() @IsString() feedback?: string }
class CycleDto { @IsString() @MinLength(3) name: string; @IsDateString() fromDate: string; @IsDateString() toDate: string }
class GoalDto { @IsString() employeeId: string; @IsString() cycleId: string; @IsString() @MinLength(3) title: string; @IsOptional() @IsString() kpi?: string; @IsOptional() @IsString() target?: string; @IsOptional() @IsInt() @Min(1) @Max(100) weight?: number }
class ProgDto { @IsInt() @Min(0) @Max(100) progress: number }
class SelfDto { @IsString() cycleId: string; @IsInt() @Min(1) @Max(5) rating: number; @IsOptional() @IsString() @MaxLength(2000) comments?: string }
class MgrDto extends SelfDto { @IsString() employeeId: string }
class TicketDto { @IsString() @MinLength(3) @MaxLength(150) subject: string; @IsString() @MinLength(3) @MaxLength(3000) description: string; @IsOptional() @IsString() category?: string; @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH"]) priority?: string }
class CommentDto { @IsString() @MinLength(1) @MaxLength(2000) body: string }
class TicketPatch { @IsOptional() @IsIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) status?: string; @IsOptional() @IsString() assigneeId?: string; @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH"]) priority?: string; @IsOptional() @IsString() resolution?: string }

@Controller("ops")
export class OpsController {
  constructor(private s: OpsService) {}
  // announcements
  @Get("announcements") ann(@CurrentUser() u: AuthUser) { return this.s.announcements(u); }
  @RequirePerms("announcement:create") @Post("announcements") addAnn(@CurrentUser() u: AuthUser, @Body() d: AnnDto) { return this.s.addAnnouncement(u, d); }
  @RequirePerms("announcement:delete") @Delete("announcements/:id") delAnn(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delAnnouncement(u, id); }
  // expenses
  @Post("expenses") addExp(@CurrentUser() u: AuthUser, @Body() d: ExpDto) { return this.s.addExpense(u, d); }
  @Get("expenses/mine") myExp(@CurrentUser() u: AuthUser) { return this.s.myExpenses(u); }
  @Get("expenses/:id/receipt") async receipt(@CurrentUser() u: AuthUser, @Param("id") id: string) { const r = await this.s.receipt(u, id); return new StreamableFile(r.buf, { type: r.type, disposition: "inline" }); }
  @RequirePerms("expense:view") @Get("expenses") exps(@CurrentUser() u: AuthUser, @Query("status") st?: string) { return this.s.expenses(u, st); }
  @RequirePerms("expense:approve") @Post("expenses/:id/approve") appExp(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: NoteDto) { return this.s.decideExpense(u, id, true, d.note); }
  @RequirePerms("expense:reject") @Post("expenses/:id/reject") rejExp(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: NoteDto) { return this.s.decideExpense(u, id, false, d.note); }
  @RequirePerms("expense:manage") @Post("expenses/:id/paid") paid(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: PayDto) { return this.s.payExpense(u, id, !!d.viaPayroll); }
  // assets
  @Get("assets/mine") myAssets(@CurrentUser() u: AuthUser) { return this.s.myAssets(u); }
  @RequirePerms("asset:view") @Get("assets") assets(@CurrentUser() u: AuthUser) { return this.s.assets(u); }
  @RequirePerms("asset:create") @Post("assets") addAsset(@CurrentUser() u: AuthUser, @Body() d: AssetDto) { return this.s.addAsset(u, d); }
  @RequirePerms("asset:edit") @Patch("assets/:id") editAsset(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: AssetPatch) { return this.s.editAsset(u, id, d); }
  @RequirePerms("asset:manage") @Post("assets/:id/assign") assign(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: AssignDto) { return this.s.assignAsset(u, id, d.employeeId); }
  @RequirePerms("asset:manage") @Post("assets/:id/return") ret(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: NoteDto) { return this.s.returnAsset(u, id, d.note); }
  // recruitment
  @RequirePerms("recruitment:view") @Get("jobs") jobs(@CurrentUser() u: AuthUser) { return this.s.jobs(u); }
  @RequirePerms("recruitment:create") @Post("jobs") addJob(@CurrentUser() u: AuthUser, @Body() d: JobDto) { return this.s.addJob(u, d); }
  @RequirePerms("recruitment:edit") @Patch("jobs/:id") editJob(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: JobPatch) { return this.s.editJob(u, id, d); }
  @RequirePerms("recruitment:view") @Get("candidates") cands(@CurrentUser() u: AuthUser, @Query("jobId") j?: string) { return this.s.candidates(u, j); }
  @RequirePerms("recruitment:create") @Post("candidates") addCand(@CurrentUser() u: AuthUser, @Body() d: CandDto) { return this.s.addCandidate(u, d); }
  @RequirePerms("recruitment:edit") @Patch("candidates/:id") editCand(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: CandPatch) { return this.s.editCandidate(u, id, d); }
  @RequirePerms("recruitment:delete") @Delete("candidates/:id") delCand(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.delCandidate(u, id); }
  @RequirePerms("recruitment:edit") @Post("candidates/:id/interviews") addInt(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: IntDto) { return this.s.addInterview(u, id, d); }
  @RequirePerms("recruitment:edit") @Patch("interviews/:id") editInt(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: IntPatch) { return this.s.editInterview(u, id, d); }
  // performance
  @Get("cycles") cycles(@CurrentUser() u: AuthUser) { return this.s.cycles(u); }
  @RequirePerms("performance:create") @Post("cycles") addCycle(@CurrentUser() u: AuthUser, @Body() d: CycleDto) { return this.s.addCycle(u, d); }
  @RequirePerms("performance:manage") @Post("cycles/:id/close") close(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.closeCycle(u, id); }
  @Get("goals/mine") myGoals(@CurrentUser() u: AuthUser, @Query("cycleId") c?: string) { return this.s.myGoals(u, c); }
  @RequirePerms("performance:view") @Get("goals") goals(@CurrentUser() u: AuthUser, @Query() q: any) { return this.s.goals(u, q); }
  @RequirePerms("performance:create") @Post("goals") addGoal(@CurrentUser() u: AuthUser, @Body() d: GoalDto) { return this.s.addGoal(u, d); }
  @Patch("goals/:id/progress") prog(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: ProgDto) { return this.s.progress(u, id, d.progress); }
  @Get("reviews/mine") myRev(@CurrentUser() u: AuthUser) { return this.s.myReviews(u); }
  @Post("reviews/self") self(@CurrentUser() u: AuthUser, @Body() d: SelfDto) { return this.s.selfReview(u, d); }
  @RequirePerms("performance:view") @Get("reviews") revs(@CurrentUser() u: AuthUser, @Query("cycleId") c?: string) { return this.s.reviews(u, c); }
  @RequirePerms("performance:manage") @Post("reviews/manager") mgr(@CurrentUser() u: AuthUser, @Body() d: MgrDto) { return this.s.mgrReview(u, d); }
  // helpdesk
  @Post("tickets") addTicket(@CurrentUser() u: AuthUser, @Body() d: TicketDto) { return this.s.addTicket(u, d); }
  @Get("tickets/mine") myTickets(@CurrentUser() u: AuthUser) { return this.s.myTickets(u); }
  @RequirePerms("helpdesk:view") @Get("tickets") tickets(@CurrentUser() u: AuthUser, @Query("status") st?: string) { return this.s.tickets(u, st); }
  @Get("tickets/:id") ticket(@CurrentUser() u: AuthUser, @Param("id") id: string) { return this.s.ticket(u, id); }
  @Post("tickets/:id/comments") comment(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: CommentDto) { return this.s.comment(u, id, d.body); }
  @RequirePerms("helpdesk:manage") @Patch("tickets/:id") upd(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() d: TicketPatch) { return this.s.updateTicket(u, id, d); }
}

@Controller("reports")
export class ReportsController {
  constructor(private s: ReportsService) {}
  @RequirePerms("report:view") @Get() catalog(@CurrentUser() u: AuthUser) { return this.s.catalog(u); }
  @RequirePerms("report:view") @Get(":key") async run(@CurrentUser() u: AuthUser, @Param("key") key: string, @Query() q: any) {
    const t = await this.s.build(u, key, q); const fmt = q.format;
    if (fmt === "csv" || fmt === "pdf") { if (!u.perms.includes("report:export")) throw new (require("@nestjs/common").ForbiddenException)("Missing permission");
      return fmt === "csv" ? new StreamableFile(Buffer.from(this.s.csv(t)), { type: "text/csv", disposition: `attachment; filename="${key}.csv"` }) : new StreamableFile(await this.s.pdf(t), { type: "application/pdf", disposition: `attachment; filename="${key}.pdf"` }); }
    return { ...t, rows: t.rows.slice(0, 500), total: t.rows.length };
  }
}
