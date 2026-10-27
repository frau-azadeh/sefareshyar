"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

/* ---------------- مدل داده ---------------- */

const STORAGE_KEY = "sefareshyar.orders.v1";

const STATUSES = [
  "تکمیل اطلاعات",
  "منتظر پرداخت",
  "آماده‌سازی",
  "آماده ارسال",
  "ارسال‌شده",
  "لغوشده",
] as const;

type Status = (typeof STATUSES)[number];

type Filter =
  | "همه"
  | "باز"
  | "امروز"
  | "عقب‌افتاده"
  | "اطلاعات ناقص"
  | Status;

type Order = {
  id: string;
  customer: string;
  instagram: string;
  product: string;
  quantity: number;
  amount: number;
  address: string;
  dueDate: string;
  status: Status;
  createdAt: string;
  trackingCode?: string;
  paid?: boolean;
  notes?: string;
};

type OrderForm = {
  customer: string;
  instagram: string;
  product: string;
  quantity: string;
  amount: string;
  address: string;
  dueDate: string;
  status: Status;
  trackingCode: string;
  paid: boolean;
  notes: string;
};

type Confirmation =
  | { kind: "delete"; order: Order }
  | { kind: "status"; orderId: string; status: Status }
  | { kind: "save"; order: Order; editing: boolean }
  | { kind: "import"; orders: Order[] };

const BADGES: Record<Status, string> = {
  "تکمیل اطلاعات": "bg-orange-50 text-orange-700",
  "منتظر پرداخت": "bg-amber-50 text-amber-800",
  "آماده‌سازی": "bg-blue-50 text-blue-700",
  "آماده ارسال": "bg-violet-50 text-violet-700",
  "ارسال‌شده": "bg-teal-50 text-teal-700",
  "لغوشده": "bg-slate-100 text-slate-500",
};

/* ---------------- ابزارها ---------------- */

function faNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function englishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    );
}

function dateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

function faDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function newId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isActive(order: Order) {
  return order.status !== "ارسال‌شده" && order.status !== "لغوشده";
}

function missingFields(order: Order) {
  return [
    !order.instagram.trim() ? "آیدی مشتری" : "",
    !order.address.trim() ? "آدرس ارسال" : "",
  ].filter(Boolean);
}

function nextAction(order: Order) {
  if (order.status === "لغوشده") {
    return "در صورت وجود پرداخت، تسویه را با مشتری هماهنگ کن.";
  }

  if (order.status === "ارسال‌شده") {
    return order.trackingCode
      ? "کد رهگیری را برای مشتری بفرست."
      : "اطلاعات رهگیری را در بخش ویرایش اضافه کن.";
  }

  const missing = missingFields(order);

  if (missing.length) {
    return `${missing.join(" و ")} را کامل کن.`;
  }

  if (!order.paid) {
    return "واریز را بررسی و دریافت وجه را تأیید کن.";
  }

  if (order.status === "آماده ارسال") {
    return "بسته را تحویل پست یا پیک بده و ارسال را ثبت کن.";
  }

  return "محصول را آماده و مشخصات سفارش را بررسی کن.";
}

function emptyForm(): OrderForm {
  return {
    customer: "",
    instagram: "",
    product: "",
    quantity: "1",
    amount: "",
    address: "",
    dueDate: dateKey(),
    status: "منتظر پرداخت",
    trackingCode: "",
    paid: false,
    notes: "",
  };
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.customer === "string" &&
    item.customer.trim().length > 0 &&
    typeof item.instagram === "string" &&
    typeof item.product === "string" &&
    item.product.trim().length > 0 &&
    typeof item.quantity === "number" &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount >= 0 &&
    typeof item.address === "string" &&
    typeof item.dueDate === "string" &&
    validDate(item.dueDate) &&
    typeof item.status === "string" &&
    STATUSES.includes(item.status as Status) &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt)) &&
    (item.trackingCode === undefined ||
      typeof item.trackingCode === "string") &&
    (item.paid === undefined || typeof item.paid === "boolean") &&
    (item.notes === undefined || typeof item.notes === "string")
  );
}

function parseOrders(value: unknown): Order[] {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "orders" in value
      ? (value as { orders: unknown }).orders
      : null;

  if (!Array.isArray(items) || !items.every(isOrder)) {
    throw new Error("Invalid orders");
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("Duplicate identifiers");
  }

  return items;
}

function workflowError(order: Order) {
  if (
    ["آماده‌سازی", "آماده ارسال", "ارسال‌شده"].includes(order.status)
  ) {
    const missing = missingFields(order);

    if (missing.length) {
      return `ابتدا ${missing.join(" و ")} را کامل کن.`;
    }

    if (!order.paid) {
      return "ابتدا دریافت وجه را بررسی و تأیید کن.";
    }
  }

  if (order.status === "منتظر پرداخت" && order.paid) {
    return "پرداخت تأیید شده؛ وضعیت سفارش را به مرحلهٔ بعد تغییر بده.";
  }

  return "";
}

