import { Injectable, signal } from '@angular/core';
import { Lavage } from '../models';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class LavageService {
  private lavages = signal<Lavage[]>([]);

  constructor() { this.load().catch(() => this.lavages.set([])); }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur API');
    }
    return res.json();
  }

  async load() {
    const lavages = await this.request<Lavage[]>(`${API}/lavages`);
    this.lavages.set(lavages);
  }

  getAll() { return this.lavages; }

  async add(name: string) {
    const lavage = await this.request<Lavage>(`${API}/lavages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    this.lavages.update(list => [...list, lavage].sort((a, b) => a.name.localeCompare(b.name)));
    return lavage;
  }

  async update(id: string, name: string) {
    const lavage = await this.request<Lavage>(`${API}/lavages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    this.lavages.update(list => list.map(item => item.id === id ? lavage : item).sort((a, b) => a.name.localeCompare(b.name)));
    return lavage;
  }

  async delete(id: string) {
    await this.request<{ ok: boolean }>(`${API}/lavages/${id}`, { method: 'DELETE' });
    this.lavages.update(list => list.filter(item => item.id !== id));
  }
}
