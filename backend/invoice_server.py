"""
S.S.T.M Invoice Server  –  backend/invoice_server.py
Run via: start_invoice_server.bat
"""
import os, json, threading, tempfile, base64, shutil
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TEMPLATE = r'C:\Users\user\OneDrive\Desktop\Nouveau dossier\chariot-elevateur\s.s.t.m.032.xls'
OUT_DIR  = r'C:\Users\user\OneDrive\Desktop'

# ── French amount in words ────────────────────────────────────────────────────
_O = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix',
      'onze','douze','treize','quatorze','quinze','seize','dix sept','dix huit','dix neuf']
_T = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre vingt','quatre vingt']

def _c(n):
    if n < 20: return _O[n]
    t, u = divmod(n, 10)
    if t == 7: return 'soixante ' + _O[10+u]
    if t == 9: return 'quatre vingt ' + _O[10+u]
    return _T[t] + (' et ' if u==1 else ' ' if u else '') + (_O[u] if u else '')

def _m(n):
    h, r = divmod(n, 100)
    p = (['cent'] if h==1 else [_O[h]+' cent'+('s' if h>1 and not r else '')] if h else [])
    return ' '.join(p + ([_c(r)] if r else []))

def words(ttc):
    d, m = divmod(round(ttc * 1000), 1000)
    def s(n):
        if not n: return 'zéro'
        if n < 1000: return _m(n)
        q, r = divmod(n, 1000)
        return (('mille' if q == 1 else _m(q) + ' mille') + (' ' + _m(r) if r else '')).strip()
    w = s(d).capitalize() + ' dinar' + ('s' if d > 1 else '')
    return w + (' %d millimes' % m if m else '')

def next_file():
    n = 1
    while os.path.exists(os.path.join(OUT_DIR, 's.s.t.m.%02d.xls' % n)):
        n += 1
    return os.path.join(OUT_DIR, 's.s.t.m.%02d.xls' % n)

# ── Write values into a copy of the template via COM (preserves images) ───────
def _build_to_file(d, dest, file_format=56):
    import win32com.client as win32, pythoncom
    tmp_template = dest if dest.lower().endswith('.xls') else tempfile.NamedTemporaryFile(suffix='.xls', delete=False, dir=tempfile.gettempdir()).name
    shutil.copy2(TEMPLATE, tmp_template)
    pythoncom.CoInitialize()
    try:
        xl = win32.Dispatch('Excel.Application')
        xl.Visible = False
        xl.DisplayAlerts = False
        try:
            wb = xl.Workbooks.Open(tmp_template)
            ws = wb.Sheets(1)

            def w(addr, val):
                cell = ws.Range(addr)
                c = cell.MergeArea.Cells(1, 1) if cell.MergeCells else cell
                c.Value = val

            w('D11', d['num'])
            w('E11', d['date_serial'])
            w('C15', ' ' + d['company'])

            rows, n = d['rows'], len(d['rows'])
            if n > 1:
                ws.Rows('24:24').Copy()
                ws.Rows('25:%d' % (23 + n)).Insert(CopyOrigin=0)
                xl.CutCopyMode = False

            for i, u in enumerate(rows):
                r = 24 + i
                w('B%d' % r, u['designation'])
                w('C%d' % r, u['hours'])
                w('D%d' % r, u['price'])
                w('E%d' % r, u['tva'])
                w('F%d' % r, u['total'])

            base = 24 + n
            w('F%d' % base,     d['ht'])
            w('F%d' % (base+1), d['tva'])
            w('F%d' % (base+2), 1.0)
            w('F%d' % (base+3), d['ttc'])

            found = ws.Columns('A').Find('Arr')
            if found:
                arr = ws.Range('D%d' % found.Row)
                c = arr.MergeArea.Cells(1, 1) if arr.MergeCells else arr
                c.Value = words(d['ttc'])

            wb.SaveAs(dest, FileFormat=file_format)
            wb.Close(False)
        finally:
            xl.Quit()
    finally:
        pythoncom.CoUninitialize()
        if tmp_template != dest:
            try: os.remove(tmp_template)
            except: pass

_export_lock = threading.Lock()
_com_lock    = threading.Lock()

# ── /generate: permanent file on Desktop ─────────────────────────────────────
def export_invoice(d):
    with _export_lock:
        dest = next_file()
        _build_to_file(d, dest)
        return os.path.basename(dest)

def safe_name(d, ext):
    raw = d.get('display_num') or d.get('num') or 'facture'
    safe = ''.join(ch if ch.isalnum() or ch in '.-_' else '-' for ch in raw).strip('-')
    return 'facture-%s.%s' % (safe or 'sstm', ext)