function makeMessage(order: Order) {
  const head =
    `سلام ${order.customer} عزیز 🌷\n` +
    `سفارش: ${order.product}\n` +
    `تعداد: ${faNumber(order.quantity)}\n\n`;

  if (order.status === "لغوشده") {
    return (
      head +
      "این سفارش لغو شده است. برای هماهنگی دربارهٔ پرداخت احتمالی، در همین گفتگو پیام بدهید."
    );
  }

  if (order.status === "ارسال‌شده") {
    return (
      head +
      "سفارش شما ارسال شده است.\n" +
      (order.trackingCode
        ? `کد رهگیری: ${order.trackingCode}`
        : "اطلاعات رهگیری را پس از بررسی برایتان می‌فرستیم.")
    );
  }

  const missing = missingFields(order);

  if (missing.length) {
    return (
      head +
      `برای تکمیل سفارش، لطفاً ${missing.join(" و ")} را ارسال کنید.`
    );
  }

  if (!order.paid) {
    return (
      head +
      `مبلغ توافقی: ${faNumber(order.amount)} تومان\n` +
      "اگر پرداخت کرده‌اید، زمان واریز و رسید را برای بررسی بفرستید. تأیید پرداخت را اطلاع می‌دهیم."
    );
  }

  if (order.status === "آماده ارسال") {
    return head + "سفارش شما آمادهٔ ارسال است.";
  }

  return (
    head +
    "سفارش شما در حال آماده‌سازی است.\n" +
    `موعد ثبت‌شده برای ارسال: ${faDate(order.dueDate)}\n` +
    "در صورت تغییر زمان، اطلاع می‌دهیم."
  );
}

function demoOrders(): Order[] {
  const base = {
    createdAt: new Date().toISOString(),
    quantity: 1,
    notes: "اطلاعات ساختگی برای نمایش برنامه",
    trackingCode: "",
  };

  return [
    {
      ...base,
      id: newId(),
      customer: "سارا نمونه",
      instagram: "@sara_demo",
      product: "شمع سویا، رایحهٔ دارچین",
      quantity: 2,
      amount: 520000,
      address: "آدرس آزمایشی در تهران",
      dueDate: dateKey(),
      status: "آماده ارسال",
      paid: true,
    },
    {
      ...base,
      id: newId(),
      customer: "مریم نمونه",
      instagram: "@maryam_demo",
      product: "ست سه‌تایی صابون",
      amount: 320000,
      address: "آدرس آزمایشی در کرج",
      dueDate: dateKey(-2),
      status: "آماده‌سازی",
      paid: true,
    },
    {
      ...base,
      id: newId(),
      customer: "ندا نمونه",
      instagram: "",
      product: "شمع وانیلی هدیه",
      amount: 420000,
      address: "",
      dueDate: dateKey(2),
      status: "تکمیل اطلاعات",
      paid: false,
    },
    {
      ...base,
      id: newId(),
      customer: "لیلا نمونه",
      instagram: "@leila_demo",
      product: "صابون جو دوسر",
      quantity: 3,
      amount: 360000,
      address: "آدرس آزمایشی در شیراز",
      dueDate: dateKey(3),
      status: "منتظر پرداخت",
      paid: false,
    },
    {
      ...base,
      id: newId(),
      customer: "رها نمونه",
      instagram: "@raha_demo",
      product: "باکس هدیهٔ شمع",
      amount: 680000,
      address: "آدرس آزمایشی در اصفهان",
      dueDate: dateKey(-3),
      status: "ارسال‌شده",
      paid: true,
      trackingCode: "123456789012345678901234",
    },
  ];
}

