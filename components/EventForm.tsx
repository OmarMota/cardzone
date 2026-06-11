'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserEvent, GameSlug, EventType, Priority, Confidence } from '@/lib/types';
import { GAME_CONFIG, GAME_ORDER } from '@/lib/gameConfig';
import { newId } from '@/lib/userEvents';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (ev: UserEvent) => void;
  initial?: UserEvent | null; // null = new event
  defaultDate?: string; // pre-filled date when clicking a day cell
}

const GAME_LABELS: Record<GameSlug, string> = {
  pokemon: 'Pokémon TCG',
  'one-piece': 'One Piece',
  lorcana: 'Disney Lorcana',
  magic: 'Magic: The Gathering',
  yugioh: 'Yu-Gi-Oh!',
  riftbound: 'Riftbound',
};

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'release',      label: 'Uscita prodotto' },
  { value: 'prerelease',   label: 'Evento prerelease' },
  { value: 'championship', label: 'Championship' },
  { value: 'regional',     label: 'Torneo regionale' },
  { value: 'competitive',  label: 'Evento competitivo' },
  { value: 'popculture',   label: 'Pop Culture / Anniversario' },
  { value: 'accessory',    label: 'Accessorio / Regalo' },
  { value: 'game_night',   label: 'Serata Store' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'must_do',     label: 'Must-Do',     color: '#ef4444' },
  { value: 'important',   label: 'Important',   color: '#f97316' },
  { value: 'opportunity', label: 'Opportunity', color: '#eab308' },
  { value: 'optional',    label: 'Optional',    color: '#6b7280' },
];

const CONFIDENCE_OPTIONS: { value: Confidence; label: string }[] = [
  { value: 'confirmed', label: 'Confermata' },
  { value: 'expected',  label: 'Attesa' },
  { value: 'rumored',   label: 'Non confermata' },
];

const FREQ_OPTIONS = [
  { value: 'weekly',    label: 'Ogni settimana' },
  { value: 'biweekly',  label: 'Ogni 2 settimane' },
  { value: 'monthly',   label: 'Ogni mese' },
];

const EMPTY: Partial<UserEvent> = {
  game: 'pokemon',
  type: 'release',
  priority: 'important',
  confidence: 'confirmed',
  title: '',
  date: '',
  endDate: '',
  description: '',
  sourceUrl: '',
};

export default function EventForm({ open, onClose, onSave, initial, defaultDate }: Props) {
  const isEdit = !!initial;
  const [form, setForm] = useState<Partial<UserEvent>>(EMPTY);
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurringUntil, setRecurringUntil] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof UserEvent | 'until', string>>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm(initial);
      if (initial.recurring) {
        setRecurring(true);
        setRecurringFreq(initial.recurring.frequency);
        setRecurringUntil(initial.recurring.until);
      } else {
        setRecurring(false);
        setRecurringFreq('weekly');
        setRecurringUntil('');
      }
    } else {
      setForm({ ...EMPTY, date: defaultDate ?? '' });
      setRecurring(false);
      setRecurringFreq('weekly');
      setRecurringUntil('');
    }
    setErrors({});
  }, [open, initial, defaultDate]);

  const set = <K extends keyof UserEvent>(key: K, value: UserEvent[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title?.trim()) e.title = 'Il titolo è obbligatorio';
    if (!form.date) e.date = 'La data è obbligatoria';
    if (recurring && !recurringUntil) e.until = 'Specifica la data di fine ripetizione';
    if (recurring && recurringUntil && form.date && recurringUntil < form.date) {
      e.until = 'La data di fine deve essere successiva alla data di inizio';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const ev: UserEvent = {
      id: isEdit ? form.id! : newId(),
      game: form.game as GameSlug,
      date: form.date!,
      endDate: form.endDate || undefined,
      title: form.title!.trim(),
      type: form.type as EventType,
      priority: form.priority as Priority,
      confidence: form.confidence as Confidence,
      description: form.description?.trim() || undefined,
      sourceUrl: form.sourceUrl?.trim() || undefined,
      isUserCreated: true,
      recurring: recurring ? { frequency: recurringFreq, until: recurringUntil } : undefined,
    };
    onSave(ev);
    onClose();
  };

  const fieldClass = "bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-lg"
        style={{ background: '#13151c', border: '1px solid #252836', borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold" style={{ color: '#eef0f6' }}>
            {isEdit ? 'Modifica evento' : 'Nuovo evento'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Titolo *</Label>
            <Input
              className={fieldClass}
              placeholder="es. Prerelease Buio Pesto"
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Game + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Gioco</Label>
              <Select value={form.game} onValueChange={v => set('game', v as GameSlug)}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#13151c', border: '1px solid #252836' }}>
                  {GAME_ORDER.map(g => (
                    <SelectItem key={g} value={g} style={{ color: GAME_CONFIG[g].color }}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GAME_CONFIG[g].dotColor }} />
                        {GAME_CONFIG[g].shortName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
              <Select value={form.type} onValueChange={v => set('type', v as EventType)}>
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: '#13151c', border: '1px solid #252836' }}>
                  {TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Confidence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Priorità</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as Priority)}>
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: '#13151c', border: '1px solid #252836' }}>
                  {PRIORITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Stato data</Label>
              <Select value={form.confidence} onValueChange={v => set('confidence', v as Confidence)}>
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: '#13151c', border: '1px solid #252836' }}>
                  {CONFIDENCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Data inizio *</Label>
              <Input
                type="date"
                className={fieldClass}
                value={form.date ?? ''}
                onChange={e => set('date', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Data fine (opzionale)</Label>
              <Input
                type="date"
                className={fieldClass}
                value={form.endDate ?? ''}
                onChange={e => set('endDate', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Descrizione</Label>
            <Textarea
              className={fieldClass}
              placeholder="Breve descrizione dell'evento..."
              rows={2}
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Source URL */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Link fonte</Label>
            <Input
              className={fieldClass}
              placeholder="https://..."
              value={form.sourceUrl ?? ''}
              onChange={e => set('sourceUrl', e.target.value)}
            />
          </div>

          {/* Recurring toggle */}
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ background: '#0d0f16', border: '1px solid #1a1d28' }}
          >
            <Checkbox
              id="recurring"
              checked={recurring}
              onCheckedChange={v => setRecurring(!!v)}
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor="recurring" className="text-sm font-medium cursor-pointer" style={{ color: '#c9d1d9' }}>
              Evento ricorrente
            </label>
          </div>

          {/* Recurring options */}
          {recurring && (
            <div className="grid grid-cols-2 gap-3 pl-1">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Frequenza</Label>
                <Select value={recurringFreq} onValueChange={v => setRecurringFreq(v as typeof recurringFreq)}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#13151c', border: '1px solid #252836' }}>
                    {FREQ_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Ripeti fino a *</Label>
                <Input
                  type="date"
                  className={fieldClass}
                  value={recurringUntil}
                  onChange={e => { setRecurringUntil(e.target.value); setErrors(p => ({ ...p, until: undefined })); }}
                  style={{ colorScheme: 'dark' }}
                />
                {errors.until && <p className="text-xs text-destructive">{errors.until}</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} style={{ color: '#6b7280' }}>
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            style={{ background: '#f97316', color: '#fff', fontWeight: 700 }}
            className="hover:opacity-90"
          >
            {isEdit ? 'Salva modifiche' : 'Aggiungi evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
