import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrashService, TrashItem, ToastService } from '../../core/services';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Corbeille</h1>
        <p class="page-subtitle">Gérez les éléments supprimés (Entreprises, Factures, Lavage)</p>
      </div>
    </div>

    <div class="trash-container">
      <!-- Companies -->
      <section class="trash-section">
        <h2 class="section-title">
          <span class="material-icons">business</span> Entreprises supprimées
        </h2>
        <div class="trash-grid">
          @for (item of trashData().companies; track item.id) {
            <div class="trash-card">
              <div class="trash-card__info">
                <span class="trash-card__name">{{ item.name }}</span>
                <span class="trash-card__date">Supprimé le : {{ item.deleted_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="trash-card__actions">
                <button class="btn-icon btn-icon--restore" (click)="restore('entreprise', item)" title="Restaurer">
                  <span class="material-icons">restore</span>
                </button>
                <button class="btn-icon btn-icon--delete" (click)="confirmPermanentDelete('entreprise', item)" title="Supprimer définitivement">
                  <span class="material-icons">delete_forever</span>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-trash">Aucune entreprise dans la corbeille</div>
          }
        </div>
      </section>

      <!-- Invoices -->
      <section class="trash-section">
        <h2 class="section-title">
          <span class="material-icons">description</span> Factures supprimées
        </h2>
        <div class="trash-grid">
          @for (item of trashData().invoices; track item.id) {
            <div class="trash-card">
              <div class="trash-card__info">
                <span class="trash-card__name">{{ item.name }}</span>
                <span class="trash-card__date">Supprimé le : {{ item.deleted_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="trash-card__actions">
                <button class="btn-icon btn-icon--restore" (click)="restore('facture', item)" title="Restaurer">
                  <span class="material-icons">restore</span>
                </button>
                <button class="btn-icon btn-icon--delete" (click)="confirmPermanentDelete('facture', item)" title="Supprimer définitivement">
                  <span class="material-icons">delete_forever</span>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-trash">Aucune facture dans la corbeille</div>
          }
        </div>
      </section>

      <!-- Lavages -->
      <section class="trash-section">
        <h2 class="section-title">
          <span class="material-icons">local_car_wash</span> Lavages supprimés
        </h2>
        <div class="trash-grid">
          @for (item of trashData().lavages; track item.id) {
            <div class="trash-card">
              <div class="trash-card__info">
                <span class="trash-card__name">{{ item.name }}</span>
                <span class="trash-card__date">Supprimé le : {{ item.deleted_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="trash-card__actions">
                <button class="btn-icon btn-icon--restore" (click)="restore('lavage', item)" title="Restaurer">
                  <span class="material-icons">restore</span>
                </button>
                <button class="btn-icon btn-icon--delete" (click)="confirmPermanentDelete('lavage', item)" title="Supprimer définitivement">
                  <span class="material-icons">delete_forever</span>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-trash">Aucun lavage dans la corbeille</div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 32px; }
    .page-title { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .page-subtitle { color: var(--text-secondary); font-size: 15px; font-weight: 500; }

    .trash-container { display: flex; flex-direction: column; gap: 40px; }
    .trash-section { display: flex; flex-direction: column; gap: 20px; }
    .section-title { font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .section-title .material-icons { color: var(--accent); }

    .trash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .trash-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; transition: var(--transition); }
    .trash-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--accent-soft); }
    
    .trash-card__info { display: flex; flex-direction: column; gap: 4px; }
    .trash-card__name { font-weight: 700; color: #fff; font-size: 15px; }
    .trash-card__date { font-size: 12px; color: var(--text-secondary); }

    .trash-card__actions { display: flex; gap: 8px; }
    .btn-icon { width: 36px; height: 36px; border-radius: 10px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--transition); background: var(--bg-secondary); color: var(--text-secondary); }
    .btn-icon--restore:hover { background: var(--accent-soft); color: var(--accent); }
    .btn-icon--delete:hover { background: #fee2e2; color: #ef4444; }
    .btn-icon .material-icons { font-size: 20px; }

    .empty-trash { grid-column: 1 / -1; padding: 24px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border); border-radius: 16px; color: var(--text-secondary); text-align: center; font-size: 14px; font-weight: 500; }
  `]
})
export class TrashComponent implements OnInit {
  private trashService = inject(TrashService);
  private toastService = inject(ToastService);

  trashData = this.trashService.getTrashData();

  ngOnInit() {
    this.trashService.load();
  }

  async restore(type: 'entreprise' | 'facture' | 'lavage', item: TrashItem) {
    const ok = await this.trashService.restore(type, item.id);
    if (ok) {
      this.toastService.show('Élément restauré', 'success');
    } else {
      this.toastService.show('Erreur lors de la restauration', 'error');
    }
  }

  confirmPermanentDelete(type: 'entreprise' | 'facture' | 'lavage', item: TrashItem) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${item.name}" ? Cette action est irréversible.`)) {
      this.deletePermanent(type, item);
    }
  }

  async deletePermanent(type: 'entreprise' | 'facture' | 'lavage', item: TrashItem) {
    const ok = await this.trashService.permanentDelete(type, item.id);
    if (ok) {
      this.toastService.show('Élément supprimé définitivement', 'success');
    } else {
      this.toastService.show('Erreur lors de la suppression', 'error');
    }
  }
}
