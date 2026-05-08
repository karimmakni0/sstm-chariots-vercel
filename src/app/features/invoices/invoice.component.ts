import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CompanyService } from '../../core/services';
import { Company } from '../../core/models';
import { environment } from '../../../environments/environment';

// ── French number-to-words ────────────────────────────────────────────────────
function toWords(n: number): string {
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante',
    'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  function u100(x: number): string {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10), u = x % 10;
    if (t === 7 || t === 9) return tens[t] + (u === 1 ? ' et ' : '-') + ones[10 + u];
    return tens[t] + (u === 1 && t !== 8 ? ' et un' : u ? '-' + ones[u] : (t === 8 ? 's' : ''));
  }
  function u1000(x: number): string {
    if (x < 100) return u100(x);
    const h = Math.floor(x / 100), r = x % 100;
    return (h === 1 ? 'cent' : ones[h] + ' cent') + (r ? ' ' + u100(r) : (h > 1 ? 's' : ''));
  }
  const d = Math.floor(n), m = Math.round((n - d) * 1000);
  let s = d >= 1000 ? u1000(Math.floor(d / 1000)) + ' mille ' : '';
  s += u1000(d % 1000);
  s += d > 1 ? ' dinars' : ' dinar';
  if (m) s += ' ' + u1000(m) + ' millimes';
  return s.trim().replace(/\s+/g, ' ');
}

