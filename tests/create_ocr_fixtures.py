"""Create synthetic, non-patient OCR fixtures; optional Pillow/reportlab/pypdf deps."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/tmp/medical-ocr-test")
    parser.add_argument("--font")
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    candidates = [args.font, "/System/Library/Fonts/STHeiti Light.ttc",
                  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]
    font_path = next((Path(path) for path in candidates if path and Path(path).exists()), None)
    if not font_path:
        raise SystemExit("Provide a Chinese-capable font using --font.")
    font = ImageFont.truetype(str(font_path), 44)
    header = ["市第一人民医院", "生化检验报告", "姓名：测试患者  年龄：40", "报告日期：2026-11-02"]

    def page(lines):
        image = Image.new("RGB", (1500, 1900), "white")
        draw = ImageDraw.Draw(image)
        for index, line in enumerate(header + [""] + lines):
            draw.text((90, 100 + 100 * index), line, fill="black", font=font)
        return image

    first = page(["空腹血糖   7.4 mmol/L   3.9-6.1", "LDL   3.7 mmol/L   0-3.4", "CREA   115 umol/L   57-111"])
    second = page(["UA   480 umol/L   208-428", "TC   5.8 mmol/L   0-5.2", "WBC   6.2 10^9/L   3.5-9.5"])
    first.save(output / "report-image.png")
    blank = Image.new("RGB", (1500, 1900), "white")
    blank.save(output / "blank-image.png")
    for filename, images in [("scanned-report.pdf", [first, second]), ("blank-scan.pdf", [blank])]:
        pdf = canvas.Canvas(str(output / filename), pagesize=(600, 760))
        for image in images:
            pdf.drawImage(ImageReader(image), 0, 0, width=600, height=760)
            pdf.showPage()
        pdf.save()
        assert all(not (page.extract_text() or "").strip() for page in PdfReader(output / filename).pages)
    pdf = canvas.Canvas(str(output / "mixed-report.pdf"), pagesize=(600, 760))
    pdf.setFont("Helvetica", 16)
    pdf.drawString(50, 700, "Test Report 2026-11-02")
    pdf.drawString(50, 650, "GLU 5.0 mmol/L 3.9-6.1")
    pdf.showPage()
    pdf.drawImage(ImageReader(second), 0, 0, width=600, height=760)
    pdf.save()
    pdf = canvas.Canvas(str(output / "over-limit.pdf"))
    for _ in range(11):
        pdf.showPage()
    pdf.save()
    print(f"Created image, image-only, mixed, blank and over-limit fixtures in {output}")


if __name__ == "__main__":
    main()
