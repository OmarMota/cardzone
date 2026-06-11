'use client';

import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Cross2Icon, Pencil1Icon, TrashIcon, Link2Icon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { TCGEvent, Priority, Confidence, EventType } from '@/lib/types';
import { GAME_CONFIG } from '@/lib/gameConfig';

interface Props {
  event: TCGEvent;
  isUpdated: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isUserEvent?: boolean;
}

// ── Static maps ───────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<Priority, string> = {
  must_do: 'Must-Do',
  important: 'Important',
  opportunity: 'Opportunity',
  optional: 'Optional',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  must_do: '#ef4444',
  important: '#f97316',
  opportunity: '#eab308',
  optional: '#6b7280',
};

const TYPE_LABEL: Record<EventType, string> = {
  release: 'Uscita prodotto',
  prerelease: 'Evento prerelease',
  championship: 'Championship',
  regional: 'Torneo regionale',
  popculture: 'Pop Culture / Anniversario',
  accessory: 'Accessorio / Regalo',
  competitive: 'Evento competitivo',
  game_night: 'Serata Store',
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: 'Data confermata',
  expected: 'Data attesa — verifica prima di pubblicare',
  rumored: 'Non confermata — non promuovere ancora',
};

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  confirmed: '#22c55e',
  expected: '#eab308',
  rumored: '#f97316',
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatFullDate(s: string) {
  try { return format(parseISO(s), "EEEE, d MMMM yyyy"); }
  catch { return s; }
}
function formatShort(s: string) {
  try { return format(parseISO(s), 'd MMM'); }
  catch { return s; }
}

// ── Content idea ──────────────────────────────────────────────────────────────

function getIdea(event: TCGEvent): string {
  const g = GAME_CONFIG[event.game].name;

  switch (event.type) {
    case 'release':
      if (event.priority === 'must_do')
        return `Pianifica una serata apertura buste in store il giorno dell'uscita. Apri un box in live su Instagram, filma le reazioni dei clienti e le pull migliori. Nei 3 giorni precedenti pubblica Stories countdown con le carte più attese del set.`;
      return `Post di lancio con le 2–3 carte di punta, data di disponibilità in store e un invito a prenotare i propri pacchetti. Abbina 3 Stories countdown nei giorni precedenti per costruire l'attesa.`;
    case 'prerelease':
      return `Promuovi i kit prerelease disponibili in store e spiega in modo semplice come funziona il formato Sealed (ideale per i nuovi giocatori). Il giorno dell'evento crea Stories in diretta: arrivo, apertura kit, le pull più emozionanti, vincitore finale.`;
    case 'championship':
    case 'regional':
    case 'competitive':
      return `Annuncia l'evento con data, formato e premi. Dopo il torneo: foto del vincitore con il deck, classifica Top 4, highlight della partita decisiva. Stimola rivalità locale e orgoglio di comunità.`;
    case 'popculture':
      return `Sfrutta la ricorrenza per contenuto nostalgico: "le carte più iconiche di ${g}", un trivia o sondaggio sul franchise, o una challenge "mostraci il tuo primo deck". Alta probabilità di condivisioni organiche tra fan.`;
    case 'accessory':
      return `Mostra il prodotto in azione con un breve unboxing. Targetizza esplicitamente come idea regalo: genitori, amici, compagni di scuola. Evidenzia prezzo e disponibilità immediata in store.`;
    case 'game_night':
      return `Serata in store: documenta tutto con Stories in tempo reale. Mostra l'arrivo dei giocatori, le partite più combattute, i deck più creativi e il vincitore della serata. Chiudi con una CTA: "Ci vediamo lunedì prossimo — DM per prenotare il tuo posto."`;
    default:
      return `Comunica l'evento in anticipo con Stories countdown e pubblica un riepilogo con foto il giorno successivo.`;
  }
}

// ── Carousel structure ────────────────────────────────────────────────────────

interface Slide { n: number; label: string; copy: string; }

