import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface TrashItem {
  id: string;
  name: string;
  type: 'entreprise' | 'facture' | 'lavage';
  deleted_at: string;
}

export interface TrashData {
  companies: TrashItem[];
  invoices: TrashItem[];
  lavages: TrashItem[];
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class TrashService {
  private trashData = signal<TrashData>({ companies: [], invoices: [], lavages: [] });

  async load() {
    try {
      const res = await fetch(`${API}/trash`);
      if (res.ok) {
        this.trashData.set(await res.json());
      }
    } catch (e) {
      console.error('Error loading trash:', e);
    }
  }

  getTrashData() {
    return this.trashData;
  }

  async restore(type: 'entreprise' | 'facture' | 'lavage', id: string) {
    const endpoint = this.getEndpoint(type);
    const res = await fetch(`${API}/${endpoint}/${id}/restore`, { method: 'PATCH' });
    if (res.ok) {
      await this.load();
      return true;
    }
    return false;
  }

  async permanentDelete(type: 'entreprise' | 'facture' | 'lavage', id: string) {
    const endpoint = this.getEndpoint(type);
    const res = await fetch(`${API}/${endpoint}/${id}/permanent`, { method: 'DELETE' });
    if (res.ok) {
      await this.load();
      return true;
    }
    return false;
  }

  private getEndpoint(type: 'entreprise' | 'facture' | 'lavage'): string {
    switch (type) {
      case 'entreprise': return 'companies';
      case 'facture': return 'invoices';
      case 'lavage': return 'lavages';
    }
  }
}
