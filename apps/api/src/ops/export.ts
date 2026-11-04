import PDFDocument from "pdfkit";
import { csvCell } from "../hr/scope";
export interface Table { title: string; columns: string[]; rows: (string | number | null)[][] }
export function csv(t: Table) { return [t.columns, ...t.rows].map(r => r.map(csvCell).join(",")).join("\n"); }
export function pdf(t: Table) { return new Promise<Buffer>((ok, bad) => { const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 }), bufs: Buffer[] = []; doc.on("data", b => bufs.push(b)); doc.on("end", () => ok(Buffer.concat(bufs))); doc.on("error", bad);
    const W = 782, cw = W / t.columns.length, head = () => { doc.font("Helvetica-Bold").fontSize(14).fillColor("#171717").text(t.title, 30, 30); doc.fontSize(7).fillColor("#737373").font("Helvetica").text(`HBS Workspace · ${new Date().toLocaleString()}`, 30, 48);
      doc.rect(30, 62, W, 16).fill("#171717"); doc.fillColor("#fff").font("Helvetica-Bold").fontSize(7); t.columns.forEach((c, i) => doc.text(c, 33 + i * cw, 67, { width: cw - 4, lineBreak: false })); return 82; };
    let y = head(); doc.font("Helvetica").fontSize(7).fillColor("#202020");
    for (const r of t.rows) { if (y > 555) { doc.addPage(); y = head(); doc.font("Helvetica").fontSize(7).fillColor("#202020"); } r.forEach((c, i) => doc.text(String(c ?? ""), 33 + i * cw, y, { width: cw - 4, lineBreak: false, ellipsis: true })); y += 13; if (t.rows.indexOf(r) % 2) doc.moveTo(30, y - 2).lineTo(30 + W, y - 2).strokeColor("#E5E7EB").stroke(); }
    if (!t.rows.length) doc.text("No data for the selected filters.", 33, y); doc.end(); }); }
