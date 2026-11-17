"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { addDays, clinicDateOf, formatLongDate, isoWeekday, monthRange } from "@/lib/clinic-time";
import { Button } from "./button";
import { cn } from "./cn";
import { Field } from "./field";
import { Icon } from "./icon";
import { Modal } from "./modal";
import { Select } from "./select";

const DAYS_IN_WEEK = 7;
const YEAR_RANGE = 100;
const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(new Date().getUTCFullYear(), index, 1)),
  ),
);
const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const SHORT_WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type DatePickerProps = {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  label?: string;
  triggerClassName?: string;
  variant?: "button" | "inline";
};

const monthOf = (date: string) => `${date.slice(0, 7)}-01`;
const displayDate = (date: string) => date.split("-").reverse().join("/");

function parseDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  const instant = new Date(`${date}T12:00:00Z`);
  return Number(match[3]) > 0 &&
    !Number.isNaN(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === date
    ? date
    : null;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  label = "Ir a fecha",
  triggerClassName,
  variant = "button",
}: DatePickerProps) {
  const isInline = variant === "inline";
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value));
  const [focusedDate, setFocusedDate] = useState(value);
  const [text, setText] = useState(displayDate(value));
  const [error, setError] = useState<string>();
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusDay = useRef(false);
  const today = clinicDateOf(new Date());
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const { to } = monthRange(month);
  const previousMonth = monthOf(addDays(month, -1));
  const nextMonth = addDays(to, 1);
  const firstYear = Math.max(1, min ? Number(min.slice(0, 4)) : year - YEAR_RANGE);
  const lastYear = Math.min(9999, max ? Number(max.slice(0, 4)) : year + YEAR_RANGE);
  const firstCell = isoWeekday(month) - 1;
  const cellCount = Math.ceil((firstCell + Number(to.slice(8))) / DAYS_IN_WEEK) * DAYS_IN_WEEK;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstCell + 1;
    return day > 0 && day <= Number(to.slice(8))
      ? `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`
      : null;
  });

  useEffect(() => {
    if ((!isInline && !open) || !focusDay.current) return;
    const frame = requestAnimationFrame(() => {
      dayRefs.current.get(focusedDate)?.focus();
      focusDay.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [isInline, open, focusedDate, month]);

  function allowed(date: string) {
    return (!min || date >= min) && (!max || date <= max);
  }

  function showMonth(next: string) {
    const first = min && next < min && monthOf(min) === next ? min : next;
    if ((max && next > max) || (min && monthRange(next).to < min)) return;
    setMonth(next);
    setFocusedDate(first);
  }

  function choose(date: string) {
    if (!allowed(date)) return;
    setFocusedDate(date);
    onChange(date);
    if (!isInline) setOpen(false);
  }

  function submitText() {
    const date = parseDate(text);
    if (!date) return setError("Escribe una fecha válida con formato DD/MM/AAAA.");
    if (!allowed(date)) return setError("Elige una fecha dentro del plazo para agendar.");
    choose(date);
  }

  function handleDayKey(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    let next: string;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(date, -1);
        break;
      case "ArrowRight":
        next = addDays(date, 1);
        break;
      case "ArrowUp":
        next = addDays(date, -DAYS_IN_WEEK);
        break;
      case "ArrowDown":
        next = addDays(date, DAYS_IN_WEEK);
        break;
      case "Home":
        next = addDays(date, 1 - isoWeekday(date));
        break;
      case "End":
        next = addDays(date, DAYS_IN_WEEK - isoWeekday(date));
        break;
      case "PageUp":
        next = previousMonth;
        break;
      case "PageDown":
        next = nextMonth;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    if (!allowed(next)) return;
    focusDay.current = true;
    setMonth(monthOf(next));
    setFocusedDate(next);
  }

  function openCalendar() {
    setMonth(monthOf(value));
    setFocusedDate(value);
    setText(displayDate(value));
    setError(undefined);
    focusDay.current = true;
    setOpen(true);
  }

  const previousButton = (
    <Button
      variant="secondary"
      className="min-w-11 px-2!"
      aria-label="Mes anterior"
      disabled={!!min && monthRange(previousMonth).to < min}
      onClick={() => showMonth(previousMonth)}
    >
      <Icon name="chevron-right" className="size-5 rotate-180" />
    </Button>
  );
  const nextButton = (
    <Button
      variant="secondary"
      className="min-w-11 px-2!"
      aria-label="Mes siguiente"
      disabled={!!max && nextMonth > max}
      onClick={() => showMonth(nextMonth)}
    >
      <Icon name="chevron-right" className="size-5" />
    </Button>
  );

  const calendar = (
    <>
      {!isInline && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Mes"
            value={monthIndex}
            onChange={(event) =>
              showMonth(
                `${String(year).padStart(4, "0")}-${String(Number(event.target.value) + 1).padStart(2, "0")}-01`,
              )
            }
          >
            {MONTHS.map((name, index) => (
              <option
                key={name}
                value={index}
                disabled={
                  (!!min && `${year}-${String(index + 1).padStart(2, "0")}` < min.slice(0, 7)) ||
                  (!!max && `${year}-${String(index + 1).padStart(2, "0")}` > max.slice(0, 7))
                }
              >
                {name}
              </option>
            ))}
          </Select>
          <Select
            label="Año"
            value={year}
            onChange={(event) => {
              let next = `${event.target.value}-${month.slice(5)}`;
              if (min && monthRange(next).to < min) next = monthOf(min);
              if (max && next > max) next = monthOf(max);
              showMonth(next);
            }}
          >
            {Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ),
            )}
          </Select>
        </div>
      )}
      {isInline && (
        <div className="flex items-center justify-between gap-2">
          {previousButton}
          <p aria-live="polite" className="text-center text-sm font-semibold text-ink">
            {MONTHS[monthIndex]} de {year}
          </p>
          {nextButton}
        </div>
      )}
      <table
        role="grid"
        aria-label={`${MONTHS[monthIndex]} de ${year}`}
        className="w-full table-fixed text-center text-sm"
      >
        <thead>
          <tr>
            {WEEKDAYS.map((name, index) => (
              <th
                key={name}
                scope="col"
                abbr={name}
                className={cn("font-medium text-subtle", isInline ? "pb-2" : "pb-1")}
              >
                {SHORT_WEEKDAYS[index]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cellCount / DAYS_IN_WEEK }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * DAYS_IN_WEEK, (row + 1) * DAYS_IN_WEEK).map((date, index) => (
                <td
                  key={date ?? `empty-${index}`}
                  aria-selected={date ? date === value : undefined}
                  className={isInline ? "p-0.5" : "px-0.5 py-0"}
                >
                  {date && (
                    <button
                      ref={(node) => {
                        if (node) dayRefs.current.set(date, node);
                        else dayRefs.current.delete(date);
                      }}
                      type="button"
                      disabled={!allowed(date)}
                      tabIndex={date === focusedDate ? 0 : -1}
                      aria-label={formatLongDate(date)}
                      aria-current={date === today ? "date" : undefined}
                      onKeyDown={(event) => handleDayKey(event, date)}
                      onClick={() => choose(date)}
                      className={cn(
                        "min-h-11",
                        "w-full rounded-control font-medium disabled:cursor-not-allowed disabled:text-subtle disabled:opacity-40",
                        date === value ? "bg-brand-600 text-white" : "text-ink hover:bg-brand-50",
                        date === today && date !== value && "ring-1 ring-inset ring-brand-600",
                      )}
                    >
                      {Number(date.slice(8))}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!isInline && (
        <div className="flex items-start gap-3 border-t border-divider pt-2">
          <div className="min-w-0 flex-1">
            <Field
              label="Fecha (DD/MM/AAAA)"
              placeholder="DD/MM/AAAA"
              inputMode="numeric"
              maxLength={10}
              value={text}
              error={error}
              onChange={(event) => {
                setText(event.target.value);
                setError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitText();
                }
              }}
            />
          </div>
          <Button className="mt-6" onClick={submitText}>
            Ir
          </Button>
        </div>
      )}
    </>
  );
  return isInline ? (
    <div className="min-w-0">
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      <div
        role="group"
        aria-label="Calendario para agendar"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-soft"
      >
        {calendar}
      </div>
    </div>
  ) : (
    <>
      <Button
        variant="secondary"
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-label={label + ", " + formatLongDate(value)}
        onClick={openCalendar}
      >
        <Icon name="calendar" className="size-5" />
        {label}
      </Button>
      <Modal
        open={open}
        title="Elegir fecha"
        onClose={() => setOpen(false)}
        compact
        headerActions={
          <>
            {previousButton}
            {nextButton}
          </>
        }
      >
        {calendar}
      </Modal>
    </>
  );
}