const CHARIOT_LABELS: Record<string, string> = {
  '3T': 'chariot 3 tonne', '5T': 'chariot 5 tonne',
  '7T': 'chariot 7 tonne', '16T': 'chariot 16 tonne',
};

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ctrl">
      <div class="ctrl__fields">
        <div class="fg">
          <label>Entreprise</label>
          <select [(ngModel)]="selectedId" (ngModelChange)="onSelect()">
            <option value="">Sélectionner...</option>
            @for (c of filteredCompanies(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <div class="fg">
          <label>N° Facture</label>
          <input [(ngModel)]="invoiceNum" (ngModelChange)="invalidatePdfCache()" placeholder="s.s.t.m.01" />
        </div>
        <div class="fg">
          <label>Date</label>
          <input type="date" [(ngModel)]="invoiceDate" (ngModelChange)="invalidatePdfCache()" />
        </div>
      </div>
      <div class="ctrl__btns">
        <button class="btn btn--ghost" (click)="resetFilters()">
          <span class="material-icons">filter_alt_off</span>
        </button>
        <button class="btn btn--ghost" (click)="print()">
          <span class="material-icons">print</span> Imprimer
        </button>
        <button class="btn btn--primary" [disabled]="!company() || !!exporting()" (click)="exportPdf()">
          @if (exporting() === 'pdf') { <span class="spinner"></span> Export... }
          @else { <span class="material-icons">picture_as_pdf</span> Exporter PDF }
        </button>
        <button class="btn btn--primary" [disabled]="!company() || !!exporting()" (click)="exportExcel()">
          @if (exporting() === 'excel') { <span class="spinner"></span> Export... }
          @else { <span class="material-icons">table_view</span> Exporter Excel }
        </button>
        <input #pdfImport class="file-input" type="file" accept="application/pdf,.pdf" (change)="importFile($event, 'pdf')" />
        <input #excelImport class="file-input" type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" (change)="importFile($event, 'excel')" />
      </div>
    </div>
    @if (filteredCompanies().length === 0) {
      <div class="no-results">
        <span class="material-icons">search_off</span>
        <span>Aucune entreprise ne correspond aux filtres</span>
      </div>
    }

    <!-- Preview panel -->
    @if (!company()) {
      <div class="empty">
        <span class="material-icons">description</span>
        <p>Sélectionnez une entreprise pour prévisualiser et exporter la facture</p>
      </div>
    } @else {
      <div class="preview-card">
        <div class="preview-header">
          <span class="material-icons">description</span>
          <strong>Aperçu — {{ invoiceNum }}</strong>
          <span class="preview-co">{{ company()!.name }}</span>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn--ghost" (click)="loadPreview()" [disabled]="loadingPdf()">
              <span class="material-icons">refresh</span>
            </button>
            <button class="btn btn--ghost" (click)="print()">
              <span class="material-icons">print</span> Imprimer
            </button>
          </div>
        </div>

        @if (loadingPdf()) {
          <div class="pdf-loading"><span class="spinner-dark"></span> Génération du PDF...</div>
        } @else if (pdfUrl()) {
          <iframe class="pdf-frame" [src]="pdfUrl()!" title="Aperçu facture"></iframe>
        } @else if (pdfError()) {
          <!-- Fallback: simple table preview if server not running -->
          <div class="pdf-error">
            <span class="material-icons">warning</span> {{ pdfError() }}
          </div>
        }

        <div class="export-note">
          <span class="material-icons">info</span>
          Le fichier exporté utilisera le template Excel original (s.s.t.m.032.xls) avec votre mise en forme exacte.
        </div>
      </div>
    }
  `,
  styles: [`
    .ctrl { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 24px; display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; box-shadow: var(--shadow-sm); }
    .ctrl__fields { display: flex; gap: 16px; flex: 1; flex-wrap: wrap; }
    .ctrl__btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .fg { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
    label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    input, select { padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; outline: none; transition: var(--transition); font-weight: 500; }
    input:focus, select:focus { border-color: var(--accent); background: var(--bg-card); box-shadow: 0 0 0 3px var(--accent-soft); }
    .no-results { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; font-weight: 500; }
    .no-results .material-icons { font-size: 20px; color: #ef4444; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: var(--transition); box-shadow: var(--shadow-sm); }
    .btn--primary { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; }
    .btn--primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(249, 115, 22, 0.25); }
    .btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn--ghost { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn--ghost:hover:not(:disabled) { background: var(--bg-card); color: var(--accent); border-color: var(--accent); }
    .file-input { display: none; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 20px; color: var(--text-secondary); text-align: center; }
    .empty .material-icons { font-size: 72px; opacity: 0.15; color: var(--accent); }
    .empty p { font-size: 16px; font-weight: 500; max-width: 300px; }
    .preview-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm); transition: var(--transition); }
    .preview-card:hover { box-shadow: var(--shadow); }
    .preview-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .preview-header .material-icons { font-size: 24px; color: var(--accent); background: var(--accent-soft); padding: 8px; border-radius: 10px; }
    .preview-co { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
    .pdf-frame { width: 100%; height: 80vh; border: 1px solid var(--border); border-radius: 12px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.05); }
    .pdf-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; justify-content: center; color: var(--text-secondary); font-weight: 600; }
    .pdf-error { display: flex; align-items: center; gap: 12px; padding: 18px 24px; color: #ef4444; background: #fef2f2; border-radius: 14px; border: 1px solid #fee2e2; font-weight: 500; }
    .spinner-dark { width: 24px; height: 24px; border: 3px solid var(--bg-secondary); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    .export-note { display: flex; align-items: center; gap: 8px; margin-top: 20px; font-size: 13px; color: var(--text-secondary); font-weight: 500; background: var(--bg-secondary); padding: 10px 16px; border-radius: 10px; border-left: 4px solid var(--accent); }
    .export-note .material-icons { font-size: 18px; color: var(--accent); }
  `]
})
export class InvoiceComponent implements OnInit {
  private companyService = inject(CompanyService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      const ids = this.filteredCompanies().map(c => c.id);
      if (this.selectedId && !ids.includes(this.selectedId)) {
        this.selectedId = '';
        this.company.set(undefined);
        this.pdfUrl.set(null);
        this.invalidatePdfCache();
      }
    });
  }

  selectedId = '';
  invoiceDate = new Date().toISOString().split('T')[0];
  invoiceNum = this.nextNum();
  exporting  = signal<'pdf' | 'excel' | ''>('');
  importing  = signal(false);
  pdfUrl     = signal<SafeResourceUrl | null>(null);
  private pdfBase64 = signal('');
  private pdfCacheKey = signal('');
  loadingPdf = signal(false);
  pdfError   = signal('');

  filterName   = signal('');
  filterStatus = signal('');
  filterType   = signal('');

  companies = computed(() => this.companyService.getAll()());

  filteredCompanies = computed(() => {
    const name   = this.filterName().trim().toLowerCase();
    const status = this.filterStatus();
    const type   = this.filterType();
    return this.companies().filter(c => {
      if (status && c.paymentStatus !== status) return false;
      if (name   && !c.name.toLowerCase().includes(name)) return false;
      if (type   && !c.usages.some(u => u.chariotType === type)) return false;
      return true;
    });
  });

  company = signal<Company | undefined>(undefined);

  calc = computed(() => {
    const ht = this.company()?.usages.reduce((s, u) => s + u.totalPrice, 0) ?? 0;
    const tva = +(ht * 0.19).toFixed(3);
    return { ht, tva, ttc: +(ht + tva + 1).toFixed(3) };
  });

  amountInWords = computed(() => toWords(this.calc().ttc));

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('companyId');
    if (id) { this.selectedId = id; this.onSelect(); }
  }

  onSelect() {
    this.company.set(this.companyService.getById(this.selectedId));
    this.pdfUrl.set(null);
    this.pdfError.set('');
    this.invalidatePdfCache();
    if (this.company()) this.loadPreview();
  }
  label(type: string) { return CHARIOT_LABELS[type] ?? type; }
  resetFilters() { this.filterName.set(''); this.filterStatus.set(''); this.filterType.set(''); }

  async loadPreview() {
    this.loadingPdf.set(true);
    this.pdfError.set('');
    try {
      const c = this.company()!;
      const { ht, tva, ttc } = this.calc();
      const d = new Date(this.invoiceDate);
      const body = this.invoicePayload();
      const resp = await fetch(`${environment.invoiceServerUrl}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      const url = `data:application/pdf;base64,${json.pdf}`;
      this.pdfBase64.set(json.pdf);
      this.pdfCacheKey.set(this.invoicePayloadKey());
      this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      this.pdfError.set(msg.includes('Failed to fetch') || msg.includes('10061')
        ? 'Serveur non démarré — lancez backend\\start_invoice_server.bat'
        : 'Erreur : ' + msg);
    } finally {
      this.loadingPdf.set(false);
    }
  }

  private nextNum(): string {
    const n = +(localStorage.getItem('sstm_inv_n') ?? '0') + 1;
    return `s.s.t.m.${String(n).padStart(2, '0')}`;
  }

  print() {
    if (!this.company()) { alert('Sélectionnez une entreprise d\'abord.'); return; }
    const url = this.pdfUrl();
    if (!url) { alert('Cliquez d\'abord sur Actualiser pour générer l\'aperçu.'); return; }
    // Extract the raw data URL from the SafeResourceUrl wrapper
    const raw = (url as any).changingThisBreaksApplicationSecurity ?? String(url);
    const win = window.open(raw, '_blank');
    if (win) { win.onload = () => { win.focus(); win.print(); }; }
  }

  async exportExcel() {
    if (!this.company()) return;
    this.exporting.set('excel');
    try {
      const json = await this.sendToServer(`${environment.invoiceServerUrl}/export-excel`);
      this.downloadBase64(
        json.content,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        this.invoiceFileName('xlsx')
      );
      this.advanceInvoiceNumber();
    } finally {
      this.exporting.set('');
    }
  }

  async exportPdf() {
    if (!this.company()) return;
    this.exporting.set('pdf');
    try {
      const pdf = await this.getCurrentPdfBase64();
      this.downloadBase64(pdf, 'application/pdf', this.invoiceFileName('pdf'));
      this.advanceInvoiceNumber();
    } finally {
      this.exporting.set('');
    }
  }

  async importFile(event: Event, type: 'pdf' | 'excel') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    try {
      const content = await this.fileToBase64(file);
      const endpoint = type === 'pdf' ? 'pdf' : 'excel';
      const resp = await fetch(`${environment.apiUrl}/factures/import/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || this.mimeFromName(file.name),
          content,
          companyId: this.company()?.id ?? null,
          invoiceNumber: this.invoiceNum
        })
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.message || 'Import impossible');
      alert('✅ ' + json.message);
    } catch (e: any) {
      alert('❌ Erreur import : ' + (e?.message ?? String(e)));
    } finally {
      this.importing.set(false);
      input.value = '';
    }
  }

  private invoicePayload() {
    const c = this.company()!;
    const { ht, tva, ttc } = this.calc();
    const d = new Date(this.invoiceDate);
    return {
      num: `${this.invoiceNum.replace('s.s.t.m.','')}du${d.getFullYear()}`,
      display_num: this.invoiceNum,
      date_serial: Math.floor(d.getTime() / 86400000) + 25569,
      company: c.name,
      rows: c.usages.map(u => ({ designation: this.label(u.chariotType), hours: u.hoursWorked, price: u.pricePerHour, tva: 0.19, total: u.totalPrice })),
      ht, tva, ttc
    };
  }

  private invoicePayloadKey() {
    return JSON.stringify(this.invoicePayload());
  }

  private async getCurrentPdfBase64() {
    const cacheKey = this.invoicePayloadKey();
    if (this.pdfBase64() && this.pdfCacheKey() === cacheKey) {
      return this.pdfBase64();
    }

    const json = await this.sendToServer(`${environment.invoiceServerUrl}/preview`);
    this.pdfBase64.set(json.pdf);
    this.pdfCacheKey.set(cacheKey);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`data:application/pdf;base64,${json.pdf}`));
    return json.pdf;
  }

  invalidatePdfCache() {
    this.pdfBase64.set('');
    this.pdfCacheKey.set('');
  }

  private async sendToServer(url: string) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.invoicePayload()) });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      return json;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      alert(msg.includes('Failed to fetch') || msg.includes('10061')
        ? '❌ Serveur non démarré.\n\nDouble-cliquez sur :\nbackend\\start_invoice_server.bat'
        : '❌ Erreur : ' + msg);
      throw e;
    }
  }

  private downloadBase64(content: string, mimeType: string, fileName: string) {
    if (!content) throw new Error('Fichier exporté vide');
    const bytes = atob(content);
    const data = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) data[i] = bytes.charCodeAt(i);
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private mimeFromName(name: string) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    return 'application/octet-stream';
  }

  private advanceInvoiceNumber() {
    const n = +(localStorage.getItem('sstm_inv_n') ?? '0') + 1;
    localStorage.setItem('sstm_inv_n', String(n));
    this.invoiceNum = this.nextNum();
  }

  private invoiceFileName(ext: 'pdf' | 'xlsx') {
    const numero = this.invoiceNum.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `facture-${numero}.${ext}`;
  }
}
