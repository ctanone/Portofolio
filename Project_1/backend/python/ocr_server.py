"""
OCR Server for Document Verification
Extracts "Nomor Surat" from PDF/images and compares with QR code data
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import io
import re
import fitz  # PyMuPDF for PDF handling
from pyzbar.pyzbar import decode as decode_qr
import base64
import os

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

# Configure Tesseract path (Windows)
# Uncomment and modify if Tesseract is not in PATH
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


def extract_nomor_surat(text):
    """
    Extract Nomor Surat from OCR text using regex patterns
    Handles various formats:
    - Nomor Surat: 001/UKP/ADMIN/2026
    - No. Surat: 001/UKP/ADMIN/2026
    - Nomor: 001/UKP/ADMIN/2026
    """
    patterns = [
        r'Nomor\s*Surat\s*[:\s]+([A-Za-z0-9\-\/\.]+)',
        r'No\.?\s*Surat\s*[:\s]+([A-Za-z0-9\-\/\.]+)',
        r'Nomor\s*[:\s]+([A-Za-z0-9\-\/\.]+)',
        r'No\.?\s*[:\s]+(\d+[A-Za-z0-9\-\/\.]*)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None


def extract_qr_data(image):
    """
    Extract data from QR code in the image
    """
    try:
        decoded_objects = decode_qr(image)
        if decoded_objects:
            # Return the first QR code data found
            return decoded_objects[0].data.decode('utf-8')
    except Exception as e:
        print(f"QR decode error: {e}")
    
    return None


def pdf_to_images(pdf_bytes):
    """
    Convert PDF to list of PIL Images
    """
    images = []
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            # Higher resolution for better OCR
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        pdf_document.close()
    except Exception as e:
        print(f"PDF conversion error: {e}")
    
    return images


def process_image(image):
    """
    Process a single image: OCR + QR code extraction
    """
    # OCR to extract text (Indonesian language)
    try:
        text = pytesseract.image_to_string(image, lang='ind+eng')
    except:
        # Fallback to English only if Indonesian not installed
        text = pytesseract.image_to_string(image, lang='eng')
    
    nomor_surat = extract_nomor_surat(text)
    qr_data = extract_qr_data(image)
    
    return {
        'full_text': text,
        'nomor_surat': nomor_surat,
        'qr_data': qr_data
    }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'OCR Server'})


@app.route('/ocr', methods=['POST'])
def ocr_document():
    """
    Main OCR endpoint
    Accepts: PDF or image file
    Returns: Extracted nomor surat, QR data, and validation result
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        file_bytes = file.read()
        filename = file.filename.lower()
        
        results = []
        
        if filename.endswith('.pdf'):
            # Process PDF
            images = pdf_to_images(file_bytes)
            for i, img in enumerate(images):
                result = process_image(img)
                result['page'] = i + 1
                results.append(result)
        else:
            # Process image (PNG, JPG, etc.)
            image = Image.open(io.BytesIO(file_bytes))
            result = process_image(image)
            result['page'] = 1
            results.append(result)
        
        # Find the first page with nomor_surat (usually page 1)
        nomor_surat = None
        qr_data = None
        
        for result in results:
            if result['nomor_surat'] and not nomor_surat:
                nomor_surat = result['nomor_surat']
            if result['qr_data'] and not qr_data:
                qr_data = result['qr_data']
        
        # Validation logic
        is_valid = False
        validation_message = ""
        alert_type = None
        
        if nomor_surat and qr_data:
            # Compare OCR text with QR data
            if nomor_surat in qr_data or qr_data in nomor_surat:
                is_valid = True
                validation_message = "✅ Document is valid. Nomor Surat matches QR code."
            else:
                is_valid = False
                validation_message = "🚨 ALERT: Nomor Surat does NOT match QR code! Possible tampering detected."
                alert_type = "qr_manipulation"
        elif nomor_surat and not qr_data:
            validation_message = "⚠️ Warning: QR code not found or unreadable."
            alert_type = "qr_missing"
        elif qr_data and not nomor_surat:
            validation_message = "⚠️ Warning: Nomor Surat not found in document text."
            alert_type = "nomor_missing"
        else:
            validation_message = "❌ Error: Could not extract Nomor Surat or QR code."
            alert_type = "extraction_failed"
        
        return jsonify({
            'success': True,
            'nomor_surat': nomor_surat,
            'qr_data': qr_data,
            'is_valid': is_valid,
            'validation_message': validation_message,
            'alert_type': alert_type,
            'pages_processed': len(results),
            'details': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/verify', methods=['POST'])
def verify_document():
    """
    Verify document against database
    Accepts: nomor_surat from OCR
    Returns: Validation against stored records
    """
    data = request.get_json()
    nomor_surat = data.get('nomor_surat')
    qr_data = data.get('qr_data')
    
    if not nomor_surat and not qr_data:
        return jsonify({'error': 'No data to verify'}), 400
    
    # TODO: Connect to your MongoDB database
    # For now, return mock validation
    
    return jsonify({
        'verified': True,
        'message': 'Document verification would check against database here',
        'nomor_surat': nomor_surat,
        'qr_data': qr_data
    })


@app.route('/create-alert', methods=['POST'])
def create_alert():
    """
    Create a security alert for tampering detection
    """
    data = request.get_json()
    
    alert = {
        'type': data.get('alert_type'),
        'nomor_surat_ocr': data.get('nomor_surat'),
        'qr_data': data.get('qr_data'),
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'severity': 'critical' if data.get('alert_type') == 'qr_manipulation' else 'warning'
    }
    
    # TODO: Save to database
    print(f"🚨 SECURITY ALERT: {alert}")
    
    return jsonify({
        'success': True,
        'alert_id': 'ALERT-001',  # Would be generated from database
        'alert': alert
    })


if __name__ == '__main__':
    print("=" * 50)
    print("🔍 OCR Document Verification Server")
    print("=" * 50)
    print("Endpoints:")
    print("  POST /ocr          - Upload PDF/image for OCR")
    print("  POST /verify       - Verify document against database")
    print("  POST /create-alert - Create security alert")
    print("  GET  /health       - Health check")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5001, debug=True)
