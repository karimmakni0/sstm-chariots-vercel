import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CompanyService, ToastService } from '../../../core/services';
import { ChariotType, DEFAULT_PRICES } from '../../../core/models';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="page" (click)="activeDropdown.set(null)">
      <div class="page__header">
        <a routerLink="/companies" class="back-btn"><span class="material-icons">arrow_back</span></a>
        <h1 class="page__title">{{ isEdit ? 'Modifier' : 'Nouvelle' }} entreprise</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Company Info -->
        <div class="card info-card">
          <div class="form-row">
            <div class="form-group">
              <label>Nom de l'entreprise *</label>
              <input formControlName="name" type="text" [class.error]="invalid('name')" placeholder="Ex: S.S.T.M Logistics" />
              @if (invalid('name')) { <span class="error-msg">Ce champ est requis</span> }
            </div>
            <div class="form-group form-group--sm">
              <label>Statut global</label>
              <select formControlName="paymentStatus">
                <option value="UNPAID">🔴 Impayé</option>
                <option value="PAID">🟢 Payé</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Summary cards -->
        @if (usages.length > 0) {
          <div class="summary-row">
            <div class="summary-card">
              <span class="material-icons">receipt_long</span>
              <div><div class="summary-card__val">{{ usages.length }}</div><div class="summary-card__label">Lignes</div></div>
            </div>
            <div class="summary-card">
              <span class="material-icons">schedule</span>
              <div><div class="summary-card__val">{{ totalHoursPreview() }}h</div><div class="summary-card__label">Heures</div></div>
            </div>
            <div class="summary-card summary-card--accent">
              <span class="material-icons">payments</span>
              <div><div class="summary-card__val">{{ grandTotal() | number:'1.0-0' }} DT</div><div class="summary-card__label">Total</div></div>
            </div>
          </div>
        }

        <!-- Usages Section -->
        <div class="card usage-card">
          <div class="card__header">
            <div>
              <h2 class="card__title">Utilisations chariots</h2>
              <p class="card__subtitle">Détail des prestations par type</p>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" (click)="addUsage()">
              <span class="material-icons">add</span> Ajouter
            </button>
          </div>

          @if (usages.length > 0) {
            <div class="usage-list">
              @for (g of usages.controls; track $index; let i = $index) {
                <div class="usage-row" [formGroup]="asGroup(g)" [class.row--highlight]="isMaxCost(i)">
                  <!-- Type -->
                  <div class="field-wrap type-field">
                    <label class="field-label">Chariot</label>
                    <div class="custom-select" [class.is-open]="activeDropdown() === i">
                      <button type="button" class="select-trigger" (click)="toggleDropdown(i, $event)">
                        <span class="material-icons">{{ getIcon(g.value.chariotType) }}</span>
                        <strong>{{ g.value.chariotType }}</strong>
                        <span class="material-icons arrow">expand_more</span>
                      </button>
                      @if (activeDropdown() === i) {
                        <div class="select-options" (click)="$event.stopPropagation()">
                          @for (opt of chariotOptions; track opt.value) {
                            <button type="button" class="option" 
                              [class.selected]="g.value.chariotType === opt.value"
                              (click)="selectType(i, opt.value)">
                              <span class="material-icons">{{ opt.icon }}</span>
                              <div class="option-content">
                                <span class="option-label">{{ opt.label }}</span>
                                <span class="option-desc">{{ opt.desc }}</span>
                              </div>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Hours -->
                  <div class="field-wrap hours-field">
                    <label class="field-label">Heures</label>
                    <div class="input-with-unit">
                      <input formControlName="hoursWorked" type="number" min="0.5" step="0.5"
                        (input)="onCalc()" [class.error]="invalidUsage(i, 'hoursWorked')" />
                      <span class="unit">h</span>
                    </div>
                  </div>

                  <!-- Price -->
                  <div class="field-wrap price-field">
                    <label class="field-label">Prix/h</label>
                    <div class="input-with-unit">
                      <input formControlName="pricePerHour" type="number" min="0" (input)="onCalc()" />
                      <span class="unit">DT</span>
                    </div>
                  </div>

                  <!-- Line Total -->
                  <div class="field-wrap total-field">
                    <label class="field-label">Total</label>
                    <div class="line-total">{{ getTotal(i) | number:'1.0-0' }} DT</div>
                  </div>

                  <!-- Actions -->
                  <div class="row-actions">
                    <button type="button" class="action-btn" title="Dupliquer" (click)="duplicateUsage(i)">
                      <span class="material-icons">content_copy</span>
                    </button>
                    <button type="button" class="action-btn action-btn--danger" title="Supprimer" (click)="confirmRemove(i)">
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="footer-summary">
              <div class="summary-left">
                <span class="material-icons">info</span>
                <span>{{ usages.length }} prestation(s) enregistrée(s)</span>
              </div>
              <div class="summary-right">
                <span class="label">Total entreprise :</span>
                <strong class="val">{{ grandTotal() | number:'1.0-0' }} DT</strong>
              </div>
            </div>
          } @else {
            <div class="empty-state">
              <span class="material-icons">playlist_add</span>
              <p>Aucune utilisation enregistrée. Cliquez sur <strong>Ajouter</strong> pour commencer.</p>
            </div>
          }
        </div>

        <div class="form-actions">
          <a routerLink="/companies" class="btn btn--ghost">Annuler</a>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
            @if (saving()) {
              <span class="spinner"></span> Enregistrement...
            } @else {
              <span class="material-icons">save</span> {{ isEdit ? 'Enregistrer' : 'Créer' }}
            }
          </button>
        </div>
      </form>
    </div>

    @if (removeIndex() !== null) {
      <div class="overlay" (click)="removeIndex.set(null)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <span class="material-icons dialog__icon">warning</span>
          <p>Supprimer cette ligne ?</p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="removeIndex.set(null)">Annuler</button>
            <button class="btn btn--danger" (click)="doRemove()">Supprimer</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; max-width: 1000px; padding-bottom: 48px; min-height: 100vh; }
    .page__header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .page__title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.5px; }
    .back-btn { display: flex; align-items: center; color: var(--text-secondary); text-decoration: none; padding: 10px; border-radius: 12px; border: 1px solid var(--border); transition: var(--transition); background: var(--bg-card); }
    .back-btn:hover { background: var(--bg-secondary); color: var(--accent); border-color: var(--accent); transform: translateX(-4px); }
    .card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border); padding: 24px; box-shadow: var(--shadow-sm); }
    .card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .card__title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .form-row { display: grid; grid-template-columns: 1fr 200px; gap: 20px; }
    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    input, select { padding: 12px 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; font-weight: 500; outline: none; width: 100%; transition: var(--transition); }
    input:focus, select:focus { border-color: var(--accent); background: var(--bg-card); box-shadow: 0 0 0 3px var(--accent-soft); }
    input.error { border-color: #ef4444; }
    .error-msg { font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 4px; }
    /* Summary cards */
    .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm); transition: var(--transition); }
    .summary-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
    .summary-card .material-icons { font-size: 24px; color: var(--text-secondary); background: var(--bg-secondary); padding: 10px; border-radius: 12px; }
    .summary-card--accent { border-color: var(--accent-soft); }
    .summary-card--accent .material-icons { color: var(--accent); background: var(--accent-soft); }
    .summary-card__val { font-size: 20px; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
    .summary-card--accent .summary-card__val { color: var(--accent); }
    .summary-card__label { font-size: 11px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
    /* Usage Section */
    .usage-card { padding: 0; margin-top: 8px; }
    .usage-card .card__header { padding: 24px 24px 16px; margin-bottom: 0; }
    .card__subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
    .usage-list { display: flex; flex-direction: column; }
    .usage-row { display: grid; grid-template-columns: 160px 100px 110px 110px 1fr; gap: 20px; align-items: flex-end; padding: 16px 24px; border-bottom: 1px solid var(--border); transition: var(--transition); }
    @media (max-width: 1024px) { .usage-row { grid-template-columns: repeat(3, 1fr); gap: 12px; } .row-actions { justify-content: flex-start !important; } }
    @media (max-width: 640px) { .usage-row { grid-template-columns: repeat(2, 1fr); } }
    .usage-row:hover { background: var(--bg-secondary); }
    .row--highlight { border-left: 4px solid var(--accent); background: var(--accent-soft) !important; }
    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .input-with-unit { position: relative; display: flex; align-items: center; }
    .input-with-unit input { padding-right: 32px; height: 42px; border-radius: 10px; font-weight: 700; }
    .unit { position: absolute; right: 12px; font-size: 12px; font-weight: 700; color: var(--text-secondary); pointer-events: none; }
    .line-total { height: 42px; display: flex; align-items: center; font-size: 15px; font-weight: 800; color: var(--accent); white-space: nowrap; }
    .compact-select { height: 42px; border-radius: 10px; font-weight: 700; font-size: 13px; padding: 0 12px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-secondary); transition: var(--transition); }
    .st--paid { background: rgba(34,197,94,0.1) !important; color: #16a34a !important; border-color: rgba(34,197,94,0.2) !important; }
    .row-actions { display: flex; gap: 8px; justify-content: flex-end; height: 42px; align-items: center; }
    .action-btn { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 8px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; transition: var(--transition); }
    .action-btn:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-2px); border-color: var(--text-secondary); }
    .action-btn--danger:hover { color: #ef4444; background: #fef2f2; border-color: #ef4444; }
    /* Footer Summary */
    .footer-summary { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: var(--bg-secondary); border-radius: 0 0 20px 20px; }
    .summary-left { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; font-weight: 600; }
    .summary-left .material-icons { font-size: 18px; color: var(--accent); }
    .summary-right { display: flex; align-items: center; gap: 12px; }
    .summary-right .label { font-size: 14px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
    .summary-right .val { font-size: 24px; font-weight: 900; color: var(--accent); letter-spacing: -0.5px; }
    /* Custom Select Override for Row */
    .usage-row .custom-select { width: 100%; }
    .usage-row .select-trigger { height: 42px; border-radius: 10px; font-size: 13px; }
    .custom-select { position: relative; }
    .select-trigger { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; color: var(--text-primary); transition: var(--transition); }
    .select-trigger:hover { border-color: var(--accent); background: var(--bg-card); }
    .select-trigger .material-icons { font-size: 20px; color: var(--accent); }
    .select-trigger .arrow { margin-left: auto; color: var(--text-secondary); font-size: 18px; transition: transform 0.3s; }
    .custom-select.is-open .arrow { transform: rotate(180deg); }
    .select-options { position: absolute; top: calc(100% + 8px); left: 0; width: 220px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); z-index: 100; padding: 8px; animation: pageFadeIn 0.2s ease; }
    .option { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: none; background: none; cursor: pointer; text-align: left; transition: var(--transition); }
    .option:hover { background: var(--bg-secondary); }
    .option.selected { background: var(--accent-soft); }
    .option .material-icons { font-size: 22px; color: var(--text-secondary); transition: var(--transition); }
    .option.selected .material-icons { color: var(--accent); }
    .option-content { display: flex; flex-direction: column; flex: 1; }
    .option-label { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .option-desc { font-size: 11px; color: var(--text-secondary); font-weight: 500; }
    /* Empty State */
    .empty-state { padding: 48px; text-align: center; color: var(--text-secondary); }
    .empty-state .material-icons { font-size: 48px; color: var(--border); margin-bottom: 12px; }
    .empty-state p { font-size: 15px; font-weight: 500; }
    /* Actions */
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; transition: var(--transition); box-shadow: var(--shadow-sm); }
    .btn--primary { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; }
    .btn--primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); }
    .btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn--ghost { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-card); color: var(--accent); border-color: var(--accent); }
    .btn--danger { background: #ef4444; color: #fff; }
    .btn--danger:hover { background: #dc2626; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3); }
    .btn--sm { padding: 6px 14px; font-size: 12px; }
    .icon-btn { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 6px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; transition: var(--transition); }
    .icon-btn:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-2px); border-color: var(--text-secondary); }
    .icon-btn--danger:hover { color: #ef4444; background: #fef2f2; border-color: #ef4444; }
    .icon-btn .material-icons { font-size: 18px; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.3s ease; }
    .dialog { background: var(--bg-card); border-radius: 24px; padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; min-width: 320px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); animation: scaleIn 0.3s cubic-bezier(0, 0, 0.2, 1); }
    .dialog__icon { font-size: 48px; color: #ef4444; background: #fef2f2; padding: 16px; border-radius: 20px; }
    .dialog p { color: var(--text-primary); font-size: 16px; font-weight: 600; margin: 0; }
    .dialog__actions { display: flex; gap: 12px; width: 100%; }
    .dialog__actions .btn { flex: 1; justify-content: center; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `]
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);

  isEdit = false;
  editId = '';
  removeIndex = signal<number | null>(null);
  activeDropdown = signal<number | null>(null); // Track which row's dropdown is open
  saving = signal(false);

  readonly chariotOptions = [
    { value: '3T',  label: '3T',  icon: 'widgets',      desc: 'Léger' },
    { value: '5T',  label: '5T',  icon: 'agriculture',  desc: 'Moyen' },
    { value: '7T',  label: '7T',  icon: 'local_shipping', desc: 'Lourd' },
    { value: '16T', label: '16T', icon: 'precision_manufacturing', desc: 'Industriel' },
    { value: 'TP',  label: 'TP',  icon: 'inventory',    desc: 'Transpalette' },
    { value: 'CM',  label: 'CM',  icon: 'local_shipping', desc: 'Camion' },
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    paymentStatus: ['UNPAID' as 'PAID' | 'UNPAID'],
    usages: this.fb.array([])
  });

  get usages() { return this.form.get('usages') as FormArray; }
  asGroup(ctrl: any): FormGroup { return ctrl as FormGroup; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true; this.editId = id;
      const c = this.companyService.getById(id);
      if (c) {
        this.form.patchValue({ name: c.name, paymentStatus: c.paymentStatus });
        c.usages.forEach(u => this.usages.push(this.makeRow(u)));
      }
    }
  }

  private makeRow(u?: Partial<{ chariotType: ChariotType; hoursWorked: number; pricePerHour: number; paymentStatus: 'Paid' | 'Unpaid' }>) {
    const type: ChariotType = u?.chariotType ?? '3T';
    return this.fb.group({
      chariotType: [type],
      hoursWorked: [u?.hoursWorked ?? 0, [Validators.required, Validators.min(0.5)]],
      pricePerHour: [u?.pricePerHour ?? DEFAULT_PRICES[type], [Validators.required, Validators.min(0)]],
      paymentStatus: [u?.paymentStatus ?? 'Unpaid'],
    });
  }

  addUsage() { this.usages.push(this.makeRow()); }

  duplicateUsage(i: number) {
    const g = this.usages.at(i) as FormGroup;
    this.usages.insert(i + 1, this.makeRow(g.value));
    this.toastService.show('Ligne dupliquée', 'info');
  }

  confirmRemove(i: number) { this.removeIndex.set(i); }
  doRemove() { this.usages.removeAt(this.removeIndex()!); this.removeIndex.set(null); }

  toggleDropdown(i: number, event: Event) {
    event.stopPropagation();
    this.activeDropdown.set(this.activeDropdown() === i ? null : i);
  }

  selectType(i: number, type: string) {
    const g = this.usages.at(i) as FormGroup;
    g.patchValue({ chariotType: type });
    this.onTypeChange(i);
    this.activeDropdown.set(null);
  }

  getIcon(type: string) {
    return this.chariotOptions.find(o => o.value === type)?.icon ?? 'help';
  }

  onTypeChange(i: number) {
    const g = this.usages.at(i) as FormGroup;
    g.patchValue({ pricePerHour: DEFAULT_PRICES[g.get('chariotType')!.value as ChariotType] });
  }

  onCalc() { /* totals computed live */ }

  getTotal(i: number): number {
    const g = this.usages.at(i) as FormGroup;
    return +(g.get('hoursWorked')!.value ?? 0) * +(g.get('pricePerHour')!.value ?? 0);
  }

  grandTotal(): number {
    return this.usages.controls.reduce((s, _, i) => s + this.getTotal(i), 0);
  }

  totalHoursPreview(): number {
    return this.usages.controls.reduce((s, g: any) => s + +(g.get('hoursWorked')?.value ?? 0), 0);
  }

  isMaxCost(i: number): boolean {
    if (this.usages.length < 2) return false;
    const max = Math.max(...this.usages.controls.map((_, j) => this.getTotal(j)));
    return max > 0 && this.getTotal(i) === max;
  }

  invalid(f: string) { const c = this.form.get(f); return c?.invalid && c?.touched; }
  invalidUsage(i: number, f: string) { const c = (this.usages.at(i) as FormGroup).get(f); return c?.invalid && c?.touched; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { name, paymentStatus, usages } = this.form.value as any;
    const built = (usages as any[]).map((u: any) => ({
      id: crypto.randomUUID(),
      chariotType: u.chariotType,
      hoursWorked: +u.hoursWorked,
      pricePerHour: +u.pricePerHour,
      totalPrice: +u.hoursWorked * +u.pricePerHour,
      paymentStatus: u.paymentStatus,
    }));
    // Simulate async save (replace with real HTTP call later)
    setTimeout(() => {
      if (this.isEdit) {
        this.companyService.update(this.editId, { name, paymentStatus, usages: built });
        this.toastService.show('Entreprise mise à jour', 'success');
      } else {
        this.companyService.add({ name, paymentStatus, usages: built });
        this.toastService.show('Entreprise créée', 'success');
      }
      this.saving.set(false);
      this.router.navigate(['/companies']);
    }, 600);
  }
}
