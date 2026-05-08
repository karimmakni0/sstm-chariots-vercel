import { Component, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Msg { role: 'user' | 'bot'; text: string; }

const CHIPS = [
  'Revenu total ?', 'Entreprises impayées ?', 'Top 3 entreprises ?',
  'Revenus par type de chariot ?', 'Factures ce mois ?'
];

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Floating button -->
    <button class="fab" (click)="open.set(!open())" [attr.aria-label]="'Chatbot'">
      @if (open()) { <span class="material-icons">close</span> }
      @else { <span class="material-icons">chat</span> }
    </button>

    @if (open()) {
      <div class="chat-popup">
        <div class="chat-header">
          <span class="material-icons">smart_toy</span>
          <span>Assistant S.S.T.M</span>
          <span class="chat-header__sub">Données en temps réel</span>
        </div>

        <div class="chat-body" #scrollRef>
          @if (messages().length === 0) {
            <div class="chat-welcome">
              <span class="material-icons">auto_awesome</span>
              <p>Posez une question sur vos données.</p>
            </div>
          }
          @for (m of messages(); track $index) {
            <div class="msg" [class.msg--user]="m.role==='user'" [class.msg--bot]="m.role==='bot'">
              <div class="msg__bubble" [innerHTML]="fmt(m.text)"></div>
            </div>
          }
          @if (typing()) {
            <div class="msg msg--bot">
              <div class="msg__bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          }
        </div>

        <div class="chips">
          @for (c of chips; track c) {
            <button class="chip" (click)="send(c)">{{ c }}</button>
          }
        </div>

        <div class="chat-footer">
          <input #inp [(ngModel)]="input" (keydown.enter)="send()"
                 placeholder="Posez une question..." />
          <button (click)="send()" [disabled]="!input.trim() || typing()">
            <span class="material-icons">send</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .fab { position: fixed; bottom: 28px; right: 28px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,.35); z-index: 1000; transition: transform .2s; }
    .fab:hover { transform: scale(1.08); }
    .fab .material-icons { font-size: 26px; }
    .chat-popup { position: fixed; bottom: 96px; right: 28px; width: 360px; max-height: 540px; background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 16px; display: flex; flex-direction: column; z-index: 999; box-shadow: 0 12px 40px rgba(0,0,0,.5); overflow: hidden; animation: popIn .2s ease; }
    @keyframes popIn { from { opacity:0; transform:translateY(12px) scale(.97); } to { opacity:1; transform:none; } }
    .chat-header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: #0f0f1a; border-bottom: 1px solid #2d2d44; }
    .chat-header .material-icons { color: var(--accent); font-size: 22px; }
    .chat-header span:nth-child(2) { font-weight: 700; color: #fff; font-size: 14px; flex: 1; }
    .chat-header__sub { font-size: 11px; color: #94a3b8; }
    .chat-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
    .chat-welcome { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; font-size: 13px; padding: 16px 0 8px; }
    .chat-welcome .material-icons { font-size: 36px; color: var(--accent); opacity: .7; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; border-top: 1px solid #2d2d44; background: #0f0f1a; }
    .chip { background: #2d2d44; color: #cbd5e1; border: 1px solid #3d3d5c; border-radius: 20px; padding: 4px 12px; font-size: 12px; cursor: pointer; transition: all .15s; }
    .chip:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
    .msg { display: flex; }
    .msg--user { justify-content: flex-end; }
    .msg--bot { justify-content: flex-start; }
    .msg__bubble { max-width: 85%; padding: 9px 13px; border-radius: 14px; font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
    .msg--user .msg__bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
    .msg--bot .msg__bubble { background: #2d2d44; color: #e2e8f0; border-bottom-left-radius: 4px; }
    .typing { display: flex; align-items: center; gap: 4px; padding: 12px 16px; }
    .typing span { width: 7px; height: 7px; background: #94a3b8; border-radius: 50%; animation: bounce .9s infinite; }
    .typing span:nth-child(2) { animation-delay: .15s; }
    .typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    .chat-footer { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #2d2d44; background: #0f0f1a; }
    .chat-footer input { flex: 1; background: #2d2d44; border: 1px solid #3d3d5c; border-radius: 8px; padding: 8px 12px; color: #f1f5f9; font-size: 13px; outline: none; }
    .chat-footer input:focus { border-color: var(--accent); }
    .chat-footer button { background: var(--accent); border: none; border-radius: 8px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: opacity .2s; }
    .chat-footer button:disabled { opacity: .4; cursor: not-allowed; }
    .chat-footer button .material-icons { font-size: 18px; }
  `]
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollRef') private scrollRef!: ElementRef;

  open     = signal(false);
  messages = signal<Msg[]>([]);
  typing   = signal(false);
  input    = '';
  chips    = CHIPS;

  ngAfterViewChecked() {
    if (this.scrollRef) {
      const el = this.scrollRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  fmt(text: string) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  async send(text?: string) {
    const q = (text ?? this.input).trim();
    if (!q) return;
    this.input = '';
    this.messages.update(m => [...m, { role: 'user', text: q }]);
    this.typing.set(true);
    try {
      const res = await fetch(`${environment.apiUrl}/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q })
      });
      const { answer } = await res.json();
      this.messages.update(m => [...m, { role: 'bot', text: answer }]);
    } catch {
      this.messages.update(m => [...m, { role: 'bot', text: '❌ API non disponible. Lancez start_api.bat.' }]);
    } finally {
      this.typing.set(false);
    }
  }
}