/* ---------------- اجزای رابط ---------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">
        {label}
      </p>
      {children}
      {hint && (
        <p className="mt-1.5 text-[10px] leading-6 text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      const first = items[0];
      const last = items[items.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="modal-scroll enter w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl outline-none sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-xs leading-7 text-slate-500">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            aria-label="بستن پنجره"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ConfirmToast({
  title,
  description,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  danger: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    return () => {
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed bottom-5 left-4 right-4 z-[80] mx-auto max-w-md">
      <div
        ref={panelRef}
        role="alertdialog"
        aria-labelledby="confirm-toast-title"
        aria-describedby="confirm-toast-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }

          if (event.key === "Tab") {
            const buttons =
              panelRef.current?.querySelectorAll<HTMLButtonElement>(
                "button",
              );

            if (!buttons?.length) return;

            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === last
            ) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        className={`enter rounded-2xl border bg-white p-5 shadow-[0_12px_60px_rgba(15,23,42,0.22)] ${
          danger ? "border-red-100" : "border-teal-100"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${
              danger
                ? "bg-red-50 text-red-600"
                : "bg-teal-50 text-teal-700"
            }`}
          >
            {danger ? "!" : "✓"}
          </div>

          <div className="min-w-0 flex-1">
            <p
              id="confirm-toast-title"
              className="text-sm font-bold text-slate-800"
            >
              {title}
            </p>

            <p
              id="confirm-toast-description"
              className="mt-2 break-words text-xs leading-7 text-slate-500"
            >
              {description}
            </p>
          </div>

          <button
            type="button"
            aria-label="بستن تأیید"
            onClick={onCancel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`btn text-white ${
              danger
                ? "border border-red-600 bg-red-600 hover:bg-red-700"
                : "btn-primary"
            }`}
          >
            {danger ? "تأیید و ادامه" : "تأیید"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- صفحه اصلی ---------------- */

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [today, setToday] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("همه");
  const [sort, setSort] = useState("newest");

  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState<OrderForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<Confirmation | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const closeOrderModal = useCallback(() => {
    setForm(null);
  }, []);

  const closeMessageModal = useCallback(() => {
    setMessage(null);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToday(dateKey());

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setOrders(parseOrders(JSON.parse(saved)));
      } catch {
        setBlocked(true);
        setStorageError(
          "اطلاعات قبلی قابل خواندن نیست. برای جلوگیری از بازنویسی، تغییرات متوقف شده است. یک پشتیبان معتبر وارد کن.",
        );
      } finally {
        setReady(true);
      }
    }, 0);

    const interval = window.setInterval(() => {
      setToday(dateKey());
    }, 60000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function persist(next: Order[], recovery = false) {
    if (blocked && !recovery) return false;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setOrders(next);
      setBlocked(false);
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "ذخیره انجام نشد. فضای مرورگر یا مجوز ذخیره‌سازی را بررسی کن؛ تغییر جدید اعمال نشد.",
      );
      setNotice("ذخیره انجام نشد؛ تغییر جدید اعمال نشد.");
      return false;
    }
  }

  function askConfirmation(value: Confirmation) {
    setNotice("");
    setConfirmation(value);
  }

  function openNew() {
    setEditingId(null);
    setFormError("");
    setForm(emptyForm());
  }

  function openEdit(order: Order) {
    setEditingId(order.id);
    setFormError("");

    setForm({
      customer: order.customer,
      instagram: order.instagram,
      product: order.product,
      quantity: String(order.quantity),
      amount: String(order.amount),
      address: order.address,
      dueDate: order.dueDate,
      status: order.status,
      paid: order.paid ?? false,
      trackingCode: order.trackingCode ?? "",
      notes: order.notes ?? "",
    });
  }

  function updateForm<K extends keyof OrderForm>(
    key: K,
    value: OrderForm[K],
  ) {
    setForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function commitOrder(order: Order, editing: boolean) {
    if (editing && !orders.some((item) => item.id === order.id)) {
      setNotice("این سفارش دیگر وجود ندارد.");
      return;
    }

    const next = editing
      ? orders.map((item) => (item.id === order.id ? order : item))
      : [order, ...orders];

    if (persist(next)) {
      closeOrderModal();
      setNotice(editing ? "تغییرات ذخیره شد." : "سفارش جدید ثبت شد.");
    }
  }

  function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || blocked || confirmation) return;

    const quantity = Number(englishDigits(form.quantity.trim()));
    const amountText = englishDigits(form.amount).replace(/[,٬\s]/g, "");
    const amount = Number(amountText);

    if (!form.customer.trim() || !form.product.trim()) {
      setFormError("نام مشتری و مشخصات محصول را وارد کن.");
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setFormError("تعداد باید عدد صحیح بیشتر از صفر باشد.");
      return;
    }

    if (!amountText || !Number.isSafeInteger(amount) || amount < 0) {
      setFormError("مبلغ کل را به تومان و بدون اعشار وارد کن.");
      return;
    }

    if (!validDate(form.dueDate)) {
      setFormError("موعد ارسال معتبر انتخاب کن.");
      return;
    }

    const existing = orders.find((item) => item.id === editingId);

    const order: Order = {
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      customer: form.customer.trim(),
      instagram: form.instagram.trim(),
      product: form.product.trim(),
      quantity,
      amount,
      address: form.address.trim(),
      dueDate: form.dueDate,
      status: form.status,
      paid: form.paid,
      trackingCode: englishDigits(form.trackingCode.trim()),
      notes: form.notes.trim(),
    };

    if (
      missingFields(order).length &&
      ["تکمیل اطلاعات", "منتظر پرداخت"].includes(order.status)
    ) {
      order.status = "تکمیل اطلاعات";
    }

    const error = workflowError(order);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");

    const needsConfirmation =
      (order.status === "ارسال‌شده" &&
        existing?.status !== "ارسال‌شده") ||
      (order.status === "لغوشده" &&
        existing?.status !== "لغوشده");

    if (needsConfirmation) {
      askConfirmation({
        kind: "save",
        order,
        editing: Boolean(existing),
      });
      return;
    }

    commitOrder(order, Boolean(existing));
  }

  function changeStatus(order: Order, status: Status) {
    if (status === order.status) return;

    const updated = { ...order, status };
    const error = workflowError(updated);

    if (error) {
      setNotice(error);
      openEdit(order);
      return;
    }

    if (status === "ارسال‌شده" || status === "لغوشده") {
      askConfirmation({
        kind: "status",
        orderId: order.id,
        status,
      });
      return;
    }

    if (
      persist(
        orders.map((item) => (item.id === order.id ? updated : item)),
      )
    ) {
      setNotice("وضعیت سفارش ذخیره شد.");
    }
  }

  function confirmAction() {
    if (!confirmation) return;

    const action = confirmation;
    setConfirmation(null);

    if (action.kind === "delete") {
      if (
        persist(
          orders.filter((item) => item.id !== action.order.id),
        )
      ) {
        setNotice("سفارش حذف شد.");
      }
      return;
    }

    if (action.kind === "status") {
      const existing = orders.find(
        (item) => item.id === action.orderId,
      );

      if (!existing) {
        setNotice("این سفارش دیگر وجود ندارد.");
        return;
      }

      const updated = { ...existing, status: action.status };
      const error = workflowError(updated);

      if (error) {
        setNotice(error);
        return;
      }

      if (
        persist(
          orders.map((item) =>
            item.id === existing.id ? updated : item,
          ),
        )
      ) {
        setNotice("وضعیت سفارش ذخیره شد.");
      }
      return;
    }

    if (action.kind === "save") {
      commitOrder(action.order, action.editing);
      return;
    }

    if (action.kind === "import") {
      if (persist(action.orders, true)) {
        setFilter("همه");
        setSearch("");
        setNotice("پشتیبان وارد شد.");
      }
    }
  }

  function exportOrders() {
    const data = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        orders,
      },
      null,
      2,
    );

    const blob = new Blob([data], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sefareshyar-${dateKey()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    setNotice(
      "پشتیبان دانلود شد؛ فایل ممکن است شامل اطلاعات مشتریان باشد.",
    );
  }

  async function importOrders(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotice("حجم فایل باید کمتر از ۵ مگابایت باشد.");
      return;
    }

    try {
      const incoming = parseOrders(JSON.parse(await file.text()));
      askConfirmation({ kind: "import", orders: incoming });
    } catch {
      setNotice("فایل معتبر نیست؛ اطلاعات فعلی تغییر نکرد.");
    }
  }

  async function copyMessage() {
    if (message === null) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(message);
      setNotice("متن کپی شد؛ پیش از ارسال آن را بررسی کن.");
    } catch {
      messageRef.current?.focus();
      messageRef.current?.select();
      setNotice("متن انتخاب شد؛ برای کپی Ctrl+C بزن.");
    }
  }

  const activeOrders = orders.filter(isActive);

  const dueToday = activeOrders.filter(
    (order) => order.dueDate === today,
  );

  const overdue = activeOrders.filter(
    (order) => Boolean(today) && order.dueDate < today,
  );

  const incomplete = activeOrders.filter(
    (order) => missingFields(order).length > 0,
  );

  const unpaid = activeOrders.filter((order) => !order.paid);

  const urgent = [...overdue, ...dueToday]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const visible = orders
    .filter((order) => {
      const query = search.trim().toLocaleLowerCase();

      const haystack =
        `${order.customer} ${order.instagram} ${order.product} ${order.trackingCode ?? ""}`
          .toLocaleLowerCase();

      if (!haystack.includes(query)) return false;

      if (filter === "همه") return true;
      if (filter === "باز") return isActive(order);

      if (filter === "امروز") {
        return isActive(order) && order.dueDate === today;
      }

      if (filter === "عقب‌افتاده") {
        return (
          isActive(order) &&
          Boolean(today) &&
          order.dueDate < today
        );
      }

      if (filter === "اطلاعات ناقص") {
        return isActive(order) && missingFields(order).length > 0;
      }

      return order.status === filter;
    })
    .sort((a, b) =>
      sort === "due"
        ? a.dueDate.localeCompare(b.dueDate)
        : b.createdAt.localeCompare(a.createdAt),
    );

  const tabs: Filter[] = [
    "همه",
    "باز",
    "امروز",
    "عقب‌افتاده",
    "اطلاعات ناقص",
    "منتظر پرداخت",
    "آماده‌سازی",
    "آماده ارسال",
    "ارسال‌شده",
    "لغوشده",
  ];

  let confirmTitle = "";
  let confirmDescription = "";
  let confirmDanger = false;

  if (confirmation?.kind === "delete") {
    confirmTitle = "سفارش حذف شود؟";
    confirmDescription =
      `سفارش «${confirmation.order.customer}» حذف می‌شود. ` +
      "این کار قابل بازگشت نیست.";
    confirmDanger = true;
  }

  if (confirmation?.kind === "import") {
    confirmTitle = "پشتیبان وارد شود؟";
    confirmDescription =
      `${faNumber(confirmation.orders.length)} سفارش وارد می‌شود. ` +
      "اطلاعات فعلی با محتوای فایل جایگزین خواهد شد.";
    confirmDanger = true;
  }

  if (
    confirmation?.kind === "status" ||
    confirmation?.kind === "save"
  ) {
    const status =
      confirmation.kind === "status"
        ? confirmation.status
        : confirmation.order.status;

    confirmTitle =
      status === "ارسال‌شده"
        ? "ارسال سفارش تأیید شود؟"
        : "سفارش لغو شود؟";

    confirmDescription =
      status === "ارسال‌شده"
        ? "فقط اگر بسته واقعاً تحویل پست یا پیک شده، تأیید کن."
        : "وضعیت سفارش به لغوشده تغییر می‌کند. پرداخت احتمالی را جداگانه پیگیری کن.";

    confirmDanger = status === "لغوشده";
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
          <p className="text-sm text-slate-500">
            در حال خواندن سفارش‌ها…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-800 text-xl font-bold text-white">
              ✓
            </div>

            <div>
              <p className="text-lg font-extrabold">سفارش‌یار</p>
              <p className="mt-1 text-[10px] text-slate-400">
                همراه کسب‌وکار کوچک تو
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-teal-50 px-3 py-1.5 text-[11px] text-teal-700 sm:block">
              نسخهٔ آزمایشی
            </span>

            <button
              type="button"
              disabled={blocked}
              onClick={openNew}
              className="btn btn-primary"
            >
              <span className="text-lg leading-none">+</span>
              سفارش جدید
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-teal-950 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -left-14 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs text-teal-200">
                کمتر جست‌وجو کن، با خیال راحت‌تر پیگیری کن
              </p>

              <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                هر سفارش، یک وضعیت روشن
              </h1>

              <p className="mt-3 max-w-xl text-xs leading-7 text-teal-100/80 sm:text-sm">
                سفارش‌ها، پرداخت‌ها و موعد ارسال را یک‌جا ببین؛
                بدون گشتن میان پیام‌های دایرکت.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4">
              <p className="text-[11px] text-teal-200">امروز</p>
              <p className="mt-2 text-sm font-semibold">
                {today ? faDate(today) : "—"}
              </p>
            </div>
          </div>
        </section>

        {storageError && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800"
          >
            {storageError}
          </p>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              title: "سفارش‌های باز",
              count: activeOrders.length,
              hint: "در انتظار اقدام",
              color: "bg-teal-50 text-teal-700",
              icon: "▦",
              target: "باز" as Filter,
            },
            {
              title: "ارسال امروز",
              count: dueToday.length,
              hint: "موعد ثبت‌شدهٔ امروز",
              color: "bg-blue-50 text-blue-700",
              icon: "↗",
              target: "امروز" as Filter,
            },
            {
              title: "عقب‌افتاده",
              count: overdue.length,
              hint: "نیازمند بررسی فوری",
              color: "bg-orange-50 text-orange-700",
              icon: "!",
              target: "عقب‌افتاده" as Filter,
            },
            {
              title: "اطلاعات ناقص",
              count: incomplete.length,
              hint: "آیدی یا آدرس نامشخص",
              color: "bg-violet-50 text-violet-700",
              icon: "…",
              target: "اطلاعات ناقص" as Filter,
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setFilter(item.target);
                setSearch("");
              }}
              className="panel p-4 text-right transition hover:border-teal-300 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  {item.title}
                </p>

                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold ${item.color}`}
                >
                  {item.icon}
                </span>
              </div>

              <p className="mt-3 text-3xl font-extrabold">
                {faNumber(item.count)}
              </p>

              <p className="mt-2 text-[10px] text-slate-400">
                {item.hint}
              </p>
            </button>
          ))}
        </section>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0">
            <div className="panel p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">
                    دفتر سفارش‌ها
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {faNumber(visible.length)} سفارش در این نما
                  </p>
                </div>

                <select
                  aria-label="مرتب‌سازی"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <option value="newest">جدیدترین ثبت</option>
                  <option value="due">نزدیک‌ترین موعد</option>
                </select>
              </div>

              <input
                aria-label="جست‌وجوی سفارش"
                className="field mt-5"
                placeholder="جست‌وجوی نام، آیدی، محصول یا کد رهگیری…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={filter === tab}
                    onClick={() => setFilter(tab)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] transition ${
                      filter === tab
                        ? "bg-teal-800 text-white"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {!visible.length && (
                <div className="panel px-6 py-14 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-3xl text-teal-700">
                    ▦
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {orders.length
                      ? "سفارشی با این فیلتر پیدا نشد"
                      : "دفترت آمادهٔ اولین سفارش است"}
                  </h3>

                  <p className="mx-auto mt-3 max-w-sm text-xs leading-7 text-slate-500">
                    {orders.length
                      ? "جست‌وجو یا وضعیت انتخاب‌شده را تغییر بده."
                      : "یک سفارش ثبت کن یا با اطلاعات نمونه، جریان کار را ببین."}
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={openNew}
                      className="btn btn-primary"
                    >
                      + ثبت سفارش
                    </button>

                    {!orders.length && (
                      <button
                        type="button"
                        disabled={blocked}
                        className="btn btn-secondary"
                        onClick={() => {
                          if (persist(demoOrders())) {
                            setSearch("");
                            setFilter("همه");
                            setNotice("پنج سفارش ساختگی اضافه شد.");
                          }
                        }}
                      >
                        نمایش اطلاعات نمونه
                      </button>
                    )}
                  </div>
                </div>
              )}

              {visible.map((order) => {
                const late =
                  isActive(order) &&
                  Boolean(today) &&
                  order.dueDate < today;

                const missing = missingFields(order);

                return (
                  <article
                    key={order.id}
                    className={`panel enter overflow-hidden ${
                      late ? "border-orange-200" : ""
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-500">
                            {order.customer.slice(0, 1)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold">
                              {order.customer}
                            </h3>

                            <p
                              dir="ltr"
                              className="mt-1 truncate text-right text-[11px] text-slate-400"
                            >
                              {order.instagram || "آیدی ثبت نشده"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium ${BADGES[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <p className="mt-4 break-words text-sm font-medium leading-7">
                        {order.product}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] text-slate-400">
                            تعداد
                          </p>
                          <p className="mt-1.5 text-xs font-semibold">
                            {faNumber(order.quantity)} عدد
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400">
                            مبلغ کل
                          </p>
                          <p className="mt-1.5 text-xs font-semibold">
                            {faNumber(order.amount)}
                            <span className="mr-1 text-[10px] font-normal">
                              تومان
                            </span>
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400">
                            موعد ارسال
                          </p>
                          <p
                            className={`mt-1.5 text-xs font-semibold ${
                              late ? "text-orange-700" : ""
                            }`}
                          >
                            {faDate(order.dueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400">
                            پرداخت
                          </p>
                          <p
                            className={`mt-1.5 text-xs font-semibold ${
                              order.paid
                                ? "text-teal-700"
                                : "text-amber-700"
                            }`}
                          >
                            {order.paid ? "تأیید شده" : "تأیید نشده"}
                          </p>
                        </div>
                      </div>

                      {late && (
                        <p className="mt-3 text-[11px] leading-6 text-orange-700">
                          ● موعد ارسال گذشته؛ وضعیت واقعی را بررسی کن.
                        </p>
                      )}

                      {isActive(order) && missing.length > 0 && (
                        <p className="mt-2 text-[11px] leading-6 text-orange-700">
                          ● اطلاعات ناقص: {missing.join("، ")}
                        </p>
                      )}

                      {order.trackingCode && (
                        <p className="mt-3 break-all text-[11px] leading-6 text-slate-500">
                          کد رهگیری:{" "}
                          <span dir="ltr" className="inline-block">
                            {order.trackingCode}
                          </span>
                        </p>
                      )}

                      {order.notes && (
                        <p className="mt-3 whitespace-pre-wrap break-words text-[11px] leading-7 text-slate-500">
                          یادداشت: {order.notes}
                        </p>
                      )}

                      <div className="mt-4 rounded-xl bg-teal-50 px-3 py-2.5">
                        <p className="text-[11px] leading-6 text-teal-900">
                          <strong>قدم بعدی: </strong>
                          {nextAction(order)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                      <select
                        aria-label={`وضعیت سفارش ${order.customer}`}
                        disabled={blocked || Boolean(confirmation)}
                        value={order.status}
                        onChange={(event) =>
                          changeStatus(
                            order,
                            event.target.value as Status,
                          )
                        }
                        className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(confirmation)}
                          className="btn bg-teal-50 text-teal-800 hover:bg-teal-100"
                          onClick={() => setMessage(makeMessage(order))}
                        >
                          پیام مشتری
                        </button>

                        <button
                          type="button"
                          disabled={blocked || Boolean(confirmation)}
                          onClick={() => openEdit(order)}
                          className="btn btn-secondary"
                        >
                          ویرایش
                        </button>

                        <button
                          type="button"
                          disabled={blocked || Boolean(confirmation)}
                          onClick={() =>
                            askConfirmation({ kind: "delete", order })
                          }
                          aria-label={`حذف سفارش ${order.customer}`}
                          className="rounded-xl px-2 py-2 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-700"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  اول این‌ها را بررسی کن
                </h2>
                <span className="h-2 w-2 rounded-full bg-orange-400" />
              </div>

              {urgent.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {urgent.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      disabled={blocked || Boolean(confirmation)}
                      onClick={() => openEdit(order)}
                      className="block w-full py-3 text-right"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">
                          {order.customer}
                        </p>
                        <span className="text-[10px] text-orange-700">
                          {order.dueDate < today ? "عقب‌افتاده" : "امروز"}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-[11px] text-slate-400">
                        {order.product}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs leading-7 text-slate-500">
                  سفارش باز با موعد امروز یا گذشته نداری.
                </p>
              )}
            </section>

            <section className="panel p-5">
              <h2 className="text-sm font-bold">نگاهی به پرداخت‌ها</h2>

              <p className="mt-4 text-2xl font-extrabold">
                {faNumber(unpaid.length)}
                <span className="mr-2 text-xs font-normal text-slate-400">
                  سفارش باز با پرداخت تأییدنشده
                </span>
              </p>

              <p className="mt-3 text-[11px] leading-7 text-slate-500">
                مبلغ این سفارش‌ها:
                <strong className="mr-1 text-slate-700">
                  {faNumber(
                    unpaid.reduce((sum, order) => sum + order.amount, 0),
                  )}{" "}
                  تومان
                </strong>
              </p>

              <p className="mt-2 text-[10px] leading-6 text-slate-400">
                این عدد درآمد یا سود نیست؛ تأیید واریز با خودت است.
              </p>
            </section>

            <section className="panel p-5">
              <h2 className="text-sm font-bold">پشتیبان سفارش‌ها</h2>

              <p className="mt-3 text-[11px] leading-7 text-slate-500">
                اطلاعات فقط روی همین مرورگر است. برای نگهداری یا
                انتقال، فایل پشتیبان بگیر.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={blocked || Boolean(confirmation)}
                  onClick={exportOrders}
                  className="btn btn-secondary"
                >
                  دریافت فایل
                </button>

                <button
                  type="button"
                  disabled={Boolean(confirmation)}
                  onClick={() => importRef.current?.click()}
                  className="btn btn-secondary"
                >
                  ورود فایل
                </button>
              </div>

              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                onChange={importOrders}
                aria-label="ورود فایل پشتیبان"
                className="hidden"
              />
            </section>
          </aside>
        </div>

        <footer className="pb-8 pt-10 text-center text-[10px] text-slate-400">
          سفارش‌یار · قدم بعدی هر سفارش را روشن کن
        </footer>
      </div>

      {/* مودال سفارش */}
      {form && (
        <Modal
          title={editingId ? "ویرایش سفارش" : "ثبت سفارش جدید"}
          subtitle="اطلاعات ناقص را می‌توانی بعداً کامل کنی؛ مبلغ، محصول و موعد را دقیق ثبت کن."
          onClose={closeOrderModal}
        >
          <form onSubmit={saveOrder} className="space-y-5">
            <fieldset
              disabled={Boolean(confirmation)}
              className="m-0 min-w-0 space-y-5 border-0 p-0"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام مشتری *">
                  <input
                    aria-label="نام مشتری"
                    className="field"
                    value={form.customer}
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("customer", event.target.value)
                    }
                    placeholder="مثلاً سارا احمدی"
                    required
                  />
                </Field>

                <Field label="آیدی اینستاگرام">
                  <input
                    aria-label="آیدی اینستاگرام"
                    className="field"
                    dir="ltr"
                    value={form.instagram}
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("instagram", event.target.value)
                    }
                    placeholder="@customer"
                  />
                </Field>
              </div>

              <Field label="محصول و مشخصات نهایی *">
                <input
                  aria-label="مشخصات محصول"
                  className="field"
                  value={form.product}
                  maxLength={500}
                  onChange={(event) =>
                    updateForm("product", event.target.value)
                  }
                  placeholder="شمع کوچک، رایحهٔ دارچین، رنگ کرم"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="تعداد *">
                  <input
                    aria-label="تعداد"
                    className="field"
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={(event) =>
                      updateForm("quantity", event.target.value)
                    }
                    required
                  />
                </Field>

                <Field label="مبلغ کل به تومان *">
                  <input
                    aria-label="مبلغ کل به تومان"
                    className="field"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(event) =>
                      updateForm("amount", event.target.value)
                    }
                    placeholder="۵۲۰۰۰۰"
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="موعد ارسال *"
                  hint="تاریخ را از تقویم شمسی انتخاب کن."
                >
                  <DatePicker
                    calendar={persian}
                    locale={persianFa}
                    format="YYYY/MM/DD"
                    editable={false}
                    disabled={Boolean(confirmation)}
                    calendarPosition="top-right"
                    inputClass="field"
                    containerClassName="persian-date-picker"
                    placeholder="انتخاب تاریخ شمسی"
                    value={
                      form.dueDate
                        ? new DateObject({
                            date: form.dueDate,
                            format: "YYYY-MM-DD",
                            calendar: gregorian,
                            locale: gregorianEn,
                          }).convert(persian, persianFa)
                        : null
                    }
                    onChange={(selected: DateObject | null) => {
                      if (!selected || !selected.isValid) {
                        updateForm("dueDate", "");
                        return;
                      }

                      const standardDate = new DateObject(selected)
                        .convert(gregorian, gregorianEn)
                        .format("YYYY-MM-DD");

                      updateForm("dueDate", standardDate);
                    }}
                  />
                </Field>

                <Field label="وضعیت سفارش">
                  <select
                    aria-label="وضعیت سفارش"
                    className="field"
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as Status,
                      )
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="آدرس ارسال">
                <textarea
                  aria-label="آدرس ارسال"
                  className="field resize-y"
                  rows={2}
                  maxLength={2000}
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  placeholder="شهر، آدرس و کد پستی"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="کد رهگیری">
                  <input
                    aria-label="کد رهگیری"
                    className="field"
                    dir="ltr"
                    value={form.trackingCode}
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("trackingCode", event.target.value)
                    }
                    placeholder="پس از ارسال وارد کن"
                  />
                </Field>

                <div className="flex items-center sm:pt-5">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-teal-50 p-3 text-xs leading-6 text-teal-900">
                    <input
                      type="checkbox"
                      checked={form.paid}
                      onChange={(event) => {
                        const paid = event.target.checked;

                        setForm((current) => {
                          if (!current) return current;

                          return {
                            ...current,
                            paid,
                            status:
                              paid &&
                              current.status === "منتظر پرداخت"
                                ? "آماده‌سازی"
                                : current.status,
                          };
                        });
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    />
                    دریافت وجه را بررسی و تأیید کرده‌ام.
                  </label>
                </div>
              </div>

              <Field label="یادداشت داخلی">
                <textarea
                  aria-label="یادداشت داخلی"
                  className="field resize-y"
                  rows={2}
                  maxLength={2000}
                  value={form.notes}
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                  placeholder="نکتهٔ بسته‌بندی یا هماهنگی با مشتری…"
                />
              </Field>

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-xs leading-7 text-red-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex gap-3 border-t border-slate-100 pt-5">
                <button
                  type="submit"
                  disabled={blocked || Boolean(confirmation)}
                  className="btn btn-primary flex-1"
                >
                  {editingId ? "ذخیرهٔ تغییرات" : "ثبت سفارش"}
                </button>

                <button
                  type="button"
                  onClick={closeOrderModal}
                  className="btn btn-secondary"
                >
                  انصراف
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}

      {/* مودال پیام */}
      {message !== null && (
        <Modal
          title="پیام آمادهٔ مشتری"
          subtitle="متن را بررسی و ویرایش کن؛ ارسال پیام با خودت است."
          onClose={closeMessageModal}
        >
          <textarea
            ref={messageRef}
            aria-label="متن پیام مشتری"
            className="field min-h-56 resize-y leading-8"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={copyMessage}
              className="btn btn-primary flex-1"
            >
              کپی متن پیام
            </button>

            <button
              type="button"
              onClick={closeMessageModal}
              className="btn btn-secondary"
            >
              بستن
            </button>
          </div>
        </Modal>
      )}

      {/* توست تأیید عملیات */}
      {confirmation && (
        <ConfirmToast
          title={confirmTitle}
          description={confirmDescription}
          danger={confirmDanger}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmAction}
        />
      )}

      {/* توست اطلاع‌رسانی */}
      {notice && !confirmation && (
        <div
          role="status"
          className="fixed bottom-5 left-4 right-4 z-[90] mx-auto flex max-w-lg items-start justify-between gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-sm leading-7 text-white shadow-xl"
        >
          <span>{notice}</span>

          <button
            type="button"
            aria-label="بستن اعلان"
            onClick={() => setNotice("")}
            className="text-xl text-slate-300"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}