import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import { join } from "path";
export interface SlipData { company: string; month: string; number: string; employee: { name: string; code: string; designation?: string; department?: string; branch?: string; joining?: string }; earnings: [string, number][]; deductions: [string, number][]; gross: number; totalDeductions: number; net: number; days: any }
const inr = (n: number) => "Rs. " + (n / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const logo = join(process.cwd(), "assets", "logo.png");
export function drawSlip(doc: PDFKit.PDFDocument, d: SlipData) {
  if (existsSync(logo)) doc.image(logo, 40, 30, { height: 44 });
  doc.fillColor("#171717").fontSize(15).font("Helvetica-Bold").text(d.company, 200, 38, { width: 355, align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#737373").text(`Payslip for ${d.month}  ·  ${d.number}`, 200, 58, { width: 355, align: "right" });
  doc.moveTo(40, 88).lineTo(555, 88).strokeColor("#F21B2B").lineWidth(2).stroke();
  doc.fillColor("#202020").fontSize(10).font("Helvetica");
  const rows: [string, string | undefined][] = [["Employee", d.employee.name], ["Employee ID", d.employee.code], ["Designation", d.employee.designation], ["Department", d.employee.department], ["Branch", d.employee.branch], ["Date of joining", d.employee.joining],
    ["Days in month", String(d.days.daysInMonth)], ["Payable days", String((d.days.daysInMonth - d.days.lossDays).toFixed(1))], ["Loss of pay days", String(d.days.lossDays)]];
  let y = 100; rows.forEach(([k, v], i) => { const x = i % 2 ? 300 : 40; if (i % 2 === 0 && i) y += 16; doc.font("Helvetica-Bold").text(k + ":", x, y, { continued: true }).font("Helvetica").text("  " + (v ?? "—")); });
  y += 36; const col = (x: number, title: string, items: [string, number][], total: number, tl: string) => {
    doc.rect(x, y, 250, 20).fill("#171717"); doc.fillColor("#fff").font("Helvetica-Bold").text(title, x + 8, y + 5); let yy = y + 26; doc.fillColor("#202020").font("Helvetica");
    for (const [k, v] of items) { doc.text(k, x + 8, yy); doc.text(inr(v), x + 100, yy, { width: 142, align: "right" }); yy += 16; }
    doc.moveTo(x, yy + 2).lineTo(x + 250, yy + 2).strokeColor("#E5E7EB").lineWidth(1).stroke(); doc.font("Helvetica-Bold").text(tl, x + 8, yy + 8); doc.text(inr(total), x + 100, yy + 8, { width: 142, align: "right" }); return yy + 28; };
  const y1 = col(40, "Earnings", d.earnings.filter(e => e[1] > 0), d.gross, "Gross earnings"), y2 = col(305, "Deductions", d.deductions.filter(e => e[1] > 0), d.totalDeductions, "Total deductions"); y = Math.max(y1, y2) + 10;
  doc.rect(40, y, 515, 34).fill("#F5F5F5"); doc.fillColor("#171717").fontSize(13).font("Helvetica-Bold").text("Net pay", 52, y + 10).text(inr(d.net), 300, y + 10, { width: 245, align: "right" });
  doc.fontSize(8).font("Helvetica").fillColor("#737373").text("This is a system-generated payslip and does not require a signature.", 40, y + 54, { width: 515, align: "center" });
}
export const slipsToBuffer = (slips: SlipData[]) => new Promise<Buffer>((ok, bad) => { const doc = new PDFDocument({ size: "A4", margin: 40 }), bufs: Buffer[] = [];
  doc.on("data", b => bufs.push(b)); doc.on("end", () => ok(Buffer.concat(bufs))); doc.on("error", bad); slips.forEach((s, i) => { if (i) doc.addPage(); drawSlip(doc, s); }); doc.end(); });
