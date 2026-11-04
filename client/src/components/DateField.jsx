import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconCalendar } from './icons.jsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (value) => String(value).padStart(2, '0');

function fromISO(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toISO({ y, m, d }) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function DateField({
  id,
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  required = false,
}) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(() => fromISO(value));
  const [position, setPosition] = useState({ right: false, up: false });

  const wrapperRef = useRef(null);
  const calendarRef = useRef(null);

  const openCalendar = useCallback(() => {
    const parsed = fromISO(value);
    setSelected(parsed);
    setView(parsed ? { y: parsed.y, m: parsed.m } : { y: today.getFullYear(), m: today.getMonth() });
    setOpen(true);
  }, [value, today]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Keep the popover inside the viewport.
  useLayoutEffect(() => {
    if (!open || !calendarRef.current) return;
    const rect = calendarRef.current.getBoundingClientRect();
    const buffer = 12;
    setPosition({
      right: rect.right > window.innerWidth - buffer,
      up: rect.bottom > window.innerHeight - buffer,
    });
  }, [open, view]);

  const changeMonth = (delta) => {
    setView((current) => {
      const next = new Date(current.y, current.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const confirm = () => {
    onChange(selected ? toISO(selected) : '');
    setOpen(false);
  };

  const clear = () => {
    setSelected(null);
    onChange('');
    setOpen(false);
  };

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="date-picker-wrapper" ref={wrapperRef}>
        <input
          id={id}
          type="text"
          className={`date-display${error ? ' input-invalid' : ''}`}
          value={value || ''}
          placeholder={placeholder}
          readOnly
          onClick={() => (open ? setOpen(false) : openCalendar())}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              open ? setOpen(false) : openCalendar();
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="cal-icon" aria-hidden="true">
          <IconCalendar width={15} height={15} />
        </span>

        {open && (
          <div
            className={[
              'custom-calendar',
              'open',
              position.right ? 'align-right' : '',
              position.up ? 'drop-up' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            ref={calendarRef}
          >
            <div className="cal-header">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                ‹
              </button>
              <span className="cal-title">
                {MONTHS[view.m]} {view.y}
              </span>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                ›
              </button>
            </div>

            <div className="cal-days-header" aria-hidden="true">
              {DAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="cal-grid">
              {Array.from({ length: firstWeekday }, (_, index) => (
                <div className="cal-day empty" key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const isToday =
                  day === today.getDate() &&
                  view.m === today.getMonth() &&
                  view.y === today.getFullYear();
                const isSelected =
                  selected && day === selected.d && view.m === selected.m && view.y === selected.y;

                return (
                  <button
                    type="button"
                    key={day}
                    className={['cal-day', isToday ? 'today' : '', isSelected ? 'selected' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelected({ y: view.y, m: view.m, d: day })}
                    aria-label={`${day} ${MONTHS[view.m]} ${view.y}`}
                    aria-pressed={Boolean(isSelected)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="cal-actions">
              <button type="button" className="clear-btn" onClick={clear}>
                Clear
              </button>
              <button type="button" className="confirm" onClick={confirm}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <span className="error-text" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