def export_excel_data(d):
    with _com_lock:
        tmp = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False, dir=tempfile.gettempdir())
        tmp.close()
        _build_to_file(d, tmp.name, 51)
        with open(tmp.name, 'rb') as f:
            data = base64.b64encode(f.read()).decode()
        try: os.remove(tmp.name)
        except: pass
        return {'fileName': safe_name(d, 'xlsx'), 'mimeType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content': data}

def export_pdf_data(d):
    import win32com.client as win32, pythoncom
    with _com_lock:
        tmp_xls = tempfile.NamedTemporaryFile(suffix='.xls', delete=False, dir=tempfile.gettempdir())
        tmp_xls.close()
        tmp_pdf = tmp_xls.name.replace('.xls', '.pdf')
        _build_to_file(d, tmp_xls.name)
        pythoncom.CoInitialize()
        try:
            xl = win32.Dispatch('Excel.Application')
            xl.Visible = False
            xl.DisplayAlerts = False
            try:
                wb = xl.Workbooks.Open(tmp_xls.name)
                wb.ExportAsFixedFormat(0, tmp_pdf)
                wb.Close(False)
            finally:
                xl.Quit()
        finally:
            pythoncom.CoUninitialize()
        with open(tmp_pdf, 'rb') as f:
            data = base64.b64encode(f.read()).decode()
        try: os.remove(tmp_xls.name)
        except: pass
        try: os.remove(tmp_pdf)
        except: pass
        return {'fileName': safe_name(d, 'pdf'), 'mimeType': 'application/pdf', 'content': data}

# ── /preview: XLS → PDF → base64 ─────────────────────────────────────────────
def preview_pdf(d):
    import win32com.client as win32, pythoncom
    with _com_lock:
        tmp_xls = tempfile.NamedTemporaryFile(suffix='.xls', delete=False, dir=tempfile.gettempdir())
        tmp_xls.close()
        tmp_pdf = tmp_xls.name.replace('.xls', '.pdf')
        _build_to_file(d, tmp_xls.name)   # already calls CoInitialize internally
        pythoncom.CoInitialize()
        try:
            xl = win32.Dispatch('Excel.Application')
            xl.Visible = False
            xl.DisplayAlerts = False
            try:
                wb = xl.Workbooks.Open(tmp_xls.name)
                wb.ExportAsFixedFormat(0, tmp_pdf)
                wb.Close(False)
            finally:
                xl.Quit()
        finally:
            pythoncom.CoUninitialize()
        with open(tmp_pdf, 'rb') as f:
            data = base64.b64encode(f.read()).decode()
        try: os.remove(tmp_xls.name)
        except: pass
        try: os.remove(tmp_pdf)
        except: pass
        return data

# ── /print: open temp file in Excel visibly ───────────────────────────────────
def preview_invoice(d):
    import win32com.client as win32, pythoncom
    tmp = tempfile.NamedTemporaryFile(suffix='.xls', delete=False, dir=tempfile.gettempdir())
    tmp.close()
    _build_to_file(d, tmp.name)
    pythoncom.CoInitialize()
    xl = win32.Dispatch('Excel.Application')
    xl.Visible = True
    xl.DisplayAlerts = False
    xl.Workbooks.Open(tmp.name)
    def _cleanup():
        import time
        while True:
            time.sleep(2)
            try:
                if tmp.name not in [wb.FullName for wb in xl.Workbooks]: break
            except: break
        try: os.remove(tmp.name)
        except: pass
        pythoncom.CoUninitialize()
    threading.Thread(target=_cleanup, daemon=True).start()

# ── HTTP server ───────────────────────────────────────────────────────────────
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_POST(self):
        route = urlparse(self.path).path.rstrip('/') or '/'
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        try:
            if route == '/preview':
                self._ok({'pdf': preview_pdf(body)})
            elif route == '/export-pdf':
                self._ok(export_pdf_data(body))
            elif route == '/export-excel':
                self._ok(export_excel_data(body))
            elif route == '/print':
                preview_invoice(body)
                self._ok({'ok': True})
            elif route == '/generate':
                self._ok({'file': export_invoice(body)})
            else:
                self._ok({'error': 'Unknown route: ' + route}, 404)
        except Exception as e:
            import traceback; traceback.print_exc()
            self._ok({'error': str(e)}, 500)

    def _ok(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code); self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(b))
        self.end_headers(); self.wfile.write(b)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')

if __name__ == '__main__':
    print('Server ready → http://localhost:5000  (keep open)')
    ThreadingHTTPServer(('localhost', 5000), H).serve_forever()
