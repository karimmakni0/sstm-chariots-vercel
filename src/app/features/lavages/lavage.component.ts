import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LavageService, ToastService } from '../../core/services';
import { Lavage } from '../../core/models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-lavage',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page__header">
        <div>
          <div class="title-wrap">
            <h1 class="page__title">Lavage</h1>
            <div class="water-anim">
              <span class="material-icons">water_drop</span>
            </div>
          </div>
          <span class="page__subtitle">{{ filtered().length }} société(s)</span>
        </div>
      </div>

      @if (message()) {
        <div class="alert" [class.alert--error]="messageType() === 'error'" [class.alert--success]="messageType() === 'success'">
          <span class="material-icons">{{ messageType() === 'success' ? 'check_circle' : 'error' }}</span>
          <span>{{ message() }}</span>
        </div>
      }

      <div class="content-grid">
        <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()">
          <div class="card__header">
            <div>
              <h2 class="card__title">{{ editing() ? 'Modifier la société' : 'Ajouter une société' }}</h2>
              <span class="card__subtitle">Nom de la société de lavage</span>
            </div>
            <span class="material-icons card__icon">local_car_wash</span>
          </div>

          <div class="form-group">
            <label>Nom *</label>
            <input formControlName="name" type="text" placeholder="Ex: Lavage Express" [class.error]="invalidName()" />
            @if (invalidName()) { <span class="error-msg">Le nom est requis</span> }
          </div>

          <div class="form-actions">
            @if (editing()) {
              <button type="button" class="btn btn--ghost" (click)="resetForm()">Annuler</button>
            }
            <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
              @if (saving()) {
                <span class="spinner"></span> Enregistrement...
              } @else {
                <span class="material-icons">{{ editing() ? 'save' : 'add' }}</span>
                {{ editing() ? 'Enregistrer' : 'Ajouter' }}
              }
            </button>
          </div>
        </form>

        <div class="card list-card">
          <div class="toolbar">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" placeholder="Rechercher..." [value]="search()" (input)="search.set($any($event.target).value)" />
              @if (search()) {
                <button class="clear-btn" (click)="search.set('')" title="Effacer">
                  <span class="material-icons">close</span>
                </button>
              }
            </div>
            <button class="icon-btn" (click)="reload()" title="Actualiser">
              <span class="material-icons">refresh</span>
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Créée le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (lavage of filtered(); track lavage.id) {
                  <tr>
                    <td>
                      <div class="company-cell">
                        <span class="material-icons company-cell__icon">local_car_wash</span>
                        <strong>{{ lavage.name }}</strong>
                      </div>
                    </td>
                    <td>{{ lavage.createdAt ? (lavage.createdAt | date:'dd/MM/yyyy') : '-' }}</td>
                    <td>
                      <div class="actions">
                        <button class="icon-btn" (click)="startEdit(lavage)" title="Modifier">
                          <span class="material-icons">edit</span>
                        </button>
                        <button class="icon-btn icon-btn--danger" (click)="deleteId.set(lavage.id)" title="Supprimer">
                          <span class="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="3" class="empty">Aucune société de lavage trouvée</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <app-confirm-dialog [visible]="deleteId() !== null" (confirm)="doDelete()" (cancel)="deleteId.set(null)" />
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 32px; }
    .page__header { display: flex; align-items: flex-start; justify-content: space-between; }
    .title-wrap { display: flex; align-items: center; gap: 12px; }
    .page__title { font-size: 32px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.5px; }
    .water-anim { color: #3b82f6; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: float 3s ease-in-out infinite; }
    .water-anim .material-icons { font-size: 28px; filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)); animation: pulse-water 2s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes pulse-water { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .water-anim, .water-anim .material-icons { animation: none; } }
    .page__subtitle { color: var(--text-secondary); font-size: 15px; font-weight: 500; }
    .alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; font-size: 14px; border: 1px solid transparent; font-weight: 500; animation: pageFadeIn 0.3s ease; }
    .alert--success { background: rgba(34,197,94,0.1); color: #16a34a; border-color: rgba(34,197,94,0.2); }
    .alert--error { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
    .alert .material-icons { font-size: 20px; }
    .content-grid { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 24px; align-items: start; }
    @media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }
    .card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm); transition: var(--transition); }
    .card:hover { box-shadow: var(--shadow); }
    .form-card { padding: 28px; }
    .list-card { min-width: 0; }
    .card__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .card__title { font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary); }
    .card__subtitle { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    .card__icon { width: 48px; height: 48px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent); flex-shrink: 0; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    input { padding: 12px 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-secondary); color: var(--text-primary); outline: none; width: 100%; transition: var(--transition); font-weight: 500; }
    input:focus { border-color: var(--accent); background: var(--bg-card); box-shadow: 0 0 0 3px var(--accent-soft); }
    input.error { border-color: #ef4444; }
    .error-msg { font-size: 11px; color: #ef4444; font-weight: 600; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg-card); }
    .search-box { display: flex; align-items: center; gap: 10px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; flex: 1; min-width: 200px; transition: var(--transition); }
    .search-box:focus-within { border-color: var(--accent); background: var(--bg-card); box-shadow: 0 0 0 3px var(--accent-soft); }
    .search-box .material-icons { color: var(--text-secondary); font-size: 20px; }
    .search-box input { border: none; background: none; padding: 0; font-size: 14px; box-shadow: none !important; }
    .clear-btn { background: var(--border); border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 4px; border-radius: 50%; }
    .table-wrap { overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table th { text-align: left; padding: 16px 20px; color: var(--text-secondary); font-weight: 700; border-bottom: 2px solid var(--bg-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; background: var(--bg-secondary); }
    .table td { padding: 16px 20px; color: var(--text-primary); border-bottom: 1px solid var(--bg-secondary); vertical-align: middle; }
    .table tr:last-child td { border-bottom: none; }
    .table tbody tr:hover td { background: var(--bg-secondary); }
    .company-cell { display: flex; align-items: center; gap: 12px; }
    .company-cell__icon { color: var(--accent); font-size: 22px; background: var(--accent-soft); padding: 8px; border-radius: 10px; }
    .actions { display: flex; gap: 8px; }
    .icon-btn { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 8px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; text-decoration: none; transition: var(--transition); }
    .icon-btn:hover { background: var(--bg-secondary); color: var(--text-primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
    .icon-btn--danger:hover { background: #fef2f2; color: #ef4444; border-color: #ef4444; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: var(--transition); }
    .btn--primary { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; box-shadow: var(--shadow-sm); }
    .btn--primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); }
    .btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn--ghost { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-card); color: var(--accent); border-color: var(--accent); }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .empty { text-align: center; color: var(--text-secondary); padding: 64px 20px; font-weight: 500; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LavageComponent {
  private fb = inject(FormBuilder);
  private lavageService = inject(LavageService);
  private toastService = inject(ToastService);

  search = signal('');
  editing = signal<Lavage | null>(null);
  deleteId = signal<string | null>(null);
  saving = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  form = this.fb.group({
    name: ['', Validators.required]
  });

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.lavageService.getAll()().filter(lavage => !term || lavage.name.toLowerCase().includes(term));
  });

  invalidName() {
    const control = this.form.get('name');
    return control?.invalid && control?.touched;
  }

  async reload() {
    try {
      await this.lavageService.load();
      this.setMessage('Liste actualisée', 'success');
    } catch (e) {
      this.setMessage(this.errorMessage(e), 'error');
    }
  }

  startEdit(lavage: Lavage) {
    this.editing.set(lavage);
    this.form.patchValue({ name: lavage.name });
  }

  resetForm() {
    this.editing.set(null);
    this.form.reset({ name: '' });
  }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const name = this.form.value.name!.trim();
    const current = this.editing();

    try {
      if (current) {
        await this.lavageService.update(current.id, name);
        this.toastService.show('Société de lavage mise à jour', 'success');
        this.setMessage('Société de lavage mise à jour', 'success');
      } else {
        await this.lavageService.add(name);
        this.toastService.show('Société de lavage ajoutée', 'success');
        this.setMessage('Société de lavage ajoutée', 'success');
      }
      this.resetForm();
    } catch (e) {
      this.setMessage(this.errorMessage(e), 'error');
      this.toastService.show(this.errorMessage(e), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async doDelete() {
    const id = this.deleteId();
    if (!id) return;

    try {
      await this.lavageService.delete(id);
      if (this.editing()?.id === id) this.resetForm();
      this.toastService.show('Élément déplacé vers la corbeille', 'success');
      this.setMessage('Élément déplacé vers la corbeille', 'success');
    } catch (e) {
      this.setMessage(this.errorMessage(e), 'error');
      this.toastService.show(this.errorMessage(e), 'error');
    } finally {
      this.deleteId.set(null);
    }
  }

  private setMessage(message: string, type: 'success' | 'error') {
    this.message.set(message);
    this.messageType.set(type);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Une erreur est survenue';
  }
}
