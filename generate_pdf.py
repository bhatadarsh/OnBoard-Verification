from fpdf import FPDF
pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=15)
pdf.cell(200, 10, txt="Hello World! This is a valid PDF.", ln=1, align="C")
pdf.output("valid_test.pdf")
print("valid_test.pdf created")