function getCarousel(event: TCGEvent): Slide[] {
  const t = event.title.replace(/[⚠★]/g, '').trim();
  const g = GAME_CONFIG[event.game].name;

  switch (event.type) {
    case 'release':
      return [
        { n: 1, label: 'Reveal', copy: `"${t} è disponibile" — immagine copertina del set, nome in grande, data uscita` },
        { n: 2, label: 'Carte chiave', copy: 'Le 3 carte più attese: nome + effetto in una riga ciascuna' },
        { n: 3, label: 'Chase rarity', copy: 'Secret rare / alternate art più ricercate — mostra i numeri di rarità' },
        { n: 4, label: 'Come averlo', copy: 'Disponibile in store da [data] — formati (singole buste, box, elite trainer box)' },
        { n: 5, label: 'Call to action', copy: '"Prenota il tuo box — quantità limitata" con orari store e link in bio' },
      ];
    case 'prerelease':
      return [
        { n: 1, label: 'Annuncio', copy: `Prerelease ${t} — data, orario, location` },
        { n: 2, label: 'Kit prerelease', copy: 'Contenuto del kit: buste, promo card esclusiva, sleeves store' },
        { n: 3, label: 'Come funziona', copy: 'Formato Sealed in 3 punti — scritto semplice per chi non lo conosce' },
        { n: 4, label: 'Iscrizione', copy: '"Posti limitati — prenota via DM o al link in bio" con deadline' },
      ];
    case 'championship':
    case 'regional':
    case 'competitive':
      return [
        { n: 1, label: 'Evento', copy: `${t} — data, sede, gioco` },
        { n: 2, label: 'Premi', copy: 'Top 8 premi dettagliati, promo partecipazione, eventuale trofeo' },
        { n: 3, label: 'Regolamento', copy: 'Formato, deck list, orario check-in, max partecipanti' },
        { n: 4, label: 'Iscrizione', copy: '"Iscriviti entro [data] — link in bio o DM diretto"' },
      ];
    case 'popculture':
      return [
        { n: 1, label: 'La ricorrenza', copy: `Anniversario ${g} — titolo evocativo, anno di fondazione` },
        { n: 2, label: 'Momento 1', copy: 'Primo momento iconico del franchise — immagine + didascalia breve' },
        { n: 3, label: 'Momento 2', copy: 'Secondo momento iconico — carta o prodotto storico' },
        { n: 4, label: 'Momento 3', copy: 'Il tuo negozio nella storia: "siamo con voi da X anni"' },
        { n: 5, label: 'Join', copy: '"Festeggia con noi — evento speciale in store [data]"' },
      ];
    case 'accessory':
      return [
        { n: 1, label: 'Reveal prodotto', copy: `${t} — foto flat-lay + prezzo` },
        { n: 2, label: 'Contenuto', copy: 'Cosa include: carta promo, quante carte, sleeves, accessori' },
        { n: 3, label: 'Per chi è', copy: 'Ideale per: collezionisti / regalo di compleanno / fan del personaggio' },
        { n: 4, label: 'Disponibile', copy: '"In store da [data] — quantità limitata, contattaci per prenotare"' },
      ];
    case 'game_night':
      return [
        { n: 1, label: 'Annuncio serata', copy: `Serata ${g} in store — lunedì [data], ore [orario]` },
        { n: 2, label: 'Chi può venire', copy: 'Aperto a tutti i livelli — porta il tuo mazzo o usane uno in prestito' },
        { n: 3, label: 'Programma', copy: 'Partite libere → torneo interno → premi serata (booster o store credit)' },
        { n: 4, label: 'Prenota', copy: '"Posti limitati — DM per confermare la tua presenza"' },
      ];
    default:
      return [
        { n: 1, label: 'Annuncio', copy: `${t} — data e location` },
        { n: 2, label: 'Dettagli', copy: 'Cosa, dove, quando, come partecipare' },
        { n: 3, label: 'CTA', copy: '"Vieni a trovarci in store — link in bio"' },
      ];
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function EventModal({ event, isUpdated, onClose, onEdit, onDelete, isUserEvent }: Props) {
  const game = GAME_CONFIG[event.game];
  const overlayRef = useRef<HTMLDivElement>(null);
  const idea = getIdea(event);
  const slides = getCarousel(event);
  const isGameNight = event.type === 'game_night';

  const accentColor = isGameNight ? '#818cf8' : game.dotColor;
  const accentBg = isGameNight ? 'rgba(99,102,241,0.12)' : game.bgColor;
  const accentBorder = isGameNight ? 'rgba(99,102,241,0.35)' : game.borderColor;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const domain = event.sourceUrl
    ? event.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]
    : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-[500px] modal-slide-up flex flex-col"
        style={{
          background: '#111318',
          border: '1px solid #1e2235',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.85)',
          maxHeight: '88vh',
          overflow: 'hidden',
        }}
      >
        {/* Colour bar */}
        <div style={{ height: 3, background: isUpdated ? '#f97316' : accentColor, flexShrink: 0, borderRadius: '20px 20px 0 0' }} />

        {/* Header */}
        <div
          className="flex items-start gap-4 px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #1c1f2b' }}
        >
          {/* Icon dot */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
            style={{ background: isUpdated ? 'rgba(249,115,22,0.15)' : accentBg, border: `1.5px solid ${isUpdated ? '#f97316' : accentBorder}` }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: isUpdated ? '#f97316' : accentColor }} />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold leading-snug" style={{ color: '#eef0f6', letterSpacing: '-0.01em' }}>
              {event.title.replace(/[⚠★]/g, '').trim()}
            </h2>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[12px] font-semibold" style={{ color: accentColor }}>{game.shortName}</span>
              <span style={{ color: '#2d3040', fontSize: 12 }}>·</span>
              <span className="text-[12px]" style={{ color: '#4b5563' }}>{TYPE_LABEL[event.type]}</span>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-accent"
            style={{ color: '#4b5563' }}
          >
            <Cross2Icon width={12} height={12} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>

          {/* Date + badges */}
          <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #1c1f2b' }}>
            <p className="text-[13px] font-semibold mb-3.5 capitalize" style={{ color: '#9ca3af' }}>
              {formatFullDate(event.date)}
              {event.endDate && <span style={{ color: '#374151' }}> — {formatShort(event.endDate)}</span>}
            </p>

            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-md"
                style={{ color: PRIORITY_COLOR[event.priority], background: `${PRIORITY_COLOR[event.priority]}15`, border: `1px solid ${PRIORITY_COLOR[event.priority]}30` }}
              >
                {PRIORITY_LABEL[event.priority]}
              </span>

              {event.isMajor && (
                <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)' }}>
                  ★ Top 10
                </span>
              )}

              {isUpdated && (
                <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.28)' }}>
                  Aggiornato
                </span>
              )}

              <span
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md"
                style={{ color: CONFIDENCE_COLOR[event.confidence], background: `${CONFIDENCE_COLOR[event.confidence]}12`, border: `1px solid ${CONFIDENCE_COLOR[event.confidence]}28` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CONFIDENCE_COLOR[event.confidence] }} />
                {CONFIDENCE_LABEL[event.confidence]}
              </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #1c1f2b' }}>
              <p className="text-[13px] leading-relaxed" style={{ color: '#6b7280', lineHeight: 1.7 }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Content idea */}
          <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #1c1f2b' }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3 font-heading" style={{ color: '#374151' }}>
              Idea contenuto
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: '#9ca3af', lineHeight: 1.7 }}>
              {idea}
            </p>
          </div>

          {/* Carousel structure */}
          <div
            className="px-6 pt-5 pb-5"
            style={{ borderBottom: (isUserEvent || event.sourceUrl) ? '1px solid #1c1f2b' : 'none' }}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3.5 font-heading" style={{ color: '#374151' }}>
              Struttura carosello
            </p>

            <div className="flex flex-col gap-2">
              {slides.map((s) => (
                <div
                  key={s.n}
                  className="flex items-start gap-3 rounded-lg px-4 py-3"
                  style={{ background: '#0d0f16', border: '1px solid #1a1d28' }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}
                  >
                    {s.n}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-semibold" style={{ color: '#c9d1d9' }}>{s.label}</span>
                    <span className="text-[12px]" style={{ color: '#374151' }}> — </span>
                    <span className="text-[12px]" style={{ color: '#6b7280' }}>{s.copy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit / Delete — user events */}
          {isUserEvent && (
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: event.sourceUrl ? '1px solid #1c1f2b' : 'none' }}>
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: '#1a1d28', color: '#c9d1d9', border: '1px solid #252836' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#252836')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1a1d28')}
              >
                <Pencil1Icon width={13} height={13} />
                Modifica
              </button>
              <button
                onClick={() => { if (confirm('Eliminare questo evento?')) { onDelete?.(); onClose(); } }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
              >
                <TrashIcon width={13} height={13} />
                Elimina
              </button>
            </div>
          )}

          {/* Source link */}
          {event.sourceUrl && (
            <div className="px-6 py-4">
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3"
                style={{ textDecoration: 'none' }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                >
                  <Link2Icon width={14} height={14} />
                </span>
                <span>
                  <span className="text-[13px] font-medium flex items-center gap-1.5 group-hover:underline" style={{ color: '#60a5fa' }}>
                    Fonte ufficiale
                    <ExternalLinkIcon width={11} height={11} />
                  </span>
                  <span className="text-[11px] block mt-0.5" style={{ color: '#374151' }}>{domain}</span>
                </span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
