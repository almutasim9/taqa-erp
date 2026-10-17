"use client";

import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  Trash2,
  Upload,
  Users,
  WalletCards,
  Warehouse,
  X,
} from "lucide-react";
import { type FormEvent, type MouseEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { AuthGate } from "@/components/auth-gate";

const money = new Intl.NumberFormat("en-US");
const normalizeDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
const iraqiGovernorates = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "السليمانية",
  "دهوك",
  "كركوك",
  "ديالى",
  "الأنبار",
  "بابل",
  "كربلاء",
  "واسط",
  "النجف",
  "القادسية",
  "المثنى",
  "ذي قار",
  "ميسان",
  "صلاح الدين",
];
const navGroups = [
  {
    title: "الرئيسية",
    items: [{ icon: LayoutDashboard, label: "لوحة التحكم" }, { icon: CircleHelp, label: "دليل الاستخدام" }],
  },
  {
    title: "إدارة الأعمال",
    items: [
      { icon: Package, label: "المبيعات" },
      { icon: ReceiptText, label: "التحصيلات" },
    ],
  },
  { title: "المخزن", items: [{ icon: Warehouse, label: "المخزن" }] },
  {
    title: "التمويل والحسابات",
    items: [
      { icon: Users, label: "العملاء" },
      { icon: HandCoins, label: "الممولون" },
      { icon: WalletCards, label: "المصروفات" },
      { icon: FileText, label: "التقارير" },
    ],
  },
];
const sectionPaths: Record<string, string> = {
  "لوحة التحكم": "/",
  "دليل الاستخدام": "/guide",
  المبيعات: "/sales",
  التحصيلات: "/collections",
  المخزن: "/inventory",
  العملاء: "/customers",
  الممولون: "/financiers",
  المصروفات: "/expenses",
  التقارير: "/reports",
  الإعدادات: "/settings",
};
const sectionFromPath = (pathname: string) => {
  if (pathname.startsWith("/customers/")) return "العملاء";
  if (pathname.startsWith("/financiers/")) return "الممولون";
  const entry = Object.entries(sectionPaths).find(
    ([, path]) => path === pathname,
  );
  return entry?.[0] || "لوحة التحكم";
};
const payments: {
  name: string;
  ref: string;
  amount: number;
  method: string;
  time: string;
  initials: string;
}[] = [];
const dueItems: { name: string; amount: number; date: string; tone: string }[] =
  [];
function IQD({ value }: { value: number }) {
  return (
    <span>
      {money.format(value)} <small className="currency">د.ع</small>
    </span>
  );
}
function Metric({
  title,
  value,
  change,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  change: string;
  icon: typeof WalletCards;
  accent: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="metric-copy">
        <p>{title}</p>
        <strong>
          <IQD value={value} />
        </strong>
      </div>
      <span className={change.startsWith("+") ? "gain" : "loss"}>
        {change.startsWith("+") ? (
          <TrendingUp size={14} />
        ) : (
          <TrendingDown size={14} />
        )}{" "}
        {change}
      </span>
    </article>
  );
}

const moduleContent: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    action: string;
    columns: string[];
    rows: string[][];
  }
> = {
  العملاء: {
    eyebrow: "إدارة الأعمال",
    title: "العملاء",
    description: "ملفات العملاء، أرصدتهم، وعقودهم النشطة.",
    action: "إضافة عميل",
    columns: [
      "العميل",
      "الهاتف",
      "المحافظة",
      "العقود النشطة",
      "الرصيد المستحق",
      "الحالة",
    ],
    rows: [],
  },
  المبيعات: {
    eyebrow: "إدارة الأعمال",
    title: "المبيعات والفواتير",
    description: "الفواتير المباشرة وعقود البيع بالتقسيط.",
    action: "إنشاء فاتورة",
    columns: [
      "الرقم",
      "العميل",
      "النوع",
      "تاريخ الفاتورة",
      "تاريخ الإنشاء",
      "الإجمالي",
      "الحالة",
    ],
    rows: [],
  },
  التحصيلات: {
    eyebrow: "إدارة الأعمال",
    title: "التحصيلات",
    description: "سجل الدفعات وتخصيصاتها وسندات القبض.",
    action: "تسجيل دفعة",
    columns: ["رقم الدفعة", "العميل", "المرجع", "المبلغ", "طريقة الدفع"],
    rows: [],
  },
  الممولون: {
    eyebrow: "التمويل والحسابات",
    title: "الممولون والاستثمارات",
    description: "رأس المال المتاح، العقود الممولة، والتسويات.",
    action: "إضافة استثمار",
    columns: ["الممول", "رأس المال", "المستخدم", "المتاح", "المستحق"],
    rows: [],
  },
  المصروفات: {
    eyebrow: "التمويل والحسابات",
    title: "المصروفات",
    description: "تابع المصروفات التشغيلية وسجل سنداتها.",
    action: "تسجيل مصروف",
    columns: ["رقم المصروف", "التصنيف", "التاريخ", "المبلغ", "الحالة"],
    rows: [],
  },
  التقارير: {
    eyebrow: "التمويل والحسابات",
    title: "مركز التقارير",
    description: "تقارير المبيعات والتحصيل والذمم والتمويل.",
    action: "تصدير التقرير",
    columns: ["التقرير", "الفترة", "آخر تحديث", "الحالة", "إجراء"],
    rows: [],
  },
  المخزن: {
    eyebrow: "المخزن",
    title: "المخزن",
    description: "سيتم تجهيز محتوى وإجراءات المخزن لاحقاً.",
    action: "إضافة صنف",
    columns: ["الصنف", "الرمز", "الكمية", "الحالة"],
    rows: [],
  },
};

function ModulePage({
  name,
  notify,
}: {
  name: string;
  notify: (message: string) => void;
}) {
  const module = moduleContent[name] ?? {
    eyebrow: "النظام",
    title: "الإعدادات",
    description:
      "إدارة أرقام المستندات، المستخدمين، الصلاحيات، وإعدادات الشركة.",
    action: "حفظ الإعدادات",
    columns: ["الإعداد", "القيمة", "الحالة"],
    rows: [],
  };
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(module.rows);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string[] | null>(
    null,
  );
  const [customerNumbers, setCustomerNumbers] = useState<
    Record<string, string>
  >({});
  const [invoiceCustomers, setInvoiceCustomers] = useState<
    { id: string; full_name: string; phone: string }[]
  >([]);
  const [invoiceSaleType, setInvoiceSaleType] = useState<
    "direct" | "installment"
  >("direct");
  const [invoiceCustomerQuery, setInvoiceCustomerQuery] = useState("");
  const [invoiceSelectedCustomer, setInvoiceSelectedCustomer] = useState<{
    id: string;
    full_name: string;
    phone: string;
  } | null>(null);
  const [invoiceQuantity, setInvoiceQuantity] = useState(1);
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const invoiceSubtotal = invoiceQuantity * invoiceUnitPrice;
  const invoiceGrandTotal = Math.max(0, invoiceSubtotal - invoiceDiscount);
  const matchingInvoiceCustomers = invoiceCustomers.filter((customer) =>
    `${customer.full_name} ${customer.phone}`
      .toLowerCase()
      .includes(invoiceCustomerQuery.toLowerCase().trim()),
  );
  useEffect(() => {
    let cancelled = false;
    const loadRows = async () => {
      if (name === "العملاء") {
        const [
          { data, error },
          { data: contractData, error: contractError },
          { data: installmentData, error: installmentError },
        ] = await Promise.all([
          supabase
            .from("customers")
            .select("id,customer_number,full_name,phone,governorate,status")
            .order("created_at", { ascending: false }),
          supabase
            .from("contracts")
            .select("id,customer_id,status"),
          supabase
            .from("installments")
            .select("contract_id,original_amount,status"),
        ]);
        if (cancelled) return;
        if (error) {
          notify(`تعذر تحميل العملاء: ${error.message}`);
          setRows([]);
          return;
        }
        if (contractError) {
          notify(`تعذر تحميل عقود العملاء: ${contractError.message}`);
        }
        if (installmentError) {
          notify(`تعذر تحميل أقساط العملاء: ${installmentError.message}`);
        }
        const contractsByCustomer = new Map<string, any[]>();
        (contractData ?? []).forEach((contract: any) => {
          const current = contractsByCustomer.get(contract.customer_id) ?? [];
          current.push(contract);
          contractsByCustomer.set(contract.customer_id, current);
        });
        const installmentsByContract = new Map<string, any[]>();
        (installmentData ?? []).forEach((installment: any) => {
          const current = installmentsByContract.get(installment.contract_id) ?? [];
          current.push(installment);
          installmentsByContract.set(installment.contract_id, current);
        });
        setCustomerNumbers(
          Object.fromEntries(
            (data ?? []).map((customer) => [
              `${customer.full_name}|${customer.phone}`,
              customer.customer_number,
            ]),
          ),
        );
        setRows(
          (data ?? []).map((customer) => [
            customer.full_name,
            customer.phone,
            customer.governorate || "—",
            String(
              (contractsByCustomer.get(customer.id) ?? []).filter(
                (contract) => contract.status === "active",
              ).length,
            ),
            (() => {
              const activeContracts = (contractsByCustomer.get(customer.id) ?? []).filter(
                (contract) => contract.status === "active",
              );
              const outstanding = activeContracts.reduce(
                (total, contract) =>
                  total +
                  (installmentsByContract.get(contract.id) ?? [])
                    .filter((installment) => installment.status !== "paid")
                    .reduce(
                      (sum, installment) =>
                        sum + Number(installment.original_amount || 0),
                      0,
                    ),
                0,
              );
              return outstanding > 0 ? `${money.format(outstanding)} د.ع` : "—";
            })(),
            customer.status === "active" ? "نشط" : customer.status,
          ]),
        );
      } else if (name === "المبيعات") {
        const [
          { data: invoiceData, error: invoiceError },
          { data: customerData },
        ] = await Promise.all([
          supabase
            .from("invoices")
            .select(
              "invoice_number,customer_id,sale_type,invoice_date,created_at,grand_total,status,customers(full_name)",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("customers")
            .select("id,full_name,phone")
            .eq("status", "active")
            .order("full_name"),
        ]);
        if (invoiceError) {
          notify(`تعذر تحميل الفواتير: ${invoiceError.message}`);
          setRows([]);
        } else {
          setRows(
            (invoiceData ?? []).map((invoice: any) => [
              invoice.invoice_number,
              invoice.customers?.full_name || "—",
              invoice.sale_type === "installment" ? "بيع بالتقسيط" : "بيع نقدي",
              invoice.invoice_date || "—",
              invoice.created_at
                ? new Date(invoice.created_at).toLocaleDateString("en-CA")
                : "—",
              `${money.format(invoice.grand_total)} د.ع`,
              invoice.status === "active" ? "معتمد" : invoice.status,
            ]),
          );
        }
        setInvoiceCustomers(
          (customerData ?? []) as {
            id: string;
            full_name: string;
            phone: string;
          }[],
        );
      } else {
        const saved = window.localStorage.getItem(`shams-erp-v2-${name}`);
        setRows(saved ? (JSON.parse(saved) as string[][]) : module.rows);
      }
      setSearchTerm("");
      setSelectedCustomer(null);
    };
    loadRows();
    return () => {
      cancelled = true;
    };
  }, [name, module.rows]);
  useEffect(() => {
    if (name !== "العملاء")
      window.localStorage.setItem(`shams-erp-v2-${name}`, JSON.stringify(rows));
  }, [name, rows]);
  useEffect(() => {
    if (name !== "العملاء") return;
    const openCustomerPage = (event: Event) => {
      const row = (event.target as HTMLElement).closest(".clickable-row");
      if (!row) return;
      const cells = row.querySelectorAll("td");
      const customerNumber =
        customerNumbers[`${cells[0]?.textContent}|${cells[1]?.textContent}`];
      if (customerNumber)
        window.history.pushState({}, "", `/customers/${customerNumber}`);
    };
    document.addEventListener("click", openCustomerPage);
    return () => document.removeEventListener("click", openCustomerPage);
  }, [name, customerNumbers]);
  useEffect(() => {
    if (name !== "المبيعات") return;
    const openInvoicePage = (event: Event) => {
      const row = (event.target as HTMLElement).closest(".clickable-row");
      const invoiceNumber = row?.querySelector("td")?.textContent?.trim();
      if (!invoiceNumber) return;
      window.history.pushState({}, "", `/sales/${encodeURIComponent(invoiceNumber)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
    document.addEventListener("click", openInvoicePage);
    return () => document.removeEventListener("click", openInvoicePage);
  }, [name]);
  useEffect(() => {
    if (name !== "العملاء") return;
    document.querySelectorAll(".clickable-row").forEach((row) => {
      const cells = row.querySelectorAll("td");
      const cell = cells[0];
      const customerNumber =
        customerNumbers[`${cells[0]?.textContent}|${cells[1]?.textContent}`];
      if (!cell || !customerNumber || cell.querySelector("a")) return;
      const label = cell.textContent || "";
      const link = document.createElement("a");
      link.href = `/customers/${customerNumber}`;
      link.textContent = label;
      link.className = "customer-row-link";
      cell.textContent = "";
      cell.append(link);
    });
  }, [name, rows, customerNumbers]);
  useEffect(() => {
    if (name !== "العملاء") return;
    const addGovernorates = () => {
      document.querySelectorAll(".erp-dialog select").forEach((select) => {
        iraqiGovernorates.forEach((governorate) => {
          if (
            ![...select.options].some((option) => option.value === governorate)
          )
            select.add(new Option(governorate, governorate));
        });
        select.required = true;
        if (!select.value) select.value = "نينوى";
      });
      const form = document.querySelector(".erp-dialog form");
      const grid = form?.querySelector(".form-grid");
      const labels = form?.querySelectorAll("label");
      const phoneInput = labels?.[1]?.querySelector("input");
      if (phoneInput) {
        phoneInput.inputMode = "numeric";
        phoneInput.maxLength = 11;
        phoneInput.pattern = "[0-9]{1,11}";
      }
      const addressInput = labels?.[2]?.querySelector("input");
      if (labels?.[2] && addressInput) {
        labels[2].childNodes[0].textContent = "العنوان التفصيلي";
        addressInput.setAttribute("name", "address");
        addressInput.setAttribute(
          "placeholder",
          "مثال: بغداد، الكرادة، شارع...",
        );
        addressInput.required = true;
      }
      if (grid && !grid.querySelector("[data-customer-extra-fields]")) {
        const extra = document.createElement("div");
        extra.dataset.customerExtraFields = "true";
        extra.className = "customer-extra-fields";
        extra.innerHTML =
          '<label>هاتف بديل<input name="alternative_phone" inputmode="numeric" maxlength="11" placeholder="07XX XXX XXXX" required /></label><label>القضاء/الناحية<input name="district" placeholder="مثال: بعشيقة" required /></label>';
        grid.append(extra);
      }
    };
    addGovernorates();
    const observer = new MutationObserver(addGovernorates);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [name, open]);
  useEffect(() => {
    if (selectedCustomer) {
      window.dispatchEvent(
        new CustomEvent("open-customer", { detail: selectedCustomer }),
      );
      setSelectedCustomer(null);
    }
  }, [selectedCustomer]);
  const formDescription =
    name === "العملاء"
      ? "أدخل بيانات العميل الأساسية لإنشاء ملفه ومتابعة عقوده ومدفوعاته."
      : `أدخل بيانات ${module.action} الأساسية ثم اضغط حفظ.`;
  const tableTitle =
    (
      {
        العملاء: "دليل العملاء",
        المبيعات: "الفواتير وعقود البيع",
        التحصيلات: "سندات القبض والتحصيل",
        الممولون: "حسابات التمويل والاستثمار",
        المصروفات: "سجل المصروفات",
        التقارير: "التقارير المحفوظة",
      } as Record<string, string>
    )[name] || "السجلات";
  const tableDescription =
    (
      {
        العملاء: "ملفات العملاء وأرقامهم ومواقعهم وحالة حساباتهم.",
        المبيعات: "تابع الفواتير، العقود، والإجماليات حسب حالة البيع.",
        التحصيلات: "راجع الدفعات المسجلة وطريقة الدفع والمرجع المرتبط بها.",
        الممولون: "تابع رأس المال المستخدم والمتاح والمبالغ المستحقة.",
        المصروفات: "سجل المصروفات التشغيلية وصنّفها حسب النوع والتاريخ.",
        التقارير: "أنشئ التقارير المالية وصدّرها للفترة المطلوبة.",
      } as Record<string, string>
    )[name] || "راجع البيانات المسجلة في هذا القسم.";
  const followUpLabel =
    (
      {
        العملاء: "حسابات تحتاج متابعة",
        المبيعات: "فواتير غير مكتملة",
        التحصيلات: "دفعات متأخرة",
        الممولون: "تسويات معلقة",
        المصروفات: "بانتظار المراجعة",
        التقارير: "تقارير جاهزة",
      } as Record<string, string>
    )[name] || "تحتاج متابعة";
  const filterLabels = (
    {
      المبيعات: ["الكل", "مسودة", "مكتملة"],
      التحصيلات: ["الكل", "نقدي", "تحويل مصرفي"],
      الممولون: ["كل الحسابات", "نشطة", "مغلقة"],
      المصروفات: ["كل المصروفات", "تشغيلية", "أخرى"],
      التقارير: ["كل التقارير", "مالية", "تشغيلية"],
    } as Record<string, string[]>
  )[name];
  const createInvoice = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const customerId = String(values.get("customer_id") || "");
    const invoiceDate = String(
      values.get("invoice_date") || new Date().toLocaleDateString("en-CA"),
    );
    const saleType = String(values.get("sale_type") || "direct") as
      | "direct"
      | "installment";
    const description = String(values.get("description") || "").trim();
    const quantity = Math.max(1, Number(values.get("quantity") || 1));
    const unitPrice = Math.max(0, Number(values.get("unit_price") || 0));
    const discount = Math.max(0, Number(values.get("discount") || 0));
    const grandTotal = Math.max(0, quantity * unitPrice - discount);
    const downPayment = Math.max(0, Number(values.get("down_payment") || 0));
    const installmentCount = Math.max(
      1,
      Number(values.get("installment_count") || 1),
    );
    const firstDueDate = String(values.get("first_due_date") || "");
    if (
      !customerId ||
      !invoiceDate ||
      !description ||
      !unitPrice ||
      (saleType === "installment" &&
        (!firstDueDate || downPayment > grandTotal))
    ) {
      notify("يرجى إكمال بيانات الفاتورة والتأكد من الدفعة الأولى");
      return;
    }
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        invoice_date: invoiceDate,
        sale_type: saleType,
        subtotal: quantity * unitPrice,
        discount_amount: discount,
        grand_total: grandTotal,
        status: "active",
      })
      .select("id")
      .single();
    if (invoiceError || !invoice) {
      notify(`تعذر حفظ الفاتورة: ${invoiceError?.message || "خطأ غير معروف"}`);
      return;
    }
    const { error: itemError } = await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description,
      quantity,
      unit_price: unitPrice,
      discount_amount: discount,
    });
    if (itemError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      notify(`تعذر حفظ تفاصيل الفاتورة: ${itemError.message}`);
      return;
    }
    if (saleType === "installment") {
      const financedAmount = grandTotal - downPayment;
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          contract_number: `CON-${new Date().getFullYear()}-${Date.now()}`,
            invoice_id: invoice.id,
          customer_id: customerId,
          cash_price: grandTotal,
          installment_price: grandTotal,
          down_payment: downPayment,
          financed_amount: financedAmount,
          installment_count: installmentCount,
          frequency_months: 1,
          first_due_date: firstDueDate,
          final_due_date: firstDueDate,
          status: "active",
        })
        .select("id")
        .single();
      if (contractError || !contract) {
        notify(
          `تم حفظ الفاتورة لكن تعذر إنشاء عقد التقسيط: ${contractError?.message || "خطأ غير معروف"}`,
        );
        setOpen(false);
        return;
      }
      const installmentAmount = Math.ceil(financedAmount / installmentCount);
      const installments = Array.from(
        { length: installmentCount },
        (_, index) => {
          const due = new Date(`${firstDueDate}T00:00:00`);
          due.setMonth(due.getMonth() + index);
          return {
            contract_id: contract.id,
            installment_number: index + 1,
            due_date: due.toISOString().slice(0, 10),
            original_amount:
              index === installmentCount - 1
                ? financedAmount - installmentAmount * (installmentCount - 1)
                : installmentAmount,
          };
        },
      );
      const { error: installmentError } = await supabase
        .from("installments")
        .insert(installments);
      if (installmentError) {
        notify(
          `تم حفظ الفاتورة والعقد لكن تعذر إنشاء الأقساط: ${installmentError.message}`,
        );
        setOpen(false);
        return;
      }
    }
    setOpen(false);
    notify(`تم حفظ الفاتورة ${invoiceNumber} بنجاح`);
    const { data: refreshed } = await supabase
      .from("invoices")
      .select(
        "invoice_number,customer_id,sale_type,invoice_date,created_at,grand_total,status,customers(full_name)",
      )
      .order("created_at", { ascending: false });
    setRows(
      (refreshed ?? []).map((invoice: any) => [
        invoice.invoice_number,
        invoice.customers?.full_name || "—",
        invoice.sale_type === "installment" ? "بيع بالتقسيط" : "بيع نقدي",
        invoice.invoice_date || "—",
        invoice.created_at
          ? new Date(invoice.created_at).toLocaleDateString("en-CA")
          : "—",
        `${money.format(invoice.grand_total)} د.ع`,
        invoice.status === "active" ? "معتمد" : invoice.status,
      ]),
    );
  };
  const addRecord = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const first = normalizeDigits(String(values.get("first") || "")).trim();
    const second = normalizeDigits(String(values.get("second") || "")).trim();
    const governorate = String(
      values.get("governorate") || form.querySelector("select")?.value || "",
    ).trim();
    const address = String(values.get("address") || "").trim();
    const alternativePhone = normalizeDigits(
      String(values.get("alternative_phone") || ""),
    ).trim();
    const district = String(values.get("district") || "").trim();
    if (
      !first ||
      !second ||
      (name === "العملاء" &&
        (!governorate ||
          !address ||
          !alternativePhone ||
          !district ||
          !/^\d{1,11}$/.test(second)))
    ) {
      if (name === "العملاء" && !/^\d{1,11}$/.test(second))
        notify("رقم الهاتف يجب أن يحتوي على أرقام فقط وبحد أقصى 11 رقماً");
      return;
    }
    if (name === "العملاء") {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          customer_number: `CUS-${new Date().getFullYear()}-${Date.now()}`,
          full_name: first,
          phone: second,
          alternative_phone: alternativePhone,
          address,
          governorate,
          district,
          status: "active",
        })
        .select("customer_number,full_name,phone,governorate,status")
        .single();
      if (error || !data) {
        notify(`تعذر حفظ العميل: ${error?.message || "خطأ غير معروف"}`);
        return;
      }
      setCustomerNumbers((current) => ({
        ...current,
        [`${data.full_name}|${data.phone}`]: data.customer_number,
      }));
      setRows((current) => [
        [data.full_name, data.phone, data.governorate || "—", "0", "—", "نشط"],
        ...current,
      ]);
      setOpen(false);
      notify(`تم حفظ ${first} في Supabase`);
      return;
    }
    const status =
      name === "التحصيلات"
        ? "نقدي"
        : name === "الممولون"
          ? "0 د.ع"
          : name === "التقارير"
            ? "عرض"
            : "نشط";
    const row =
      name === "العملاء"
        ? [first, second, governorate, "0", "—", status]
        : [
            first,
            second,
            ...Array(Math.max(0, module.columns.length - 3)).fill("—"),
            status,
          ];
    setRows([row, ...rows]);
    setOpen(false);
    notify(`تمت إضافة ${first} بنجاح`);
  };
  const visibleRows = rows.filter((row) =>
    row.some((value) => value.toLowerCase().includes(searchTerm.toLowerCase())),
  );
  return (
    <section className={`module-page module-${name}`}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{module.eyebrow}</p>
          <h1>{module.title}</h1>
          <p className="subtle">{module.description}</p>
        </div>
        <div className="heading-actions">
          <div className="module-search">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={
                name === "العملاء"
                  ? "ابحث بالاسم أو الهاتف..."
                  : "بحث في السجلات..."
              }
            />
          </div>
          <button
            className="primary-btn"
            onClick={() => {
              if (name === "المبيعات") {
                window.history.pushState({}, "", "/sales/new");
                window.dispatchEvent(new PopStateEvent("popstate"));
              } else {
                setOpen(true);
              }
            }}
          >
            <Plus size={18} />
            {module.action}
          </button>
        </div>
      </div>
      <section className="module-summary">
        <div>
          <span>إجمالي السجلات</span>
          <b>{rows.length}</b>
        </div>
        <div>
          <span>{name === "التقارير" ? "تقارير معروضة" : "نتائج البحث"}</span>
          <b>{visibleRows.length}</b>
        </div>
        <div>
          <span>{followUpLabel}</span>
          <b>0</b>
        </div>
      </section>
      <article className="card data-card">
        <div className="data-title">
          <div>
            <h2>{tableTitle}</h2>
            <p>{tableDescription}</p>
          </div>
          <button
            className="outline-link"
            onClick={() => {
              setSearchTerm("");
              notify("تم تحديث البيانات");
            }}
          >
            تحديث
          </button>
        </div>
        {filterLabels && (
          <div className="module-filterbar">
            {filterLabels.map((label, index) => (
              <button
                key={label}
                className={index === 0 ? "active" : ""}
                onClick={() => notify(`تم اختيار: ${label}`)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {module.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  className={name === "العملاء" || name === "المبيعات" ? "clickable-row" : ""}
                  key={row.join("-")}
                  onClick={() => name === "العملاء" && setSelectedCustomer(row)}
                >
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>
                      {cellIndex === row.length - 1 &&
                      ["نشط", "مدفوعة", "معتمد", "جاهز"].includes(cell) ? (
                        <span className="status-pill">{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <div className="no-results">لا توجد نتائج مطابقة للبحث.</div>
          )}
        </div>
      </article>
      {name === "المبيعات" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="erp-dialog invoice-dialog"
            dir="rtl"
            showCloseButton={false}
          >
            <div className="dialog-heading">
              <DialogHeader>
                <DialogTitle>إنشاء فاتورة</DialogTitle>
                <DialogDescription>
                  اختر العميل وأدخل تفاصيل البيع، وسيُنشأ العقد والأقساط
                  تلقائياً عند اختيار التقسيط.
                </DialogDescription>
              </DialogHeader>
              <DialogClose className="dialog-close" aria-label="إغلاق">
                <X size={18} />
              </DialogClose>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createInvoice(event.currentTarget);
              }}
            >
              <div className="invoice-sections">
                <section className="invoice-section">
                  <div className="invoice-section-heading">
                    <div>
                      <span>الخطوة ١</span>
                      <h3>بيانات الفاتورة</h3>
                    </div>
                    <b>مسودة جديدة</b>
                  </div>
                  <div className="invoice-meta-grid">
                    <label>
                      رقم الفاتورة
                      <input value="يولد تلقائياً عند الحفظ" readOnly />
                    </label>
                    <label>
                      تاريخ الفاتورة
                      <input
                        name="invoice_date"
                        type="date"
                        defaultValue={new Date().toLocaleDateString("en-CA")}
                        required
                      />
                    </label>
                    <label>
                      نوع البيع
                      <select
                        name="sale_type"
                        value={invoiceSaleType}
                        onChange={(event) =>
                          setInvoiceSaleType(
                            event.target.value as "direct" | "installment",
                          )
                        }
                      >
                        <option value="direct">بيع نقدي</option>
                        <option value="installment">بيع بالتقسيط</option>
                      </select>
                    </label>
                    <label className="customer-picker-label">
                      العميل
                      <input
                        name="customer_id"
                        type="hidden"
                        value={invoiceSelectedCustomer?.id || ""}
                        required
                      />
                      <input
                        value={
                          invoiceSelectedCustomer
                            ? `${invoiceSelectedCustomer.full_name} — ${invoiceSelectedCustomer.phone}`
                            : invoiceCustomerQuery
                        }
                        onChange={(event) => {
                          setInvoiceSelectedCustomer(null);
                          setInvoiceCustomerQuery(
                            normalizeDigits(event.target.value),
                          );
                        }}
                        placeholder="ابحث بالاسم أو رقم الهاتف"
                        autoComplete="off"
                        required
                      />
                      {invoiceCustomerQuery && !invoiceSelectedCustomer && (
                        <div className="customer-picker-results">
                          {matchingInvoiceCustomers.length ? (
                            matchingInvoiceCustomers.map((customer) => (
                              <button
                                type="button"
                                key={customer.id}
                                onClick={() => {
                                  setInvoiceSelectedCustomer(customer);
                                  setInvoiceCustomerQuery("");
                                }}
                              >
                                <strong>{customer.full_name}</strong>
                                <span>{customer.phone}</span>
                              </button>
                            ))
                          ) : (
                            <p>لا يوجد عميل مطابق</p>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                </section>
                <section className="invoice-section">
                  <div className="invoice-section-heading">
                    <div>
                      <span>الخطوة ٢</span>
                      <h3>تفاصيل البيع</h3>
                    </div>
                    <b>بند الفاتورة</b>
                  </div>
                  <div className="invoice-line-table">
                    <div className="invoice-line-head">
                      <span>البيان</span>
                      <span>الكمية</span>
                      <span>سعر الوحدة</span>
                      <span>الخصم</span>
                      <span>الإجمالي</span>
                    </div>
                    <div className="invoice-line-row">
                      <input
                        name="description"
                        placeholder="اسم المنتج أو وصف الخدمة"
                        required
                      />
                      <input
                        name="quantity"
                        type="text"
                        inputMode="numeric"
                        min="1"
                        value={invoiceQuantity}
                        onChange={(event) =>
                          setInvoiceQuantity(
                            Math.max(1, Number(event.target.value) || 1),
                          )
                        }
                        required
                      />
                      <input
                        name="unit_price"
                        type="text"
                        inputMode="numeric"
                        min="1"
                        placeholder="0"
                        value={invoiceUnitPrice || ""}
                        onChange={(event) =>
                          setInvoiceUnitPrice(
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                        required
                      />
                      <input
                        name="discount"
                        type="text"
                        inputMode="numeric"
                        min="0"
                        value={invoiceDiscount}
                        onChange={(event) =>
                          setInvoiceDiscount(
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                      />
                      <strong>{money.format(invoiceGrandTotal)} د.ع</strong>
                    </div>
                  </div>
                </section>
                {invoiceSaleType === "installment" && (
                  <section className="invoice-section">
                    <div className="invoice-section-heading">
                      <div>
                        <span>الخطوة ٣</span>
                        <h3>جدول التقسيط</h3>
                      </div>
                      <b>يُنشأ العقد والأقساط تلقائياً</b>
                    </div>
                    <div className="invoice-meta-grid">
                      <label>
                        الدفعة الأولى
                        <input
                          name="down_payment"
                          type="text"
                          inputMode="numeric"
                          min="0"
                          defaultValue="0"
                        />
                      </label>
                      <label>
                        عدد الأقساط
                        <input
                          name="installment_count"
                          type="text"
                          inputMode="numeric"
                          min="1"
                          defaultValue="1"
                        />
                      </label>
                      <label>
                        أول استحقاق
                        <input name="first_due_date" type="date" required />
                      </label>
                    </div>
                  </section>
                )}
                <section className="invoice-total-bar">
                  <div>
                    <span>الإجمالي قبل الخصم</span>
                    <b>{money.format(invoiceSubtotal)} د.ع</b>
                  </div>
                  <div>
                    <span>الخصم</span>
                    <b>{money.format(invoiceDiscount)} د.ع</b>
                  </div>
                  <div className="grand-total">
                    <span>الإجمالي النهائي</span>
                    <b>{money.format(invoiceGrandTotal)} د.ع</b>
                  </div>
                </section>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit">حفظ واعتماد الفاتورة</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {name !== "المبيعات" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="erp-dialog"
            dir="rtl"
            showCloseButton={false}
          >
            <div className="dialog-heading">
              <DialogHeader>
                <DialogTitle>{module.action}</DialogTitle>
                <DialogDescription>{formDescription}</DialogDescription>
              </DialogHeader>
              <DialogClose className="dialog-close" aria-label="إغلاق">
                <X size={18} />
              </DialogClose>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addRecord(event.currentTarget);
              }}
            >
              <div className="form-grid">
                <label>
                  {name === "العملاء" ? "الاسم الكامل" : module.columns[0]}
                  <input
                    name="first"
                    placeholder={
                      name === "العملاء"
                        ? "مثال: محمد أحمد كريم"
                        : `أدخل ${module.columns[0]}`
                    }
                    required
                  />
                </label>
                <label>
                  {name === "العملاء" ? "رقم الهاتف" : module.columns[1]}
                  <input
                    name="second"
                    placeholder={
                      name === "العملاء"
                        ? "07XX XXX XXXX"
                        : `أدخل ${module.columns[1]}`
                    }
                    required
                  />
                </label>
                {name === "العملاء" && (
                  <>
                    <label>
                      هاتف بديل
                      <input placeholder="اختياري" />
                    </label>
                    <label>
                      المحافظة
                      <select defaultValue="">
                        <option value="" disabled>
                          اختر المحافظة
                        </option>
                        <option>بغداد</option>
                        <option>البصرة</option>
                        <option>أربيل</option>
                        <option>النجف</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit">حفظ العميل</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {selectedCustomer && (
        <Dialog
          open={Boolean(selectedCustomer)}
          onOpenChange={(value) => !value && setSelectedCustomer(null)}
        >
          <DialogContent
            className="erp-dialog customer-profile"
            dir="rtl"
            showCloseButton={false}
          >
            <div className="dialog-heading">
              <DialogHeader>
                <DialogTitle>ملف العميل</DialogTitle>
                <DialogDescription>
                  عرض سريع للحساب والالتزامات الحالية.
                </DialogDescription>
              </DialogHeader>
              <DialogClose className="dialog-close" aria-label="إغلاق">
                <X size={18} />
              </DialogClose>
            </div>
            <div className="profile-body">
              <h3>{selectedCustomer[0]}</h3>
              <p>{selectedCustomer[1]}</p>
              <div className="profile-stats">
                <div>
                  <span>العقود النشطة</span>
                  <b>{selectedCustomer[2]}</b>
                </div>
                <div>
                  <span>الرصيد المستحق</span>
                  <b>{selectedCustomer[3]}</b>
                </div>
              </div>
              <div className="profile-actions">
                <Button
                  variant="outline"
                  onClick={() => notify("تم فتح نموذج تسجيل دفعة")}
                >
                  تسجيل دفعة
                </Button>
                <Button onClick={() => notify("تم فتح نموذج عقد جديد")}>
                  إنشاء عقد
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function UserGuidePage() {
  const guideGroups = [
    { title: "المخزن", text: "جهّز الأصناف ومصادر الشراء قبل البيع.", tasks: [{ key: "companies", title: "إضافة شركة أو ماركة", text: "سجّل الجهة المالكة للمنتج." }, { key: "suppliers", title: "إضافة مورد", text: "أضف المورد الذي تشتري منه." }, { key: "catalog", title: "إضافة منتج أو خدمة", text: "أدخل المواد والخدمات الجاهزة للبيع." }] },
    { title: "المشتريات والمخزون", text: "أدخل المشتريات حتى يتحدث رصيد المخزن.", tasks: [{ key: "purchase", title: "إنشاء فاتورة إدخال", text: "اربط الفاتورة بالمورد وأضف البنود." }, { key: "stock", title: "تحديث رصيد المخزون", text: "تأكد من ظهور الكميات في المخزن." }] },
    { title: "العملاء", text: "أنشئ ملف العميل قبل إصدار العقد.", tasks: [{ key: "customers", title: "إضافة عميل", text: "أدخل الاسم والهاتف والعنوان." }, { key: "customer_profile", title: "فتح بروفايل العميل", text: "تأكد من ظهور معلومات العميل وبروفايله." }] },
    { title: "الممولون", text: "جهّز رأس المال واتفاقية التمويل.", tasks: [{ key: "financiers", title: "إضافة ممول", text: "أنشئ بروفايل الممول." }, { key: "agreements", title: "إنشاء اتفاقية تمويل", text: "حدد نسبة الربح على العقود." }, { key: "investments", title: "تسجيل استثمار", text: "سجل المبلغ المستلم وطريقة الاستلام." }] },
    { title: "الفاتورة والعقد", text: "أنشئ عملية البيع بالتقسيط واعتمد العقد.", tasks: [{ key: "invoice", title: "إنشاء فاتورة", text: "اختر العميل وأضف المنتجات أو الخدمات." }, { key: "contract", title: "إنشاء عقد تقسيط", text: "حدد الممول والدفعة الأولى وعدد الأقساط." }, { key: "schedule", title: "إنشاء جدول الأقساط", text: "راجع قيمة كل قسط وتاريخ الاستحقاق." }] },
    { title: "المتابعة والتحصيل", text: "تابع العقد من بروفايل العميل والممول.", tasks: [{ key: "customer_followup", title: "متابعة العقد في بروفايل العميل", text: "شاهد الأقساط والمدفوع والمتبقي والمتأخر." }, { key: "payment", title: "تسجيل تحصيل", text: "اربط الدفعة بالقسط الصحيح." }, { key: "financier_followup", title: "متابعة العقد في بروفايل الممول", text: "افتح حالة العقد وشاهد تفاصيل الدفعات." }] },
  ];
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const loadGuideProgress = async () => {
      const [companies, suppliers, products, services, purchases, customers, financiers, agreements, investments, invoices, contracts, installments, payments] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("purchase_receipts").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("financiers").select("id", { count: "exact", head: true }),
        supabase.from("financier_agreement_versions").select("id", { count: "exact", head: true }),
        supabase.from("financier_investments").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }),
        supabase.from("installments").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        companies: companies.count || 0, suppliers: suppliers.count || 0,
        catalog: (products.count || 0) + (services.count || 0), purchase: purchases.count || 0,
        stock: products.count || 0, customers: customers.count || 0,
        customer_profile: customers.count || 0, financiers: financiers.count || 0,
        agreements: agreements.count || 0, investments: investments.count || 0,
        invoice: invoices.count || 0, contract: contracts.count || 0,
        schedule: installments.count || 0, customer_followup: contracts.count || 0,
        payment: payments.count || 0, financier_followup: contracts.count || 0,
      });
    };
    loadGuideProgress();
  }, []);
  const allTasks = guideGroups.flatMap((group) => group.tasks);
  const completedCount = allTasks.filter((task) => (counts[task.key] || 0) > 0).length;
  return (
    <section className="module-page guide-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">المساعدة</p>
          <h1>دليل الاستخدام</h1>
          <p className="subtle">المسار العملي من تجهيز المخزن حتى إنشاء العقود ومتابعتها في بروفايل كل طرف.</p>
        </div>
      </div>
      <div className="guide-progress card"><div><b>خريطة الإنجاز</b><span>كل مرحلة تحتوي مهمات فرعية، وتُحتسب تلقائياً من بيانات النظام</span></div><strong>{completedCount} من {allTasks.length}</strong><div className="guide-progress-track"><i style={{ width: `${(completedCount / allTasks.length) * 100}%` }} /></div></div>
      <div className="guide-grid">
        {guideGroups.map((group, index) => { const groupDone = group.tasks.every((task) => (counts[task.key] || 0) > 0); return <article key={group.title} className={`card guide-group ${groupDone ? "completed" : ""}`}><div className="guide-group-heading"><span className="guide-number">{groupDone ? "✓" : index + 1}</span><div><h2>{group.title}</h2><p>{group.text}</p></div></div><div className="guide-subtasks">{group.tasks.map((task) => { const done = (counts[task.key] || 0) > 0; return <div className={`guide-subtask ${done ? "completed" : ""}`} key={task.key}><span>{done ? "✓" : "○"}</span><div><b>{task.title}</b><small>{task.text}</small></div></div>; })}</div></article>; })}
      </div>
    </section>
  );
}

function CustomerProfilePagePreview({
  customer,
  onBack,
  notify,
}: {
  customer: string[];
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [name, phone, contracts, balance] = customer;
  return (
    <section className="customer-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} />
        العودة إلى العملاء
      </button>
      <div className="customer-heading">
        <div className="customer-avatar">
          {name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="eyebrow">ملف العميل</p>
          <h1>{name}</h1>
          <span className="customer-status">نشط</span>
        </div>
        <div className="customer-actions">
          <Button
            variant="outline"
            onClick={() => notify("تم فتح نموذج تسجيل دفعة")}
          >
            تسجيل دفعة
          </Button>
          <Button onClick={() => notify("تم فتح نموذج عقد جديد")}>
            <Plus size={16} />
            إنشاء عقد
          </Button>
        </div>
      </div>
      <section className="customer-metrics">
        <article>
          <span>الرصيد المستحق</span>
          <strong>{balance}</strong>
          <small>إجمالي الأقساط المتبقية</small>
        </article>
        <article>
          <span>العقود النشطة</span>
          <strong>{contracts}</strong>
          <small>عقود قيد السداد</small>
        </article>
        <article>
          <span>إجمالي المدفوعات</span>
          <strong>10,750,000 د.ع</strong>
          <small>حتى تاريخ اليوم</small>
        </article>
        <article>
          <span>القسط القادم</span>
          <strong>850,000 د.ع</strong>
          <small>01 تشرين الأول 2026</small>
        </article>
      </section>
      <div className="customer-grid">
        <article className="card customer-details">
          <div className="section-title">
            <div>
              <h2>المعلومات الأساسية</h2>
              <p>بيانات التواصل والعنوان المسجلة للعميل</p>
            </div>
            <button
              className="outline-link"
              onClick={() => notify("تم فتح تعديل بيانات العميل")}
            >
              تعديل
            </button>
          </div>
          <dl>
            <div>
              <dt>
                <Phone size={16} />
                رقم الهاتف
              </dt>
              <dd>{phone}</dd>
            </div>
            <div>
              <dt>
                <Phone size={16} />
                هاتف بديل
              </dt>
              <dd>0771 555 9090</dd>
            </div>
            <div>
              <dt>
                <MapPin size={16} />
                المحافظة
              </dt>
              <dd>بغداد — الكرادة</dd>
            </div>
            <div>
              <dt>
                <FileText size={16} />
                تاريخ التسجيل
              </dt>
              <dd>12 كانون الثاني 2026</dd>
            </div>
          </dl>
        </article>
        <article className="card customer-note">
          <div className="section-title">
            <div>
              <h2>ملاحظة الحساب</h2>
              <p>آخر تحديث منذ 12 دقيقة</p>
            </div>
          </div>
          <p>العميل ملتزم بجدول السداد، ولا توجد أقساط متأخرة حالياً.</p>
          <button
            className="outline-link"
            onClick={() => notify("تم فتح سجل ملاحظات العميل")}
          >
            عرض كل الملاحظات <ChevronLeft size={15} />
          </button>
        </article>
      </div>
      <article className="card customer-contracts">
        <div className="section-title">
          <div>
            <h2>العقود والفواتير</h2>
            <p>كل الالتزامات والسجل المالي المرتبط بهذا العميل</p>
          </div>
          <button
            className="outline-link"
            onClick={() => notify("تم فتح جميع عقود العميل")}
          >
            عرض السجل الكامل <ChevronLeft size={15} />
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم العقد</th>
                <th>نوع العملية</th>
                <th>تاريخ العقد</th>
                <th>إجمالي العقد</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CON-2026-0045</td>
                <td>بيع بالتقسيط</td>
                <td>12 كانون الثاني 2026</td>
                <td>15,000,000 د.ع</td>
                <td>{balance}</td>
                <td>
                  <span className="status-pill">نشط</span>
                </td>
              </tr>
              <tr>
                <td>CON-2026-0021</td>
                <td>بيع بالتقسيط</td>
                <td>04 تشرين الثاني 2025</td>
                <td>8,500,000 د.ع</td>
                <td>0 د.ع</td>
                <td>
                  <span className="status-pill">مكتمل</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function LegacyCustomerProfilePageOld({
  customer,
  onBack,
  notify,
}: {
  customer: string[];
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [name, phone, contracts, originalBalance] = customer;
  const startingBalance = Number(originalBalance.replace(/[^0-9]/g, "")) || 0;
  const [outstanding, setOutstanding] = useState(startingBalance);
  const [activeContracts, setActiveContracts] = useState(
    Number(contracts) || 0,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractRows, setContractRows] = useState([
    {
      number: "CON-2026-0045",
      type: "بيع بالتقسيط",
      date: "12 كانون الثاني 2026",
      total: "15,000,000 د.ع",
      remaining: startingBalance,
    },
  ]);
  const formatMoney = (value: number) => `${money.format(value)} د.ع`;
  const recordPayment = (form: HTMLFormElement) => {
    const amount = Number(
      normalizeDigits(String(new FormData(form).get("amount") || "")),
    );
    if (!amount || amount <= 0) return;
    setOutstanding((current) => Math.max(0, current - amount));
    setPaymentOpen(false);
    notify(`تم تسجيل دفعة بقيمة ${formatMoney(amount)}`);
  };
  const createContract = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const number = String(data.get("number") || "").trim();
    const total = Number(normalizeDigits(String(data.get("total") || "")));
    if (!number || !total || total <= 0) return;
    setContractRows((current) => [
      {
        number,
        type: "بيع بالتقسيط",
        date: "28 أيلول 2026",
        total: formatMoney(total),
        remaining: total,
      },
      ...current,
    ]);
    setOutstanding((current) => current + total);
    setActiveContracts((current) => current + 1);
    setContractOpen(false);
    notify(`تم إنشاء العقد ${number} بنجاح`);
  };
  return (
    <section className="customer-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} />
        العودة إلى العملاء
      </button>
      <div className="customer-heading">
        <div className="customer-avatar">
          {name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="eyebrow">ملف العميل</p>
          <h1>{name}</h1>
          <span className="customer-status">نشط</span>
        </div>
        <div className="customer-actions">
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>
            تسجيل دفعة
          </Button>
          <Button onClick={() => setContractOpen(true)}>
            <Plus size={16} />
            إنشاء عقد
          </Button>
        </div>
      </div>
      <section className="customer-metrics">
        <article>
          <span>الرصيد المستحق</span>
          <strong>{formatMoney(outstanding)}</strong>
          <small>إجمالي الأقساط المتبقية</small>
        </article>
        <article>
          <span>العقود النشطة</span>
          <strong>{activeContracts}</strong>
          <small>عقود قيد السداد</small>
        </article>
        <article>
          <span>إجمالي المدفوعات</span>
          <strong>10,750,000 د.ع</strong>
          <small>حتى تاريخ اليوم</small>
        </article>
        <article>
          <span>القسط القادم</span>
          <strong>850,000 د.ع</strong>
          <small>01 تشرين الأول 2026</small>
        </article>
      </section>
      <div className="customer-grid">
        <article className="card customer-details">
          <div className="section-title">
            <div>
              <h2>المعلومات الأساسية</h2>
              <p>بيانات التواصل والعنوان المسجلة للعميل</p>
            </div>
            <button
              className="outline-link"
              onClick={() => notify("تم فتح تعديل بيانات العميل")}
            >
              تعديل
            </button>
          </div>
          <dl>
            <div>
              <dt>
                <Phone size={16} />
                رقم الهاتف
              </dt>
              <dd>{phone}</dd>
            </div>
            <div>
              <dt>
                <Phone size={16} />
                هاتف بديل
              </dt>
              <dd>0771 555 9090</dd>
            </div>
            <div>
              <dt>
                <MapPin size={16} />
                المحافظة
              </dt>
              <dd>بغداد — الكرادة</dd>
            </div>
            <div>
              <dt>
                <FileText size={16} />
                تاريخ التسجيل
              </dt>
              <dd>12 كانون الثاني 2026</dd>
            </div>
          </dl>
        </article>
        <article className="card customer-note">
          <div className="section-title">
            <div>
              <h2>ملاحظة الحساب</h2>
              <p>آخر تحديث منذ 12 دقيقة</p>
            </div>
          </div>
          <p>العميل ملتزم بجدول السداد، ولا توجد أقساط متأخرة حالياً.</p>
          <button
            className="outline-link"
            onClick={() => notify("تم فتح سجل ملاحظات العميل")}
          >
            عرض كل الملاحظات <ChevronLeft size={15} />
          </button>
        </article>
      </div>
      <article className="card customer-contracts">
        <div className="section-title">
          <div>
            <h2>العقود والفواتير</h2>
            <p>كل الالتزامات والسجل المالي المرتبط بهذا العميل</p>
          </div>
          <button
            className="outline-link"
            onClick={() => notify("تم فتح جميع عقود العميل")}
          >
            عرض السجل الكامل <ChevronLeft size={15} />
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم العقد</th>
                <th>نوع العملية</th>
                <th>تاريخ العقد</th>
                <th>إجمالي العقد</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {contractRows.map((contract) => (
                <tr key={contract.number}>
                  <td>{contract.number}</td>
                  <td>{contract.type}</td>
                  <td>{contract.date}</td>
                  <td>{contract.total}</td>
                  <td>{formatMoney(contract.remaining)}</td>
                  <td>
                    <span className="status-pill">نشط</span>
                  </td>
                </tr>
              ))}
              <tr>
                <td>CON-2026-0021</td>
                <td>بيع بالتقسيط</td>
                <td>04 تشرين الثاني 2025</td>
                <td>8,500,000 د.ع</td>
                <td>0 د.ع</td>
                <td>
                  <span className="status-pill">مكتمل</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="erp-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading">
            <DialogHeader>
              <DialogTitle>تسجيل دفعة</DialogTitle>
              <DialogDescription>
                سجل دفعة جديدة للعميل، وسيُحدَّث الرصيد فوراً.
              </DialogDescription>
            </DialogHeader>
            <DialogClose className="dialog-close" aria-label="إغلاق">
              <X size={18} />
            </DialogClose>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              recordPayment(event.currentTarget);
            }}
          >
            <div className="form-grid">
              <label>
                مبلغ الدفعة
                <input
                  name="amount"
                  type="text"
                  inputMode="numeric"
                  min="1"
                  placeholder="مثال: 850000"
                  required
                />
              </label>
              <label>
                طريقة الدفع
                <select name="method" defaultValue="نقدي">
                  <option>نقدي</option>
                  <option>تحويل مصرفي</option>
                  <option>POS</option>
                </select>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">تسجيل الدفعة</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="erp-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading">
            <DialogHeader>
              <DialogTitle>إنشاء عقد</DialogTitle>
              <DialogDescription>
                أدخل رقم العقد وإجماليه لإضافته إلى ملف العميل.
              </DialogDescription>
            </DialogHeader>
            <DialogClose className="dialog-close" aria-label="إغلاق">
              <X size={18} />
            </DialogClose>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createContract(event.currentTarget);
            }}
          >
            <div className="form-grid">
              <label>
                رقم العقد
                <input name="number" placeholder="CON-2026-0060" required />
              </label>
              <label>
                إجمالي العقد
                <input
                  name="total"
                  type="text"
                  inputMode="numeric"
                  min="1"
                  placeholder="مثال: 5000000"
                  required
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setContractOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">إنشاء العقد</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LegacyCustomerProfilePageOld2({
  customer,
  onBack,
  notify,
}: {
  customer: string[];
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [name, phone, governorate = "—", contracts = "0", balance = "—"] =
    customer;
  useEffect(() => {
    const provinceCell = document.querySelector(
      ".customer-details dd:nth-of-type(3)",
    );
    if (provinceCell) provinceCell.textContent = governorate || "—";
  }, [governorate]);
  return (
    <section className="customer-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} />
        العودة إلى العملاء
      </button>
      <div className="customer-heading">
        <div className="customer-avatar">
          {name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="eyebrow">ملف العميل</p>
          <h1>{name}</h1>
          <span className="customer-status">نشط</span>
        </div>
        <div className="customer-actions">
          <Button
            variant="outline"
            onClick={() =>
              notify("سيتم تفعيل تسجيل الدفعة بعد ربط قاعدة البيانات")
            }
          >
            تسجيل دفعة
          </Button>
          <Button
            onClick={() =>
              notify("سيتم تفعيل إنشاء العقد بعد ربط قاعدة البيانات")
            }
          >
            <Plus size={16} />
            إنشاء عقد
          </Button>
        </div>
      </div>
      <section className="customer-metrics">
        <article>
          <span>الرصيد المستحق</span>
          <strong>{balance === "—" ? "0 د.ع" : balance}</strong>
          <small>من البيانات المسجلة</small>
        </article>
        <article>
          <span>العقود النشطة</span>
          <strong>{contracts === "—" ? "0" : contracts}</strong>
          <small>لا توجد عقود مسجلة بعد</small>
        </article>
        <article>
          <span>إجمالي المدفوعات</span>
          <strong>0 د.ع</strong>
          <small>لا توجد دفعات مسجلة بعد</small>
        </article>
        <article>
          <span>القسط القادم</span>
          <strong>لا يوجد</strong>
          <small>لا توجد أقساط مسجلة بعد</small>
        </article>
      </section>
      <div className="customer-grid">
        <article className="card customer-details">
          <div className="section-title">
            <div>
              <h2>المعلومات الأساسية</h2>
              <p>البيانات التي تم إدخالها لهذا العميل</p>
            </div>
            <button
              className="outline-link"
              onClick={() =>
                notify("سيتم تفعيل التعديل بعد ربط قاعدة البيانات")
              }
            >
              تعديل
            </button>
          </div>
          <dl>
            <div>
              <dt>
                <Phone size={16} />
                رقم الهاتف
              </dt>
              <dd>{phone}</dd>
            </div>
            <div>
              <dt>
                <Phone size={16} />
                هاتف بديل
              </dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>
                <MapPin size={16} />
                المحافظة
              </dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>
                <FileText size={16} />
                تاريخ التسجيل
              </dt>
              <dd>—</dd>
            </div>
          </dl>
        </article>
        <article className="card customer-note">
          <div className="section-title">
            <div>
              <h2>ملاحظة الحساب</h2>
              <p>لا توجد ملاحظات</p>
            </div>
          </div>
          <p>لم تتم إضافة ملاحظات أو بيانات مالية لهذا العميل بعد.</p>
        </article>
      </div>
      <article className="card customer-contracts">
        <div className="section-title">
          <div>
            <h2>العقود والفواتير</h2>
            <p>لا توجد عقود أو فواتير مرتبطة بهذا العميل بعد.</p>
          </div>
        </div>
        <div className="no-results">لا توجد عقود أو فواتير مسجلة.</div>
      </article>
    </section>
  );
}

function CustomerProfilePageOld3({
  customer,
  onBack,
  notify,
}: {
  customer: string[];
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [name, phone, initialGovernorate = "—"] = customer;
  const [tab, setTab] = useState<"basic" | "contracts" | "payments">("basic");
  const [details, setDetails] = useState({
    governorate: initialGovernorate,
    address: "—",
    alternative_phone: "—",
    district: "—",
    notes: "—",
    created_at: "—",
  });
  useEffect(() => {
    supabase
      .from("customers")
      .select("governorate,address,alternative_phone,district,notes,created_at")
      .eq("phone", phone)
      .single()
      .then(({ data }) => {
        if (data)
          setDetails({
            governorate: data.governorate || "—",
            address: data.address || "—",
            alternative_phone: data.alternative_phone || "—",
            district: data.district || "—",
            notes: data.notes || "—",
            created_at: data.created_at
              ? new Intl.DateTimeFormat("ar-IQ", { dateStyle: "long" }).format(
                  new Date(data.created_at),
                )
              : "—",
          });
      });
  }, [phone]);
  return (
    <section className="customer-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} />
        العودة إلى العملاء
      </button>
      <div className="customer-heading">
        <div className="customer-avatar">
          {name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="eyebrow">ملف العميل</p>
          <h1>{name}</h1>
          <span className="customer-status">نشط</span>
        </div>
        <div className="customer-actions">
          <Button
            variant="outline"
            onClick={() => notify("سيتم تفعيل تسجيل الدفعة قريباً")}
          >
            تسجيل دفعة
          </Button>
          <Button onClick={() => notify("سيتم تفعيل إنشاء العقد قريباً")}>
            <Plus size={16} />
            إنشاء عقد
          </Button>
        </div>
      </div>
      <div className="profile-tabs" role="tablist">
        <button
          className={tab === "basic" ? "active" : ""}
          onClick={() => setTab("basic")}
        >
          المعلومات الأساسية
        </button>
        <button
          className={tab === "contracts" ? "active" : ""}
          onClick={() => setTab("contracts")}
        >
          العقود والفواتير
        </button>
        <button
          className={tab === "payments" ? "active" : ""}
          onClick={() => setTab("payments")}
        >
          الدفعات
        </button>
      </div>
      {tab === "basic" && (
        <div className="customer-grid profile-tab-panel">
          <article className="card customer-details">
            <div className="section-title">
              <div>
                <h2>المعلومات الأساسية</h2>
                <p>كل البيانات المسجلة لهذا العميل</p>
              </div>
              <button
                className="outline-link"
                onClick={() => notify("سيتم تفعيل التعديل قريباً")}
              >
                تعديل
              </button>
            </div>
            <dl>
              <div>
                <dt>
                  <Phone size={16} />
                  رقم الهاتف
                </dt>
                <dd>{phone || "—"}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={16} />
                  هاتف بديل
                </dt>
                <dd>{details.alternative_phone}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  المحافظة
                </dt>
                <dd>{details.governorate}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  العنوان التفصيلي
                </dt>
                <dd>{details.address}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  القضاء/الناحية
                </dt>
                <dd>{details.district}</dd>
              </div>
              <div>
                <dt>
                  <FileText size={16} />
                  تاريخ التسجيل
                </dt>
                <dd>{details.created_at}</dd>
              </div>
            </dl>
          </article>
          <article className="card customer-note">
            <div className="section-title">
              <div>
                <h2>ملاحظة الحساب</h2>
                <p>
                  {details.notes === "—" ? "لا توجد ملاحظات" : "ملاحظة مسجلة"}
                </p>
              </div>
            </div>
            <p>
              {details.notes === "—"
                ? "لم تتم إضافة ملاحظات لهذا العميل بعد."
                : details.notes}
            </p>
          </article>
        </div>
      )}
      {tab === "contracts" && (
        <article className="card customer-contracts profile-tab-panel">
          <div className="section-title">
            <div>
              <h2>العقود والفواتير</h2>
              <p>العقود والفواتير المرتبطة بهذا العميل</p>
            </div>
            <button
              className="primary-btn"
              onClick={() => notify("سيتم تفعيل إنشاء العقد قريباً")}
            >
              <Plus size={16} />
              إنشاء عقد
            </button>
          </div>
          <div className="no-results">
            لا توجد عقود أو فواتير مسجلة لهذا العميل.
          </div>
        </article>
      )}
      {tab === "payments" && (
        <article className="card customer-contracts profile-tab-panel">
          <div className="section-title">
            <div>
              <h2>الدفعات</h2>
              <p>سجل الدفعات والتحصيلات الخاصة بهذا العميل</p>
            </div>
            <button
              className="primary-btn"
              onClick={() => notify("سيتم تفعيل تسجيل الدفعة قريباً")}
            >
              <Plus size={16} />
              تسجيل دفعة
            </button>
          </div>
          <div className="no-results">لا توجد دفعات مسجلة لهذا العميل.</div>
        </article>
      )}
    </section>
  );
}

function InvoiceCreatePage({
  onBack,
  notify,
}: {
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [customers, setCustomers] = useState<
    { id: string; full_name: string; phone: string }[]
  >([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    { id: string; full_name: string; phone: string } | null
  >(null);
  const [financiers, setFinanciers] = useState<any[]>([]);
  const [financierAgreements, setFinancierAgreements] = useState<any[]>([]);
  const [financierBalances, setFinancierBalances] = useState<Record<string, number>>({});
  const [financierBalancesLoaded, setFinancierBalancesLoaded] = useState(false);
  const [selectedFinancierId, setSelectedFinancierId] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [saleType, setSaleType] = useState<"direct" | "installment">("direct");
  const [invoiceLines, setInvoiceLines] = useState([
    { id: 1, productId: "", itemType: "product" as "product" | "service", productQuery: "", description: "", quantity: "1", unitPrice: "", discount: "0" },
  ]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [attachments, setAttachments] = useState<Record<string, File | null>>({});
  const [downPayment, setDownPayment] = useState(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(10);
  const [firstDueDate, setFirstDueDate] = useState("");
  const subtotal = invoiceLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  const lineDiscount = 0;
  const discount = lineDiscount + invoiceDiscount;
  const grandTotal = Math.max(0, subtotal - discount);
  const availableFinancierAgreements = financierAgreements.filter((agreement) => agreement.financier_id === selectedFinancierId);
  const selectedAgreement = financierAgreements.find((agreement) => agreement.id === selectedAgreementId);
  const financierProfitPercentage = saleType === "installment" ? Number(selectedAgreement?.terms?.profit_percentage || 0) : 0;
  const financierProfit = Math.round(grandTotal * financierProfitPercentage / 100);
  const installmentTotal = grandTotal + financierProfit;
  const installmentAmount = Math.ceil(Math.max(0, installmentTotal - downPayment) / Math.max(1, installmentCount));
  const updateLine = (id: number, patch: Partial<(typeof invoiceLines)[number]>) =>
    setInvoiceLines((lines) => lines.map((line) => line.id === id ? { ...line, ...patch } : line));
  const addLine = () => {
    const id = Date.now();
    setInvoiceLines((lines) => [...lines, { id, productId: "", itemType: "product" as "product" | "service", productQuery: "", description: "", quantity: "1", unitPrice: "", discount: "0" }]);
    window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-invoice-line-id="${id}"]`)?.focus(), 0);
  };
  const removeLine = (id: number) =>
    setInvoiceLines((lines) => lines.length === 1 ? lines : lines.filter((line) => line.id !== id));
  const lineSummary = invoiceLines.map((line) => line.description).filter(Boolean).join("، ");
  const matches = customers.filter((customer) =>
    `${customer.full_name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  const productMatches = (query: string) => [...catalogProducts.map((product) => ({ ...product, itemType: "product" })), ...catalogServices.map((service) => ({ ...service, itemType: "service", sku: service.service_code }))].filter((item) => `${item.name} ${item.sku || ""} ${item.model || ""}`.toLowerCase().includes(query.toLowerCase().trim()));
  const totalSteps = saleType === "installment" ? 5 : 4;
  const attachmentStep = saleType === "installment" ? 4 : 3;
  const previewStep = totalSteps;
  const nextStep = (form: HTMLFormElement) => {
    if (currentStep === 1) {
      const invoiceDate = (form.querySelector("[name=invoice_date]") as HTMLInputElement)?.value;
      if (!selectedCustomer || !invoiceDate) {
        notify("أكمل تاريخ الفاتورة واختر العميل قبل المتابعة");
        return;
      }
    }
    if (currentStep === 2) {
      if (invoiceLines.some((line) => !line.description.trim() || !(Number(line.unitPrice) > 0))) {
        notify("أكمل وصف البند وسعر الوحدة قبل المتابعة");
        return;
      }
    }
    if (saleType === "installment" && currentStep === 3) {
      const firstDueDate = (form.querySelector("[name=first_due_date]") as HTMLInputElement)?.value;
      if (!firstDueDate || !selectedFinancierId || !selectedAgreementId) {
        notify("حدد أول موعد استحقاق والممول واتفاقية التمويل قبل المتابعة");
        return;
      }
      const requiredCapital = Math.max(0, grandTotal - downPayment);
      if (financierBalancesLoaded && (financierBalances[selectedFinancierId] || 0) < requiredCapital) {
        notify("رأس مال الممول المتاح لا يكفي لهذا العقد");
        return;
      }
    }
    setCurrentStep((step) => Math.min(totalSteps, step + 1));
  };

  useEffect(() => {
    supabase
      .from("customers")
      .select("id,full_name,phone")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        const loadedCustomers = data || [];
        setCustomers(loadedCustomers);
        const prefilledPhone = window.localStorage.getItem("shams-erp-invoice-customer-phone");
        const prefilledCustomer = loadedCustomers.find((customer) => customer.phone === prefilledPhone);
        if (prefilledCustomer) {
          setSelectedCustomer(prefilledCustomer);
          window.localStorage.removeItem("shams-erp-invoice-customer-phone");
        }
      });
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("id,sku,name,model,selling_price,stock_quantity,status,companies(name),suppliers(name)").eq("status", "active").order("name"),
      supabase.from("services").select("id,service_code,name,description,selling_price,status").eq("status", "active").order("name"),
    ]).then(([{ data: productRows }, { data: serviceRows }]) => { setCatalogProducts(productRows || []); setCatalogServices(serviceRows || []); });
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from("financiers").select("id,name,financier_number").eq("status", "active").order("name"),
      supabase.from("financier_agreement_versions").select("id,financier_id,version,agreement_type,allocation_strategy,terms,effective_from").order("effective_from", { ascending: false }),
      supabase.from("financier_investments").select("financier_id,amount").eq("status", "active"),
      supabase.from("financier_transactions").select("financier_id,debit,credit").order("occurred_at", { ascending: false }),
    ]).then(([{ data: financierRows }, { data: agreementRows }, { data: investmentRows }, { data: transactionRows }]) => {
      setFinanciers(financierRows || []);
      setFinancierAgreements(agreementRows || []);
      const balances: Record<string, number> = {};
      (investmentRows || []).forEach((row) => { balances[row.financier_id] = (balances[row.financier_id] || 0) + Number(row.amount || 0); });
      (transactionRows || []).forEach((row) => { balances[row.financier_id] = (balances[row.financier_id] || 0) + Number(row.credit || 0) - Number(row.debit || 0); });
      setFinancierBalances(balances);
      setFinancierBalancesLoaded(true);
    });
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const invoiceDate = String(values.get("invoice_date") || "");
    const savedDownPayment = Math.max(0, Number(values.get("down_payment") || downPayment));
    const savedInstallmentCount = Math.max(1, Number(values.get("installment_count") || installmentCount));
    const savedFirstDueDate = String(values.get("first_due_date") || firstDueDate);
    const isDraft = values.get("save_mode") === "draft";
    if (!selectedCustomer || !invoiceLines.every((line) => line.description.trim() && Number(line.unitPrice) > 0) || !invoiceDate ||
      (!isDraft && saleType === "installment" && (!savedFirstDueDate || savedDownPayment >= grandTotal || !selectedFinancierId || !selectedAgreementId))) {
      notify("يرجى إكمال بيانات الفاتورة والتأكد من الدفعة الأولى");
      return;
    }
    const stockLines = invoiceLines.filter((line) => line.productId && line.itemType === "product");
    const stockIssue = stockLines.find((line) => Number(line.quantity) > Number(catalogProducts.find((product) => product.id === line.productId)?.stock_quantity || 0));
    if (stockIssue) { notify(`الكمية المطلوبة من المنتج ${stockIssue.description} أكبر من المتوفر بالمخزن`); return; }
    setSaving(true);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        invoice_date: invoiceDate,
        sale_type: saleType,
        subtotal,
        discount_amount: discount,
        grand_total: grandTotal,
        status: isDraft ? "draft" : "active",
      })
      .select("id")
      .single();
    if (error || !invoice) {
      setSaving(false);
      notify(`تعذر حفظ الفاتورة: ${error?.message || "خطأ غير معروف"}`);
      return;
    }
    const { error: itemError } = await supabase.from("invoice_items").insert(
      invoiceLines.map((line) => ({
        invoice_id: invoice.id,
        product_id: line.itemType === "product" ? line.productId || null : null,
        service_id: line.itemType === "service" ? line.productId || null : null,
        description: line.description.trim(),
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unitPrice) || 0,
        discount_amount: 0,
      })),
    );
    if (itemError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      setSaving(false);
      notify(`تعذر حفظ تفاصيل الفاتورة: ${itemError.message}`);
      return;
    }
    if (saleType === "installment" && !isDraft) {
      const financedAmount = grandTotal - savedDownPayment;
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          invoice_id: invoice.id,
          contract_number: `CON-${new Date().getFullYear()}-${Date.now()}`,
          customer_id: selectedCustomer.id,
          cash_price: grandTotal,
          installment_price: installmentTotal,
          down_payment: savedDownPayment,
          financed_amount: financedAmount,
          installment_count: savedInstallmentCount,
          frequency_months: 1,
          first_due_date: savedFirstDueDate,
          final_due_date: savedFirstDueDate,
          financier_id: selectedFinancierId,
          agreement_version_id: selectedAgreementId,
          agreement_snapshot: selectedAgreement || null,
          status: "active",
        })
        .select("id")
        .single();
      if (contractError || !contract) {
        setSaving(false);
        notify(`تم حفظ الفاتورة لكن تعذر إنشاء العقد: ${contractError?.message || "خطأ غير معروف"}`);
        return;
      }
      const installmentAmount = Math.ceil(Math.max(0, installmentTotal - savedDownPayment) / savedInstallmentCount);
      const installments = Array.from({ length: savedInstallmentCount }, (_, index) => {
        const due = new Date(`${savedFirstDueDate}T00:00:00`);
        due.setMonth(due.getMonth() + index);
        return {
          contract_id: contract.id,
          installment_number: index + 1,
          due_date: due.toISOString().slice(0, 10),
          original_amount: index === savedInstallmentCount - 1
            ? Math.max(0, installmentTotal - savedDownPayment - installmentAmount * (savedInstallmentCount - 1))
            : installmentAmount,
        };
      });
      const { error: installmentError } = await supabase.from("installments").insert(installments);
      if (installmentError) {
        setSaving(false);
        notify(`تم حفظ الفاتورة والعقد لكن تعذر إنشاء الأقساط: ${installmentError.message}`);
        return;
      }
      if (financedAmount > 0) {
        const { error: allocationError } = await supabase.from("financier_transactions").insert({ financier_id: selectedFinancierId, contract_id: contract.id, transaction_type: "contract_allocation", debit: financedAmount, credit: 0, occurred_at: `${invoiceDate}T00:00:00`, notes: `تخصيص رأس مال للعقد ${contract.id} — ربح متوقع ${financierProfit} د.ع` });
        if (allocationError) notify(`تم إنشاء العقد لكن تعذر تحديث حركة الممول: ${allocationError.message}`);
      }
    }
    if (!isDraft) {
      for (const line of stockLines) {
        const product = catalogProducts.find((item) => item.id === line.productId);
        await supabase.from("products").update({ stock_quantity: Math.max(0, Number(product?.stock_quantity || 0) - Number(line.quantity || 0)) }).eq("id", line.productId);
      }
    }
    const selectedAttachments = Object.entries(attachments).filter(([, file]) => file);
    for (const [category, file] of selectedAttachments) {
      if (!file) continue;
      const storagePath = `${invoice.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("invoice-attachments")
        .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) {
        setSaving(false);
        notify(`تعذر رفع المرفق ${file.name}: ${uploadError.message}`);
        return;
      }
      const { error: attachmentError } = await supabase.from("invoice_attachments").insert({
        invoice_id: invoice.id,
        category,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (attachmentError) {
        setSaving(false);
        notify(`تعذر حفظ بيانات المرفق: ${attachmentError.message}`);
        return;
      }
    }
    notify(isDraft ? `تم حفظ الفاتورة ${invoiceNumber} كمسودة` : `تم اعتماد الفاتورة ${invoiceNumber} بنجاح`);
    onBack();
  };

  return (
    <section className="invoice-page invoice-create-page">
      <button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى الفواتير</button>
      <div className="page-heading"><div><p className="eyebrow">إدارة الأعمال</p><h1>إنشاء فاتورة</h1><p className="subtle">أدخل بيانات البيع وحدد إن كانت الفاتورة نقدية أو بالتقسيط.</p></div><span className="invoice-create-badge">مسودة جديدة</span></div>
      <div className="invoice-wizard-steps">{Array.from({ length: totalSteps }, (_, index) => index + 1).map((step) => <div className={currentStep === step ? "active" : currentStep > step ? "complete" : ""} key={step}><b>{step}</b><span>{step === 1 ? "بيانات الفاتورة" : step === 2 ? "تفاصيل البيع" : saleType === "installment" && step === 3 ? "بيانات التقسيط" : step === attachmentStep ? "المرفقات والتواقيع" : "مراجعة قبل الحفظ"}</span></div>)}</div>
      <form className="invoice-create-form" onSubmit={save}>
        <div className={currentStep === 1 ? "wizard-step" : "wizard-step wizard-step-hidden"}><section className="card invoice-section"><div className="invoice-section-heading"><div><span>الخطوة ١</span><h3>بيانات الفاتورة</h3></div><b className="editable-badge">البيانات قابلة للتعديل</b></div><div className="invoice-meta-grid">
          <label>رقم الفاتورة<input value="يولد تلقائياً عند الحفظ" readOnly /></label>
          <label>تاريخ الفاتورة<input name="invoice_date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label>
          <label>نوع البيع<select name="sale_type" value={saleType} onChange={(event) => { setSaleType(event.target.value as "direct" | "installment"); setCurrentStep(1); }}><option value="direct">بيع نقدي</option><option value="installment">بيع بالتقسيط</option></select></label>
          <label className="customer-picker-label">العميل<input type="hidden" name="customer_id" value={selectedCustomer?.id || ""} /><input value={selectedCustomer ? `${selectedCustomer.full_name} — ${selectedCustomer.phone}` : query} onChange={(event) => { setSelectedCustomer(null); setQuery(event.target.value); }} placeholder="ابحث بالاسم أو رقم الهاتف" autoComplete="off" required />{query && !selectedCustomer && <div className="customer-picker-results">{matches.length ? matches.map((customer) => <button type="button" key={customer.id} onClick={() => { setSelectedCustomer(customer); setQuery(""); }}><strong>{customer.full_name}</strong><span>{customer.phone}</span></button>) : <p>لا يوجد عميل مطابق</p>}</div>}</label>
        </div></section></div>
        <div className={currentStep === 2 ? "wizard-step" : "wizard-step wizard-step-hidden"}><section className="card invoice-section"><div className="invoice-section-heading"><div><span>الخطوة ٢</span><h3>تفاصيل البيع</h3></div><button type="button" className="outline-link" onClick={addLine}><Plus size={15} /> إضافة صف</button></div><div className="invoice-line-table"><div className="invoice-line-head"><span>المنتج أو الخدمة</span><span>الكمية</span><span>سعر الوحدة</span><span>الإجمالي</span><span /></div>{invoiceLines.map((line, index) => <div className="invoice-line-row" key={line.id}><div className="product-picker"><input data-invoice-line-id={line.id} value={line.productId ? line.description : line.productQuery || line.description} onChange={(event) => updateLine(line.id, { productId: "", productQuery: event.target.value, description: event.target.value })} placeholder="ابحث عن منتج أو خدمة" required autoComplete="off" />{line.productQuery && !line.productId && <div className="product-picker-results">{productMatches(line.productQuery).length ? productMatches(line.productQuery).map((item) => <button type="button" key={`${item.itemType}-${item.id}`} onClick={() => updateLine(line.id, { productId: item.id, itemType: item.itemType, productQuery: "", description: item.name, unitPrice: String(item.selling_price || 0) })}><strong>{item.name}</strong><span>{item.itemType === "service" ? "خدمة · لا يوجد مخزون" : `${item.companies?.name || "ماركة غير محددة"} · المتوفر: ${item.stock_quantity || 0}`}</span></button>) : <p>لا يوجد منتج أو خدمة مطابقة</p>}</div>}</div><input inputMode="numeric" dir="ltr" type="text" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: normalizeDigits(event.target.value).replace(/\D/g, "") })} required /><input inputMode="numeric" dir="ltr" type="text" min="1" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: normalizeDigits(event.target.value).replace(/\D/g, "") })} required /><strong>{money.format(Math.max(0, (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)))} د.ع</strong><button type="button" className="remove-line" onClick={() => removeLine(line.id)} aria-label="حذف الصف"><Trash2 size={16} /></button></div>)}</div><p className="attachment-hint">اختر المنتج أو الخدمة من الكتالوج؛ المنتج يُخصم من المخزون والخدمة لا تُخصم.</p></section></div>
        {saleType === "installment" && <div className={currentStep === 3 ? "wizard-step" : "wizard-step wizard-step-hidden"}><section className="card invoice-section"><div className="invoice-section-heading"><div><span>الخطوة ٣</span><h3>بيانات التقسيط والتمويل</h3></div><b>تُستخدم اتفاقية الممول تلقائياً إذا كانت واحدة</b></div><div className="invoice-meta-grid"><label>الممول<select value={selectedFinancierId} onChange={(event) => { const financierId = event.target.value; const agreements = financierAgreements.filter((agreement) => agreement.financier_id === financierId); setSelectedFinancierId(financierId); setSelectedAgreementId(agreements.length === 1 ? agreements[0].id : ""); }} required><option value="">اختر الممول</option>{financiers.map((financier) => { const available = financierBalances[financier.id] || 0; const required = Math.max(0, grandTotal - downPayment); const ready = !financierBalancesLoaded || available >= required; return <option key={financier.id} value={financier.id} disabled={!ready}>{financier.name} — {financier.financier_number}{financierBalancesLoaded ? (ready ? ` — متاح: ${money.format(available)} د.ع` : ` — غير جاهز، المتاح ${money.format(available)} د.ع`) : ""}</option>; })}</select></label>{availableFinancierAgreements.length > 1 && <label>اتفاقية التمويل<select value={selectedAgreementId} onChange={(event) => setSelectedAgreementId(event.target.value)} required><option value="">اختر الاتفاقية</option>{availableFinancierAgreements.map((agreement) => <option key={agreement.id} value={agreement.id}>V{agreement.version} — سارية من {agreement.effective_from}</option>)}</select></label>}{availableFinancierAgreements.length === 1 && <div className="selected-agreement-note"><span>اتفاقية التمويل</span><b>V{availableFinancierAgreements[0].version} — مختارة تلقائياً</b></div>}<label>الدفعة الأولى<input name="down_payment" inputMode="numeric" dir="ltr" type="text" min="0" value={downPayment} onChange={(event) => setDownPayment(Math.max(0, Number(normalizeDigits(event.target.value)) || 0))} /></label><label>عدد الأقساط<input name="installment_count" inputMode="numeric" dir="ltr" type="text" min="1" value={installmentCount} onChange={(event) => setInstallmentCount(Math.max(1, Number(normalizeDigits(event.target.value)) || 1))} /></label><label>أول استحقاق<input name="first_due_date" type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} required /></label></div><div className="installment-calculation-summary"><div><span>السعر النهائي للفاتورة</span><b>{money.format(installmentTotal)} د.ع</b></div><div><span>عدد الأقساط</span><b>{installmentCount}</b></div><div><span>قيمة كل دفعة</span><b>{money.format(installmentAmount)} د.ع</b></div></div></section></div>}
        <div className={currentStep === attachmentStep ? "wizard-step" : "wizard-step wizard-step-hidden"}><section className="card invoice-section"><div className="invoice-section-heading"><div><span>الخطوة {attachmentStep}</span><h3>المرفقات والتواقيع</h3></div><b>اختياري ويمكن إكماله لاحقاً</b></div><p className="attachment-hint">ارفع المستندات أو صور التواقيع المرتبطة بهذه الفاتورة.</p><div className="attachment-grid">{[["identity","هوية العميل"],["contract","العقد أو المستند"],["payment_receipt","وصل الدفعة"],["customer_signature","توقيع العميل"],["staff_signature","توقيع الموظف"],["other","مرفق آخر"]].map(([category, label]) => <label className="attachment-field" key={category}><span>{label}</span><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setAttachments((current) => ({ ...current, [category]: event.target.files?.[0] || null }))} />{attachments[category] && <small>{attachments[category]?.name}</small>}</label>)}</div></section></div>
        <div className={currentStep === previewStep ? "wizard-step" : "wizard-step wizard-step-hidden"}><section className="card invoice-section invoice-preview"><div className="invoice-section-heading"><div><span>الخطوة {previewStep}</span><h3>مراجعة قبل الحفظ</h3></div><b className="editable-badge">تأكد من البيانات قبل الاعتماد</b></div><div className="preview-grid"><div><span>العميل</span><b>{selectedCustomer?.full_name || "—"}</b></div><div><span>نوع البيع</span><b>{saleType === "installment" ? "بيع بالتقسيط" : "بيع نقدي"}</b></div><div><span>عدد البنود</span><b>{invoiceLines.length}</b></div><div><span>سعر الفاتورة الأساسي</span><b>{money.format(grandTotal)} د.ع</b></div>{saleType === "installment" && <><div className="preview-highlight"><span>ربح الممول</span><b>{money.format(financierProfit)} د.ع</b></div><div className="preview-highlight"><span>السعر النهائي للتقسيط</span><b>{money.format(installmentTotal)} د.ع</b></div><div><span>الدفعة الأولى</span><b>{money.format(downPayment)} د.ع</b></div><div><span>المتبقي للتقسيط</span><b>{money.format(Math.max(0, installmentTotal - downPayment))} د.ع</b></div><div><span>عدد الأقساط</span><b>{installmentCount}</b></div><div><span>قيمة كل دفعة</span><b>{money.format(installmentAmount)} د.ع</b></div><div><span>أول استحقاق</span><b>{firstDueDate || "—"}</b></div></>}{saleType === "direct" && <div><span>الإجمالي النهائي</span><b>{money.format(grandTotal)} د.ع</b></div>}<div><span>البيان</span><b>{lineSummary || "—"}</b></div></div><div className="preview-files"><span>المرفقات المختارة</span><b>{Object.values(attachments).filter(Boolean).length ? Object.values(attachments).filter(Boolean).map((file) => file?.name).join("، ") : "لا توجد مرفقات"}</b></div></section></div>
        {currentStep === 2 && <div className="invoice-total-bar"><div><span>قبل الخصم</span><b>{money.format(subtotal)} د.ع</b></div><div><span>خصم على الإجمالي</span><input value={invoiceDiscount} onChange={(event) => setInvoiceDiscount(Math.min(subtotal, Math.max(0, Number(normalizeDigits(event.target.value).replace(/\D/g, "")) || 0)))} inputMode="numeric" dir="ltr" type="text" placeholder="0" /><small>خصم الأصناف: {money.format(lineDiscount)} د.ع</small></div><div><span>إجمالي الخصم</span><b>{money.format(discount)} د.ع</b></div><div className="grand-total"><span>الإجمالي النهائي</span><b>{money.format(grandTotal)} د.ع</b></div></div>}
        <div className="invoice-create-actions"><button type="button" className="secondary-btn" onClick={currentStep === 1 ? onBack : () => setCurrentStep((step) => step - 1)}>{currentStep === 1 ? "إلغاء" : "رجوع"}</button>{currentStep < totalSteps ? <button type="button" className="primary-btn" onClick={(event) => nextStep(event.currentTarget.form!)}>التالي</button> : <><button type="submit" name="save_mode" value="draft" className="secondary-btn" disabled={saving}>حفظ كمسودة</button><button type="submit" name="save_mode" value="active" className="primary-btn" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ واعتماد الفاتورة"}</button></>}</div>
      </form>
    </section>
  );
}

function InvoiceProfilePage({
  invoiceNumber,
  onBack,
  notify,
}: {
  invoiceNumber: string;
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id,invoice_number,invoice_date,created_at,sale_type,subtotal,discount_amount,grand_total,status,customers(full_name,phone),invoice_items(description,quantity,unit_price,discount_amount)",
        )
        .eq("invoice_number", invoiceNumber)
        .single();
      if (error || !data) {
        notify(`تعذر تحميل الفاتورة: ${error?.message || "غير موجودة"}`);
        setLoading(false);
        return;
      }
      let contract = null;
      if (data.sale_type === "installment") {
        const result = await supabase
          .from("contracts")
          .select(
            "contract_number,down_payment,financed_amount,installment_count,first_due_date,final_due_date,status,installments(installment_number,due_date,original_amount,status)",
          )
          .eq("invoice_id", data.id)
          .maybeSingle();
        contract = result.data;
      }
      setInvoice({ ...data, contract });
      setLoading(false);
    };
    loadInvoice();
  }, [invoiceNumber, notify]);

  if (loading)
    return <section className="invoice-page"><div className="no-results">جارٍ تحميل بيانات الفاتورة...</div></section>;
  if (!invoice)
    return <section className="invoice-page"><button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى الفواتير</button><div className="no-results">لم يتم العثور على الفاتورة.</div></section>;

  const isInstallment = invoice.sale_type === "installment";
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString("en-CA") : "—";
  const contract = invoice.contract;
  const installments = contract?.installments || [];

  return (
    <section className="invoice-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} /> العودة إلى الفواتير
      </button>
      <div className="customer-heading invoice-heading">
        <div className="customer-avatar"><ReceiptText size={25} /></div>
        <div>
          <p className="eyebrow">تفاصيل الفاتورة</p>
          <h1>{invoice.invoice_number}</h1>
          <span className="customer-status">{isInstallment ? "بيع بالتقسيط" : "بيع نقدي"}</span>
        </div>
        <div className="customer-actions">
          <button className="outline-link" onClick={() => notify("سيتم تفعيل تعديل الفاتورة قريباً")}>تعديل الفاتورة</button>
        </div>
      </div>
      <div className="invoice-info-grid">
        <article className="card invoice-info-card"><span>العميل</span><b>{invoice.customers?.full_name || "—"}</b><small>{invoice.customers?.phone || "—"}</small></article>
        <article className="card invoice-info-card"><span>تاريخ الفاتورة</span><b>{invoice.invoice_date || "—"}</b><small>التاريخ الذي حدده المستخدم</small></article>
        <article className="card invoice-info-card"><span>تاريخ الإنشاء</span><b>{formatDate(invoice.created_at)}</b><small>سُجل تلقائياً بالنظام</small></article>
        <article className="card invoice-info-card"><span>الحالة</span><b>{invoice.status === "active" ? "معتمد" : invoice.status}</b><small>{isInstallment ? "عقد وأقساط مرتبطة" : "فاتورة بيع نقدي"}</small></article>
      </div>
      <article className="card invoice-details-card">
        <div className="section-title"><div><h2>بنود الفاتورة</h2><p>تفاصيل المنتجات والمبالغ المسجلة</p></div><strong className="invoice-detail-total">{money.format(invoice.grand_total)} د.ع</strong></div>
        <div className="invoice-detail-lines">
          {(invoice.invoice_items || []).map((item: any, index: number) => <div className="invoice-detail-line" key={`${item.description}-${index}`}><span>{item.description}</span><small>{item.quantity} × {money.format(item.unit_price)} د.ع</small><b>{money.format(item.quantity * item.unit_price - (item.discount_amount || 0))} د.ع</b></div>)}
        </div>
        <div className="invoice-breakdown"><span>قبل الخصم <b>{money.format(invoice.subtotal)} د.ع</b></span><span>الخصم <b>{money.format(invoice.discount_amount)} د.ع</b></span><span>الإجمالي <b>{money.format(invoice.grand_total)} د.ع</b></span></div>
      </article>
      {isInstallment && contract ? (
        <article className="card invoice-details-card">
          <div className="section-title"><div><h2>تفاصيل التقسيط</h2><p>العقد وجدول الاستحقاقات المرتبطان بهذه الفاتورة</p></div><strong>{contract.contract_number}</strong></div>
          <div className="invoice-info-grid installment-summary">
            <div><span>الدفعة الأولى</span><b>{money.format(contract.down_payment)} د.ع</b></div>
            <div><span>المبلغ المموّل</span><b>{money.format(contract.financed_amount)} د.ع</b></div>
            <div><span>عدد الأقساط</span><b>{contract.installment_count}</b></div>
            <div><span>أول استحقاق</span><b>{contract.first_due_date}</b></div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>القسط</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>{installments.map((item: any) => <tr key={item.installment_number}><td>{item.installment_number}</td><td>{item.due_date}</td><td>{money.format(item.original_amount)} د.ع</td><td>{item.status}</td></tr>)}</tbody></table></div>
        </article>
      ) : !isInstallment ? (
        <article className="card invoice-details-card cash-invoice-card"><h2>بيانات البيع النقدي</h2><p>هذه الفاتورة لا تحتوي على عقد أو جدول أقساط، ويتم تحصيلها كبيع نقدي.</p></article>
      ) : null}
    </section>
  );
}

function CustomerProfilePage({
  customer,
  onBack,
  notify,
}: {
  customer: string[];
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const [initialName, initialPhone, initialGovernorate = "نينوى"] = customer;
  const [displayName, setDisplayName] = useState(initialName);
  const [displayPhone, setDisplayPhone] = useState(initialPhone);
  const [customerNumber, setCustomerNumber] = useState("");
  const [tab, setTab] = useState<"basic" | "contracts" | "payments">("basic");
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState("");
  const [paymentReferences, setPaymentReferences] = useState<any[]>([]);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [paymentNotes, setPaymentNotes] = useState("");
  const [profileInvoices, setProfileInvoices] = useState<any[]>([]);
  const [profileContracts, setProfileContracts] = useState<any[]>([]);
  const [profileInstallments, setProfileInstallments] = useState<any[]>([]);
  const [profilePayments, setProfilePayments] = useState<any[]>([]);
  const [profilePaidTotal, setProfilePaidTotal] = useState(0);
  const [profileOutstanding, setProfileOutstanding] = useState(0);
  const [profileNextInstallment, setProfileNextInstallment] = useState<any | null>(null);
  const [details, setDetails] = useState({
    governorate: initialGovernorate,
    address: "—",
    alternative_phone: "—",
    district: "—",
    notes: "—",
    created_at: "—",
  });

  const loadDetails = async (lookupPhone = displayPhone) => {
    const { data } = await supabase
      .from("customers")
      .select(
        "id,customer_number,full_name,phone,governorate,address,alternative_phone,district,notes,created_at",
      )
      .eq("phone", lookupPhone)
      .single();
    if (data) {
      setDisplayName(data.full_name || initialName);
      setDisplayPhone(data.phone || lookupPhone);
      setCustomerNumber(data.customer_number || "");
      setPaymentCustomerId(data.id);
      setDetails({
        governorate: data.governorate || "—",
        address: data.address || "—",
        alternative_phone: data.alternative_phone || "—",
        district: data.district || "—",
        notes: data.notes || "—",
        created_at: data.created_at
          ? new Intl.DateTimeFormat("ar-IQ", { dateStyle: "long" }).format(
              new Date(data.created_at),
            )
          : "—",
      });
      const [{ data: invoiceRows }, { data: contractRows }] = await Promise.all([
        supabase.from("invoices").select("id,invoice_number,invoice_date,grand_total,sale_type,status").eq("customer_id", data.id).order("created_at", { ascending: false }),
        supabase.from("contracts").select("id,contract_number,contract_date,installment_price,down_payment,financed_amount,installment_count,first_due_date,status,invoice_id").eq("customer_id", data.id),
      ]);
      const contractIds = (contractRows || []).map((contract) => contract.id);
      const { data: installmentRows } = contractIds.length
        ? await supabase.from("installments").select("id,contract_id,installment_number,due_date,original_amount,status").in("contract_id", contractIds)
        : { data: [] };
      const contractMap = Object.fromEntries((contractRows || []).map((contract) => [contract.id, contract]));
      setPaymentReferences([
        ...(invoiceRows || []).filter((invoice) => invoice.sale_type === "direct").map((invoice) => ({ value: `invoice:${invoice.id}`, label: `${invoice.invoice_number} — ${money.format(invoice.grand_total)} د.ع` })),
        ...(installmentRows || []).map((installment) => ({ value: `installment:${installment.id}`, label: `${contractMap[installment.contract_id]?.contract_number || "عقد"} — القسط ${installment.installment_number} — ${money.format(installment.original_amount)} د.ع` })),
      ]);
      const { data: paymentRows } = await supabase.from("payments").select("id,payment_number,amount,payment_date,payment_method,invoice_id,contract_id,notes,invoices(invoice_number)").eq("customer_id", data.id).eq("status", "active").order("payment_date", { ascending: false });
      const paymentIds = (paymentRows || []).map((payment) => payment.id);
      const { data: allocationRows } = paymentIds.length
        ? await supabase.from("payment_allocations").select("payment_id,installment_id,invoice_id,amount").in("payment_id", paymentIds)
        : { data: [] };
      const loadedInvoices = invoiceRows || [];
      const loadedContracts = contractRows || [];
      const loadedInstallments = (installmentRows || []).map((installment) => ({ ...installment, contract: contractMap[installment.contract_id] }));
      const loadedPayments = paymentRows || [];
      setProfileInvoices(loadedInvoices);
      setProfileContracts(loadedContracts);
      setProfileInstallments(loadedInstallments);
      setProfilePayments(loadedPayments);
      const paidTotal = loadedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const allocations = allocationRows || [];
      const installmentPaid = Object.fromEntries(loadedInstallments.map((installment) => [installment.id, allocations.filter((allocation) => allocation.installment_id === installment.id).reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0)]));
      const invoicePaid = Object.fromEntries(loadedInvoices.map((invoice) => [invoice.id, allocations.filter((allocation) => allocation.invoice_id === invoice.id).reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0)]));
      const outstanding = loadedInstallments.reduce((sum, installment) => sum + Math.max(0, Number(installment.original_amount || 0) - (installmentPaid[installment.id] || 0)), 0) + loadedInvoices.filter((invoice) => invoice.sale_type === "direct").reduce((sum, invoice) => sum + Math.max(0, Number(invoice.grand_total || 0) - (invoicePaid[invoice.id] || 0)), 0);
      setProfilePaidTotal(paidTotal);
      setProfileOutstanding(outstanding);
      setProfileNextInstallment([...loadedInstallments].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null);
    }
  };

  useEffect(() => {
    loadDetails(initialPhone);
  }, [initialPhone]);

  const saveCustomer = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const full_name = String(values.get("full_name") || "").trim();
    const phoneValue = normalizeDigits(String(values.get("phone") || ""))
      .replace(/\D/g, "")
      .slice(0, 11);
    const alternative_phone = normalizeDigits(
      String(values.get("alternative_phone") || ""),
    )
      .replace(/\D/g, "")
      .slice(0, 11);
    const address = String(values.get("address") || "").trim();
    const governorate = String(values.get("governorate") || "").trim();
    const district = String(values.get("district") || "").trim();
    if (
      !full_name ||
      !phoneValue ||
      phoneValue.length > 11 ||
      !alternative_phone ||
      !address ||
      !governorate ||
      !district
    ) {
      notify("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }
    const { error } = await supabase
      .from("customers")
      .update({
        full_name,
        phone: phoneValue,
        alternative_phone,
        address,
        governorate,
        district,
      })
      .eq("phone", displayPhone);
    if (error) {
      notify(`تعذر تحديث العميل: ${error.message}`);
      return;
    }
    setDisplayName(full_name);
    setDisplayPhone(phoneValue);
    setDetails((current) => ({
      ...current,
      governorate,
      address,
      alternative_phone,
      district,
    }));
    setEditOpen(false);
    notify("تم تحديث بيانات العميل بنجاح");
  };

  const saveProfilePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [kind, id] = paymentReference.split(":");
    const normalizedAmount = Number(normalizeDigits(paymentAmount).replace(/\D/g, ""));
    if (!paymentCustomerId || !id || !normalizedAmount) {
      notify("اختر الفاتورة أو القسط وأدخل مبلغاً صحيحاً");
      return;
    }
    const { data, error } = await supabase.rpc("record_payment", {
      p_customer_id: paymentCustomerId,
      p_invoice_id: kind === "invoice" ? id : null,
      p_installment_id: kind === "installment" ? id : null,
      p_amount: normalizedAmount,
      p_payment_method: paymentMethod,
      p_payment_date: paymentDate,
      p_notes: paymentNotes.trim() || null,
    });
    if (error) {
      notify(`تعذر تسجيل الدفعة: ${error.message}`);
      return;
    }
    setPaymentOpen(false);
    setPaymentReference("");
    setPaymentAmount("");
    setPaymentNotes("");
    await loadDetails();
    notify(`تم تسجيل سند القبض ${data?.[0]?.receipt_number || "بنجاح"}`);
  };

  const today = new Date().toISOString().slice(0, 10);
  const getInstallmentStatus = (installment: any) => {
    if (installment.status === "paid") return "paid";
    if (installment.status === "partially_paid") return "partially_paid";
    if (installment.due_date && installment.due_date < today) return "overdue";
    return installment.status || "upcoming";
  };
  const overdueInstallments = profileInstallments.filter(
    (installment) => getInstallmentStatus(installment) === "overdue",
  );
  const openInstallments = profileInstallments.filter(
    (installment) => getInstallmentStatus(installment) !== "paid",
  );

  return (
    <section className="customer-page">
      <button className="back-link" onClick={onBack}>
        <ChevronRight size={18} />
        العودة إلى العملاء
      </button>
      <div className="customer-heading">
        <div className="customer-avatar">
          {displayName
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="eyebrow">ملف العميل</p>
          <h1>{displayName}</h1>
          <span className="customer-status">نشط</span>
        </div>
        <div className="customer-actions">
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>
            تسجيل دفعة
          </Button>
          <Button onClick={() => {
            window.localStorage.setItem("shams-erp-invoice-customer-phone", displayPhone);
            window.localStorage.setItem("shams-erp-invoice-return-path", customerNumber ? `/customers/${customerNumber}` : "/customers");
            window.history.pushState({}, "", "/sales/new");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}>
            <Plus size={16} />
            إنشاء عقد
          </Button>
        </div>
      </div>
      <section className="customer-metrics">
        <article><span>الرصيد المستحق</span><strong>{money.format(profileOutstanding)} د.ع</strong><small>المتبقي على العميل</small></article>
        <article><span>إجمالي المدفوعات</span><strong>{money.format(profilePaidTotal)} د.ع</strong><small>كل التحصيلات المسجلة</small></article>
        <article><span>العقود والفواتير</span><strong>{profileContracts.length + profileInvoices.length}</strong><small>{profileContracts.length} عقد · {profileInvoices.length} فاتورة</small></article>
        <article><span>القسط القادم</span><strong>{profileNextInstallment ? `${money.format(profileNextInstallment.original_amount)} د.ع` : "لا يوجد"}</strong><small>{profileNextInstallment?.due_date || "لا توجد أقساط قادمة"}</small></article>
      </section>
      <div className="profile-tabs" role="tablist">
        <button
          className={tab === "basic" ? "active" : ""}
          onClick={() => setTab("basic")}
        >
          المعلومات الأساسية
        </button>
        <button
          className={tab === "contracts" ? "active" : ""}
          onClick={() => setTab("contracts")}
        >
          العقود والفواتير
        </button>
        <button
          className={tab === "payments" ? "active" : ""}
          onClick={() => setTab("payments")}
        >
          الدفعات
        </button>
      </div>
      {tab === "basic" && (
        <div className="customer-grid profile-tab-panel">
          <article className="card customer-details">
            <div className="section-title">
              <div>
                <h2>المعلومات الأساسية</h2>
                <p>كل البيانات المسجلة لهذا العميل</p>
              </div>
              <button
                className="outline-link"
                onClick={() => setEditOpen(true)}
              >
                تعديل
              </button>
            </div>
            <dl>
              <div>
                <dt>
                  <Phone size={16} />
                  رقم الهاتف
                </dt>
                <dd>{displayPhone || "—"}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={16} />
                  هاتف بديل
                </dt>
                <dd>{details.alternative_phone}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  المحافظة
                </dt>
                <dd>{details.governorate}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  العنوان التفصيلي
                </dt>
                <dd>{details.address}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  القضاء/الناحية
                </dt>
                <dd>{details.district}</dd>
              </div>
              <div>
                <dt>
                  <FileText size={16} />
                  تاريخ التسجيل
                </dt>
                <dd>{details.created_at}</dd>
              </div>
            </dl>
          </article>
          <article className="card customer-note">
            <div className="section-title">
              <div>
                <h2>ملاحظة الحساب</h2>
                <p>{details.notes === "—" ? "لا توجد ملاحظات" : "ملاحظة مسجلة"}</p>
              </div>
            </div>
            <p>
              {details.notes === "—"
                ? "لم تتم إضافة ملاحظات لهذا العميل بعد."
                : details.notes}
            </p>
            <div className="customer-account-summary">
              <div><span>الدفعات المستلمة</span><b>{money.format(profilePaidTotal)} د.ع</b></div>
              <div><span>الأقساط المتأخرة</span><b>{overdueInstallments.length}</b></div>
              <div><span>الأقساط المتبقية</span><b>{openInstallments.length}</b></div>
            </div>
          </article>
        </div>
      )}
      {tab === "contracts" && (
        <article className="card customer-contracts profile-tab-panel">
          <div className="section-title">
            <div>
              <h2>العقود والفواتير</h2>
              <p>العقود والفواتير المرتبطة بهذا العميل</p>
            </div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>{profileInvoices.filter((invoice) => invoice.sale_type === "direct").map((invoice) => <tr key={invoice.id}><td>{invoice.invoice_number}</td><td>بيع نقدي</td><td>{invoice.invoice_date || "—"}</td><td>{money.format(invoice.grand_total)} د.ع</td><td><span className="status-pill">{invoice.status === "completed" ? "مكتمل" : "فعال"}</span></td></tr>)}{profileContracts.map((contract) => <tr key={contract.id}><td>{contract.contract_number}</td><td>عقد تقسيط</td><td>{contract.contract_date || "—"}</td><td>{money.format(contract.installment_price || 0)} د.ع</td><td><span className="status-pill">{contract.status === "completed" ? "مكتمل" : "فعال"}</span></td></tr>)}</tbody></table>{!profileInvoices.filter((invoice) => invoice.sale_type === "direct").length && !profileContracts.length && <div className="no-results">لا توجد عقود أو فواتير مسجلة لهذا العميل.</div>}</div>
          {!!profileInstallments.length && <div className="profile-installments"><h3>جدول الأقساط</h3><div className="table-wrap"><table><thead><tr><th>القسط</th><th>الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>{profileInstallments.map((installment) => { const status = getInstallmentStatus(installment); return <tr key={installment.id}><td>{installment.contract?.contract_number || "—"} — {installment.installment_number}</td><td>{installment.due_date}</td><td>{money.format(installment.original_amount)} د.ع</td><td><span className={`status-pill ${status === "overdue" ? "status-danger" : ""}`}>{{ upcoming: "قادم", due: "مستحق", partially_paid: "مدفوع جزئياً", paid: "مدفوع", overdue: "متأخر" }[status] || status}</span></td></tr>; })}</tbody></table></div></div>}
        </article>
      )}
      {tab === "payments" && (
        <article className="card customer-contracts profile-tab-panel">
          <div className="section-title">
            <div>
              <h2>الدفعات</h2>
              <p>سجل الدفعات والتحصيلات الخاصة بهذا العميل ({profilePayments.length})</p>
            </div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>رقم الدفعة</th><th>المرجع</th><th>المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead><tbody>{profilePayments.map((payment) => <tr key={payment.id}><td>{payment.payment_number}</td><td>{payment.invoices?.invoice_number || "قسط / عقد"}</td><td>{money.format(payment.amount)} د.ع</td><td>{{ cash: "نقدي", bank_transfer: "تحويل مصرفي", pos: "POS", other: "أخرى" }[payment.payment_method] || payment.payment_method}</td><td>{String(payment.payment_date || "—").slice(0, 10)}</td></tr>)}</tbody></table>{!profilePayments.length && <div className="no-results">لا توجد دفعات مسجلة لهذا العميل.</div>}</div>
        </article>
      )}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="erp-dialog collection-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading"><DialogHeader><DialogTitle>تسجيل دفعة</DialogTitle><DialogDescription>سجّل الدفعة من داخل ملف العميل مباشرة.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div>
          <form onSubmit={saveProfilePayment}>
            <div className="form-grid">
              <label>الفاتورة أو القسط<select value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} required><option value="">اختر المرجع</option>{paymentReferences.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label>مبلغ الدفعة<input value={paymentAmount} onChange={(event) => setPaymentAmount(normalizeDigits(event.target.value).replace(/\D/g, ""))} inputMode="numeric" type="text" placeholder="مثال: 850000" required /></label>
              <label>طريقة الدفع<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">نقدي</option><option value="bank_transfer">تحويل مصرفي</option><option value="pos">POS</option><option value="other">أخرى</option></select></label>
              <label>تاريخ التحصيل<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label>
              <label>ملاحظات<input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="اختياري" /></label>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>إلغاء</Button><Button type="submit">حفظ الدفعة</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="erp-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading">
            <DialogHeader>
              <DialogTitle>تعديل بيانات العميل</DialogTitle>
              <DialogDescription>
                حدّث بيانات الاتصال والعنوان المحفوظة لهذا العميل.
              </DialogDescription>
            </DialogHeader>
            <DialogClose className="dialog-close" aria-label="إغلاق">
              <X size={18} />
            </DialogClose>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveCustomer(event.currentTarget);
            }}
          >
            <div className="form-grid">
              <label>
                الاسم الكامل
                <input name="full_name" defaultValue={displayName} required />
              </label>
              <label>
                رقم الهاتف
                <input
                  name="phone"
                  inputMode="numeric"
                  maxLength={11}
                  defaultValue={displayPhone}
                  required
                />
              </label>
              <label>
                الهاتف البديل
                <input
                  name="alternative_phone"
                  inputMode="numeric"
                  maxLength={11}
                  defaultValue={
                    details.alternative_phone === "—"
                      ? ""
                      : details.alternative_phone
                  }
                  required
                />
              </label>
              <label>
                المحافظة
                <select
                  name="governorate"
                  defaultValue={details.governorate}
                  required
                >
                  {iraqiGovernorates.map((governorate) => (
                    <option key={governorate} value={governorate}>
                      {governorate}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                القضاء/الناحية
                <input
                  name="district"
                  defaultValue={
                    details.district === "—" ? "" : details.district
                  }
                  required
                />
              </label>
              <label>
                العنوان التفصيلي
                <input
                  name="address"
                  defaultValue={details.address === "—" ? "" : details.address}
                  required
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">حفظ التعديل</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FinancierFinancialProfileView(props: any) {
  const { financier, agreements, investments, transactions, fundedContracts, totalInvestments, realizedProfit, allocatedCapital, withdrawnAmount, availableBalance, openInvestment, setOpenInvestment, investmentAttachment, setInvestmentAttachment, saveInvestment, openWithdrawal, setOpenWithdrawal, withdrawalAttachment, setWithdrawalAttachment, saveWithdrawal, openAgreement, setOpenAgreement, saveAgreement, onBack } = props;
  const [tab, setTab] = useState<"basic" | "agreements" | "investments" | "financial" | "contracts">("basic");
  const typeLabel = (type: string) => ({ fixed_profit: "ربح ثابت", profit_percentage: "نسبة مئوية", custom: "مخصص" } as Record<string, string>)[type] || type;
  const paymentLabel = (method: string) => ({ cash: "نقدي", bank_transfer: "تحويل مصرفي", pos: "POS", other: "أخرى" } as Record<string, string>)[method] || method;
  const expectedProfit = fundedContracts.reduce((total, contract) => total + Math.max(0, Number(contract.installment_price || 0) - Number(contract.cash_price || 0)), 0);
  const contractCollection = (contract: any) => {
    const today = new Date().toISOString().slice(0, 10);
    const installments = contract.installments || [];
    const received = Number(contract.down_payment || 0) + installments.reduce((sum: number, installment: any) => sum + Number(installment.paid_amount || 0), 0);
    const remaining = Math.max(0, Number(contract.installment_price || 0) - received);
    const overdue = installments.filter((installment: any) => installment.status !== "paid" && installment.due_date && installment.due_date < today).reduce((sum: number, installment: any) => sum + Math.max(0, Number(installment.original_amount || 0) - Number(installment.paid_amount || 0)), 0);
    return { received, remaining, overdue, openInstallments: installments.filter((installment: any) => installment.status !== "paid").length };
  };
  useEffect(() => {
    if (tab !== "contracts") return;
    const table = Array.from(document.querySelectorAll<HTMLTableElement>(".customer-contracts table")).find((candidate) => candidate.textContent?.includes("فاتورة التمويل"));
    const header = table?.querySelector("thead tr");
    if (!table || !header) return;
    table.querySelectorAll(".financier-derived-col").forEach((cell) => cell.remove());
    table.querySelectorAll(".financier-status-action").forEach((cell) => cell.remove());
    const hiddenLabels = ["تاريخ العقد", "قيمة العقد", "ربح الممول", "رأس المال الممول", "الأقساط المتبقية", "الحالة"];
    const hiddenIndexes = Array.from(header.children)
      .map((cell, index) => hiddenLabels.some((label) => (cell.textContent || "").includes(label)) ? index : -1)
      .filter((index) => index >= 0)
      .reverse();
    hiddenIndexes.forEach((index) => {
      header.children[index]?.remove();
      table.querySelectorAll("tbody tr").forEach((row) => row.children[index]?.remove());
    });
    ["المستلم", "المتبقي", "المتأخر", "الأقساط المفتوحة"].forEach((label) => {
      const cell = document.createElement("th");
      cell.className = "financier-derived-col";
      cell.textContent = label;
      header.appendChild(cell);
    });
    const actionHeader = document.createElement("th");
    actionHeader.className = "financier-status-action";
    actionHeader.textContent = "الإجراء";
    header.appendChild(actionHeader);
    table.querySelectorAll("tbody tr").forEach((row, index) => {
      const summary = contractCollection(fundedContracts[index]);
      [
        `${money.format(summary.received)} د.ع`,
        `${money.format(summary.remaining)} د.ع`,
        summary.overdue ? `${money.format(summary.overdue)} د.ع` : "—",
        String(summary.openInstallments),
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.className = "financier-derived-col";
        cell.textContent = value;
        row.appendChild(cell);
      });
      const actionCell = document.createElement("td");
      actionCell.className = "financier-status-action";
      const action = document.createElement("button");
      action.className = "outline-link financier-contract-status-button";
      action.textContent = "حالة العقد";
      action.addEventListener("click", () => {
        const selected = fundedContracts[index];
        if (!selected) return;
        document.querySelector(".financier-contract-status-overlay")?.remove();
        const summary = contractCollection(selected);
        const overlay = document.createElement("div");
        overlay.className = "financier-contract-status-overlay";
        const installments = selected.installments || [];
        const statusLabel: Record<string, string> = { paid: "مدفوع", overdue: "متأخر", partially_paid: "مدفوع جزئياً", upcoming: "قادم", due: "مستحق" };
        overlay.innerHTML = `<div class="financier-contract-status-dialog" dir="rtl"><button class="financier-contract-status-close">×</button><h2>حالة العقد</h2><p class="contract-status-subtitle">${selected.contract_number || "—"} — ${selected.customers?.full_name || "—"}</p><div class="contract-status-summary"><div><span>قيمة العقد</span><b>${money.format(selected.installment_price || 0)} د.ع</b></div><div><span>المستلم</span><b>${money.format(summary.received)} د.ع</b></div><div><span>المتبقي</span><b>${money.format(summary.remaining)} د.ع</b></div><div><span>المتأخر</span><b>${summary.overdue ? `${money.format(summary.overdue)} د.ع` : "لا يوجد"}</b></div></div><h3>تفاصيل الأقساط والدفعات</h3><div class="table-wrap"><table><thead><tr><th>القسط</th><th>الاستحقاق</th><th>قيمة القسط</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${installments.map((installment: any) => { const paid = Number(installment.paid_amount || 0); const remaining = Math.max(0, Number(installment.original_amount || 0) - paid); const status = installment.status !== "paid" && installment.due_date && installment.due_date < new Date().toISOString().slice(0, 10) ? "overdue" : installment.status || "upcoming"; return `<tr><td>${installment.installment_number}</td><td>${installment.due_date || "—"}</td><td>${money.format(installment.original_amount || 0)} د.ع</td><td>${money.format(paid)} د.ع</td><td>${money.format(remaining)} د.ع</td><td>${statusLabel[status] || status}</td></tr>`; }).join("") || `<tr><td colspan="6">لا توجد أقساط مسجلة</td></tr>`}</tbody></table></div></div>`;
        document.body.appendChild(overlay);
        overlay.querySelector(".financier-contract-status-close")?.addEventListener("click", () => overlay.remove());
        overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
      });
      actionCell.appendChild(action);
      row.appendChild(actionCell);
    });
  }, [tab, fundedContracts]);
  return <section className="module-page financier-profile-page"><button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى الممولين</button><div className="customer-heading"><div className="customer-avatar">{financier.name.slice(0, 2)}</div><div><p className="eyebrow">ملف الممول</p><h1>{financier.name}</h1><span className="customer-status">{financier.status === "active" ? "نشط" : financier.status}</span></div><div className="customer-actions"><Button onClick={() => setOpenAgreement(true)}>إضافة اتفاقية</Button><Button onClick={() => setOpenInvestment(true)}>إضافة استثمار</Button><Button variant="outline" onClick={() => setOpenWithdrawal(true)}>تسجيل سحب</Button></div></div><section className="customer-metrics"><article><span>رأس المال المستثمر</span><strong>{money.format(totalInvestments)} د.ع</strong><small>{investments.length} استثمار</small></article><article><span>الأرباح المتوقعة</span><strong>{money.format(expectedProfit)} د.ع</strong><small>من العقود الممولة</small></article><article><span>المستخدم بالعقود</span><strong>{money.format(allocatedCapital)} د.ع</strong><small>رأس مال موزع</small></article><article><span>المتاح للسحب</span><strong>{money.format(Math.max(availableBalance, 0))} د.ع</strong><small>بعد خصم السحوبات</small></article></section><div className="financier-profile-tabs"><button className={tab === "basic" ? "active" : ""} onClick={() => setTab("basic")}>المعلومات الأساسية</button><button className={tab === "agreements" ? "active" : ""} onClick={() => setTab("agreements")}>اتفاقيات التمويل <span>{agreements.length}</span></button><button className={tab === "investments" ? "active" : ""} onClick={() => setTab("investments")}>الاستثمارات <span>{investments.length}</span></button><button className={tab === "financial" ? "active" : ""} onClick={() => setTab("financial")}>الحساب المالي</button><button className={tab === "contracts" ? "active" : ""} onClick={() => setTab("contracts")}>العقود الممولة <span>{fundedContracts.length}</span></button></div>{tab === "basic" && <div className="customer-grid"><article className="card customer-details"><div className="section-title"><div><h2>المعلومات الأساسية</h2><p>بيانات الممول المسجلة في النظام</p></div></div><dl><div><dt>رقم الممول</dt><dd>{financier.financier_number}</dd></div><div><dt>رقم الهاتف</dt><dd>{financier.phone || "—"}</dd></div><div><dt>العنوان</dt><dd>{financier.address || "—"}</dd></div><div><dt>تاريخ التسجيل</dt><dd>{String(financier.created_at || "—").slice(0, 10)}</dd></div><div><dt>ملاحظات</dt><dd>{financier.notes || "—"}</dd></div></dl></article><article className="card customer-note"><div className="section-title"><div><h2>ملخص الحساب</h2><p>الأرصدة الحالية للممول</p></div></div><p>المتاح للسحب: <b>{money.format(Math.max(availableBalance, 0))} د.ع</b></p><p>الأرباح تُحسب كمحققة بعد تسجيل تحصيلات العقود.</p></article></div>}{tab === "agreements" && <article className="card customer-contracts"><div className="section-title"><div><h2>اتفاقيات التمويل</h2><p>نسخ الاتفاقيات المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>الإصدار</th><th>نسبة الربح</th><th>سارية من</th><th>الملاحظات</th></tr></thead><tbody>{agreements.map((agreement: any) => <tr key={agreement.id}><td>V{agreement.version}</td><td>{Number(agreement.terms?.profit_percentage || 0)}%</td><td>{agreement.effective_from}</td><td>{agreement.terms?.notes || "—"}</td></tr>)}</tbody></table>{!agreements.length && <div className="no-results">لا توجد اتفاقيات تمويل لهذا الممول.</div>}</div></article>}{tab === "investments" && <article className="card customer-contracts"><div className="section-title"><div><h2>استثمارات الممول</h2><p>المبالغ المستلمة والمرفقات المرتبطة بها</p></div><button className="outline-link" onClick={() => setOpenInvestment(true)}>إضافة استثمار</button></div><div className="table-wrap"><table><thead><tr><th>رقم الاستثمار</th><th>المبلغ</th><th>التاريخ</th><th>طريقة الاستلام</th><th>رقم الوصل</th></tr></thead><tbody>{investments.map((investment: any) => <tr key={investment.id}><td>{investment.investment_number}</td><td>{money.format(investment.amount)} د.ع</td><td>{investment.investment_date}</td><td>{paymentLabel(investment.payment_method)}</td><td>{investment.receipt_number || "—"}</td></tr>)}</tbody></table>{!investments.length && <div className="no-results">لا توجد استثمارات مسجلة بعد.</div>}</div></article>}{tab === "financial" && <article className="card customer-contracts"><div className="section-title"><div><h2>الحساب المالي</h2><p>حركة رأس المال والأرباح والسحوبات</p></div><button className="primary-btn" onClick={() => setOpenWithdrawal(true)}>تسجيل سحب</button></div><div className="financial-balance-grid"><div><span>رأس المال المستثمر</span><b>{money.format(totalInvestments)} د.ع</b></div><div><span>الأرباح المحققة</span><b>{money.format(realizedProfit)} د.ع</b></div><div><span>المستخدم بالعقود</span><b>{money.format(allocatedCapital)} د.ع</b></div><div><span>السحوبات</span><b>{money.format(withdrawnAmount)} د.ع</b></div><div className="available"><span>المتاح للسحب</span><b>{money.format(Math.max(availableBalance, 0))} د.ع</b></div></div><div className="table-wrap"><table><thead><tr><th>النوع</th><th>مدين</th><th>دائن</th><th>التاريخ</th><th>البيان</th></tr></thead><tbody>{transactions.map((row: any) => <tr key={row.id}><td>{({ investment_deposit: "إيداع استثمار", contract_allocation: "تخصيص لعقد", profit_earned: "ربح محقق", capital_return: "إرجاع رأس مال", settlement_payment: "تسوية", withdrawal: "سحب" } as Record<string, string>)[row.transaction_type] || row.transaction_type}</td><td>{money.format(row.debit || 0)} د.ع</td><td>{money.format(row.credit || 0)} د.ع</td><td>{String(row.occurred_at || "").slice(0, 10)}</td><td>{row.notes || "—"}</td></tr>)}</tbody></table>{!transactions.length && <div className="no-results">لا توجد حركة مالية بعد.</div>}</div></article>}{tab === "contracts" && <article className="card customer-contracts"><div className="section-title"><div><h2>العقود الممولة</h2><p>العقود المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>فاتورة التمويل</th><th>العقد</th><th>العميل</th><th>تاريخ العقد</th><th>قيمة العقد</th><th>ربح الممول</th><th>رأس المال الممول</th><th>الأقساط المتبقية</th><th>الحالة</th></tr></thead><tbody>{fundedContracts.map((contract: any) => <tr key={contract.id}><td>{contract.invoices?.invoice_number || "—"}<small className="table-subtext">سعر الأساس: {money.format(contract.invoices?.grand_total || contract.cash_price || 0)} د.ع</small></td><td>{contract.contract_number}</td><td>{contract.customers?.full_name || "—"}</td><td>{contract.contract_date || "—"}</td><td>{money.format(contract.installment_price || 0)} د.ع</td><td>{money.format(Math.max(0, Number(contract.installment_price || 0) - Number(contract.cash_price || 0)))} د.ع</td><td>{money.format(contract.financed_amount || 0)} د.ع</td><td>{(contract.installments || []).filter((installment: any) => installment.status !== "paid").length || contract.installment_count || 0}</td><td><span className="status-pill">{contract.status === "active" ? "نشط" : contract.status}</span></td></tr>)}</tbody></table>{!fundedContracts.length && <div className="no-results">لا توجد عقود ممولة لهذا الممول بعد.</div>}</div></article>}{<Dialog open={openInvestment} onOpenChange={setOpenInvestment}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>إضافة استثمار للممول</DialogTitle><DialogDescription>سجل المبلغ المستلم وأرفق الوصل إن وجد.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveInvestment}><div className="form-grid"><label>مبلغ الاستثمار<input name="amount" type="text" inputMode="numeric" placeholder="مثال: 10000000" required /></label><label>تاريخ الاستلام<input name="investment_date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label><label>طريقة الاستلام<select name="payment_method" defaultValue="cash"><option value="cash">نقدي</option><option value="bank_transfer">تحويل مصرفي</option><option value="pos">POS</option><option value="other">أخرى</option></select></label><label>رقم الوصل<input name="receipt_number" placeholder="اختياري" /></label><label>ملاحظات<input name="notes" placeholder="اختياري" /></label></div><label className="collection-attachment-field"><span>وصل الاستثمار أو المرفق</span><span className="purchase-upload-button"><Upload size={15} /> اختيار صورة أو ملف<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setInvestmentAttachment(event.target.files?.[0] || null)} /></span><small>{investmentAttachment ? investmentAttachment.name : "اختياري — صورة الوصل أو PDF"}</small></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenInvestment(false)}>إلغاء</Button><Button type="submit">حفظ الاستثمار</Button></DialogFooter></form></DialogContent></Dialog>}{<Dialog open={openWithdrawal} onOpenChange={setOpenWithdrawal}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>تسجيل سحب من حساب الممول</DialogTitle><DialogDescription>المتاح للسحب حالياً {money.format(Math.max(availableBalance, 0))} د.ع.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveWithdrawal}><div className="form-grid"><label>مبلغ السحب<input name="amount" type="text" inputMode="numeric" placeholder="مثال: 500000" required /></label><label>نوع السحب<select name="withdrawal_type" defaultValue="mixed"><option value="capital">رأس مال</option><option value="profit">أرباح</option><option value="mixed">رأس مال وأرباح</option></select></label><label>تاريخ السحب<input name="withdrawal_date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label><label>طريقة الدفع<select name="payment_method" defaultValue="cash"><option value="cash">نقدي</option><option value="bank_transfer">تحويل مصرفي</option><option value="pos">POS</option><option value="other">أخرى</option></select></label><label>رقم الوصل<input name="receipt_number" placeholder="اختياري" /></label><label>ملاحظات<input name="notes" placeholder="اختياري" /></label></div><label className="collection-attachment-field"><span>وصل السحب أو المرفق</span><span className="purchase-upload-button"><Upload size={15} /> اختيار صورة أو ملف<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setWithdrawalAttachment(event.target.files?.[0] || null)} /></span><small>{withdrawalAttachment ? withdrawalAttachment.name : "اختياري — صورة الوصل أو PDF"}</small></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenWithdrawal(false)}>إلغاء</Button><Button type="submit">حفظ السحب</Button></DialogFooter></form></DialogContent></Dialog>}</section>;
}

function FinancierProfilePageV2({ financierNumber, onBack, notify }: { financierNumber: string; onBack: () => void; notify: (message: string) => void }) {
  const [financier, setFinancier] = useState<any | null>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [fundedContracts, setFundedContracts] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<"basic" | "agreements" | "investments" | "contracts">("basic");
  const [openInvestment, setOpenInvestment] = useState(false);
  const [investmentAttachment, setInvestmentAttachment] = useState<File | null>(null);
  const [openWithdrawal, setOpenWithdrawal] = useState(false);
  const [withdrawalAttachment, setWithdrawalAttachment] = useState<File | null>(null);
  const [openAgreement, setOpenAgreement] = useState(false);

  const loadProfile = async () => {
    const { data } = await supabase.from("financiers").select("id,financier_number,name,phone,address,notes,status,created_at").eq("financier_number", financierNumber).single();
    if (!data) { notify("تعذر العثور على الممول"); return; }
    setFinancier(data);
    const [{ data: agreementRows }, { data: contractRows }, { data: investmentRows }, { data: transactionRows }] = await Promise.all([
      supabase.from("financier_agreement_versions").select("id,version,agreement_type,allocation_strategy,terms,effective_from").eq("financier_id", data.id).order("effective_from", { ascending: false }),
      supabase.from("contracts").select("id,contract_number,contract_date,cash_price,installment_price,down_payment,financed_amount,installment_count,status,customers(full_name),invoices(invoice_number,invoice_date,subtotal,grand_total,status),installments(id,installment_number,due_date,status,original_amount)").eq("financier_id", data.id).order("created_at", { ascending: false }),
      supabase.from("financier_investments").select("id,investment_number,amount,investment_date,payment_method,receipt_number,notes,status").eq("financier_id", data.id).order("investment_date", { ascending: false }),
      supabase.from("financier_transactions").select("id,transaction_type,debit,credit,occurred_at,notes").eq("financier_id", data.id).order("occurred_at", { ascending: false }),
    ]);
    const installmentIds = (contractRows || []).flatMap((contract: any) => (contract.installments || []).map((installment: any) => installment.id));
    const { data: allocationRows } = installmentIds.length
      ? await supabase.from("payment_allocations").select("installment_id,amount").in("installment_id", installmentIds)
      : { data: [] };
    const paidByInstallment = (allocationRows || []).reduce((map: Record<string, number>, allocation: any) => {
      map[allocation.installment_id] = (map[allocation.installment_id] || 0) + Number(allocation.amount || 0);
      return map;
    }, {});
    const enrichedContracts = (contractRows || []).map((contract: any) => {
      const installments = (contract.installments || []).map((installment: any) => ({
        ...installment,
        paid_amount: paidByInstallment[installment.id] || 0,
      }));
      const received = Number(contract.down_payment || 0) + installments.reduce((sum: number, installment: any) => sum + Number(installment.paid_amount || 0), 0);
      const remaining = Math.max(0, Number(contract.installment_price || 0) - received);
      const today = new Date().toISOString().slice(0, 10);
      const overdue = installments.filter((installment: any) => installment.status !== "paid" && installment.due_date && installment.due_date < today).reduce((sum: number, installment: any) => sum + Math.max(0, Number(installment.original_amount || 0) - Number(installment.paid_amount || 0)), 0);
      return {
        ...contract,
        installments,
        installment_count: `${installments.filter((installment: any) => installment.status !== "paid").length} باقي | استلم ${money.format(received)} د.ع | متبقي ${money.format(remaining)} د.ع${overdue ? ` | متأخر ${money.format(overdue)} د.ع` : ""}`,
        status: overdue ? "متأخر" : remaining === 0 ? "مكتمل" : contract.status,
      };
    });
    setAgreements(agreementRows || []); setFundedContracts(enrichedContracts); setInvestments(investmentRows || []); setTransactions(transactionRows || []);
  };
  useEffect(() => { loadProfile(); }, [financierNumber]);

  const saveInvestment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!financier) return;
    const values = new FormData(event.currentTarget);
    const amount = Number(normalizeDigits(String(values.get("amount") || "")).replace(/\D/g, "")) || 0;
    if (amount <= 0) { notify("مبلغ الاستثمار يجب أن يكون أكبر من صفر"); return; }
    const { data: investment, error } = await supabase.from("financier_investments").insert({ investment_number: `INV-${new Date().getFullYear()}-${Date.now()}`, financier_id: financier.id, amount, investment_date: values.get("investment_date") || new Date().toLocaleDateString("en-CA"), payment_method: values.get("payment_method") || "cash", receipt_number: String(values.get("receipt_number") || "").trim() || null, notes: String(values.get("notes") || "").trim() || null, status: "active" }).select("id").single();
    if (error || !investment) { notify(`تعذر حفظ الاستثمار: ${error?.message || "خطأ غير معروف"}`); return; }
    if (investmentAttachment) {
      const safeFileName = investmentAttachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${investment.id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("financier-investments").upload(storagePath, investmentAttachment, { contentType: investmentAttachment.type || "application/octet-stream", upsert: false });
      if (uploadError) notify(`تم حفظ الاستثمار لكن تعذر رفع الوصل: ${uploadError.message}`);
      else await supabase.from("financier_investment_attachments").insert({ investment_id: investment.id, file_name: investmentAttachment.name, storage_path: storagePath, mime_type: investmentAttachment.type || null, file_size: investmentAttachment.size });
    }
    await supabase.from("financier_transactions").insert({ financier_id: financier.id, investment_id: investment.id, transaction_type: "investment_deposit", debit: 0, credit: amount, occurred_at: `${values.get("investment_date") || new Date().toLocaleDateString("en-CA")}T00:00:00`, notes: "إيداع استثمار" });
    setOpenInvestment(false); setInvestmentAttachment(null); await loadProfile(); notify("تم تسجيل استثمار الممول بنجاح");
  };
  const saveWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!financier) return;
    const values = new FormData(event.currentTarget);
    const amount = Number(normalizeDigits(String(values.get("amount") || "")).replace(/\D/g, "")) || 0;
    const available = investments.reduce((total, investment) => total + Number(investment.amount || 0), 0) + transactions.filter((row) => ["profit_earned", "capital_return"].includes(row.transaction_type)).reduce((total, row) => total + Number(row.credit || 0) - Number(row.debit || 0), 0) - transactions.filter((row) => ["contract_allocation", "settlement_payment", "withdrawal"].includes(row.transaction_type)).reduce((total, row) => total + Number(row.debit || 0) - Number(row.credit || 0), 0);
    if (amount <= 0) { notify("مبلغ السحب يجب أن يكون أكبر من صفر"); return; }
    if (amount > available) { notify(`المبلغ المتاح للسحب هو ${money.format(Math.max(available, 0))} د.ع`); return; }
    const withdrawalDate = String(values.get("withdrawal_date") || new Date().toLocaleDateString("en-CA"));
    const { data: withdrawal, error } = await supabase.from("financier_withdrawals").insert({ withdrawal_number: `WD-${new Date().getFullYear()}-${Date.now()}`, financier_id: financier.id, amount, withdrawal_type: values.get("withdrawal_type") || "mixed", withdrawal_date: withdrawalDate, payment_method: values.get("payment_method") || "cash", receipt_number: String(values.get("receipt_number") || "").trim() || null, notes: String(values.get("notes") || "").trim() || null, status: "active" }).select("id").single();
    if (error || !withdrawal) { notify(`تعذر حفظ السحب: ${error?.message || "خطأ غير معروف"}`); return; }
    const { error: transactionError } = await supabase.from("financier_transactions").insert({ financier_id: financier.id, transaction_type: "withdrawal", debit: amount, credit: 0, occurred_at: `${withdrawalDate}T00:00:00`, notes: `سحب ${withdrawal.id}` });
    if (transactionError) { notify(`تم حفظ السحب لكن تعذر تحديث الحساب: ${transactionError.message}`); return; }
    if (withdrawalAttachment) {
      const safeFileName = withdrawalAttachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${withdrawal.id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("financier-withdrawals").upload(storagePath, withdrawalAttachment, { contentType: withdrawalAttachment.type || "application/octet-stream", upsert: false });
      if (uploadError) notify(`تم حفظ السحب لكن تعذر رفع الوصل: ${uploadError.message}`);
      else await supabase.from("financier_withdrawal_attachments").insert({ withdrawal_id: withdrawal.id, file_name: withdrawalAttachment.name, storage_path: storagePath, mime_type: withdrawalAttachment.type || null, file_size: withdrawalAttachment.size });
    }
    setOpenWithdrawal(false); setWithdrawalAttachment(null); await loadProfile(); notify("تم تسجيل السحب وتحديث الحساب المالي");
  };
  const saveAgreement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!financier) return;
    const values = new FormData(event.currentTarget);
    const fixedProfit = Number(normalizeDigits(String(values.get("fixed_profit") || "")).replace(/\D/g, "")) || 0;
    const profitPercentage = Number(normalizeDigits(String(values.get("profit_percentage") || "")).replace(/[^0-9.]/g, "")) || 0;
    const previousVersion = agreements.reduce((max, agreement) => Math.max(max, Number(agreement.version) || 0), 0);
    const { error } = await supabase.from("financier_agreement_versions").insert({ financier_id: financier.id, version: previousVersion + 1, agreement_type: values.get("agreement_type"), allocation_strategy: values.get("allocation_strategy"), terms: { fixed_profit: fixedProfit, profit_percentage: profitPercentage, notes: String(values.get("terms_notes") || "").trim() }, effective_from: values.get("effective_from") || new Date().toLocaleDateString("en-CA") });
    if (error) { notify(`تعذر حفظ اتفاقية التمويل: ${error.message}`); return; }
    setOpenAgreement(false); await loadProfile(); notify("تمت إضافة اتفاقية التمويل للممول");
  };
  if (!financier) return <section className="module-page"><div className="no-results">جارٍ تحميل ملف الممول...</div></section>;
  const totalInvestments = investments.reduce((total, investment) => total + Number(investment.amount || 0), 0);
  const realizedProfit = transactions.filter((row) => row.transaction_type === "profit_earned").reduce((total, row) => total + Number(row.credit || 0) - Number(row.debit || 0), 0);
  const returnedCapital = transactions.filter((row) => row.transaction_type === "capital_return").reduce((total, row) => total + Number(row.credit || 0) - Number(row.debit || 0), 0);
  const allocatedCapital = transactions.filter((row) => row.transaction_type === "contract_allocation").reduce((total, row) => total + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const withdrawnAmount = transactions.filter((row) => row.transaction_type === "withdrawal").reduce((total, row) => total + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const settlementPaid = transactions.filter((row) => row.transaction_type === "settlement_payment").reduce((total, row) => total + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const availableBalance = totalInvestments + realizedProfit + returnedCapital - allocatedCapital - withdrawnAmount - settlementPaid;
  return <><FinancierFinancialProfileView financier={financier} agreements={agreements} investments={investments} transactions={transactions} fundedContracts={fundedContracts} totalInvestments={totalInvestments} realizedProfit={realizedProfit} allocatedCapital={allocatedCapital} withdrawnAmount={withdrawnAmount} availableBalance={availableBalance} openInvestment={openInvestment} setOpenInvestment={setOpenInvestment} investmentAttachment={investmentAttachment} setInvestmentAttachment={setInvestmentAttachment} saveInvestment={saveInvestment} openWithdrawal={openWithdrawal} setOpenWithdrawal={setOpenWithdrawal} withdrawalAttachment={withdrawalAttachment} setWithdrawalAttachment={setWithdrawalAttachment} saveWithdrawal={saveWithdrawal} openAgreement={openAgreement} setOpenAgreement={setOpenAgreement} saveAgreement={saveAgreement} onBack={onBack} /><Dialog open={openAgreement} onOpenChange={setOpenAgreement}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>إضافة اتفاقية تمويل</DialogTitle><DialogDescription>أضف إصداراً جديداً مرتبطاً بهذا الممول.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveAgreement}><input type="hidden" name="agreement_type" value="profit_percentage" /><input type="hidden" name="allocation_strategy" value="capital_first" /><div className="form-grid"><label>نسبة الربح على كل عقد %<input name="profit_percentage" type="text" inputMode="decimal" placeholder="مثال: 20" required /></label><label>سارية من<input name="effective_from" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label><label>ملاحظات الاتفاقية<input name="terms_notes" placeholder="اختياري" /></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenAgreement(false)}>إلغاء</Button><Button type="submit">حفظ الاتفاقية</Button></DialogFooter></form></DialogContent></Dialog></>;
  const typeLabel = (type: string) => ({ fixed_profit: "ربح ثابت", profit_percentage: "نسبة مئوية", custom: "مخصص" } as Record<string, string>)[type] || type;
  const paymentLabel = (method: string) => ({ cash: "نقدي", bank_transfer: "تحويل مصرفي", pos: "POS", other: "أخرى" } as Record<string, string>)[method] || method;
  return <section className="module-page financier-profile-page"><button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى الممولين</button><div className="customer-heading"><div className="customer-avatar">{financier.name.slice(0, 2)}</div><div><p className="eyebrow">ملف الممول</p><h1>{financier.name}</h1><span className="customer-status">{financier.status === "active" ? "نشط" : financier.status}</span></div><div className="customer-actions"><Button onClick={() => setOpenInvestment(true)}>إضافة استثمار</Button></div></div><section className="customer-metrics"><article><span>الاتفاقيات</span><strong>{agreements.length}</strong><small>إصدارات التمويل</small></article><article><span>رأس المال</span><strong>{money.format(totalInvestments)} د.ع</strong><small>{investments.length ? `${investments.length} استثمار` : "لا توجد استثمارات"}</small></article><article><span>المستخدم</span><strong>0 د.ع</strong><small>لا توجد عقود ممولة</small></article><article><span>المستحق</span><strong>0 د.ع</strong><small>لا توجد تسويات</small></article></section><div className="financier-profile-tabs"><button className={profileTab === "basic" ? "active" : ""} onClick={() => setProfileTab("basic")}>المعلومات الأساسية</button><button className={profileTab === "agreements" ? "active" : ""} onClick={() => setProfileTab("agreements")}>اتفاقيات التمويل <span>{agreements.length}</span></button><button className={profileTab === "investments" ? "active" : ""} onClick={() => setProfileTab("investments")}>الاستثمارات <span>{investments.length}</span></button><button className={profileTab === "contracts" ? "active" : ""} onClick={() => setProfileTab("contracts")}>العقود الممولة <span>{fundedContracts.length}</span></button></div><div className={"customer-grid financier-basic-panel " + (profileTab === "basic" ? "" : "financier-panel-hidden")}><article className="card customer-details"><div className="section-title"><div><h2>المعلومات الأساسية</h2><p>بيانات الممول المسجلة في النظام</p></div></div><dl><div><dt>رقم الممول</dt><dd>{financier.financier_number}</dd></div><div><dt>رقم الهاتف</dt><dd>{financier.phone || "—"}</dd></div><div><dt>العنوان</dt><dd>{financier.address || "—"}</dd></div><div><dt>تاريخ التسجيل</dt><dd>{String(financier.created_at || "—").slice(0, 10)}</dd></div><div><dt>ملاحظات</dt><dd>{financier.notes || "—"}</dd></div></dl></article><article className="card customer-note"><div className="section-title"><div><h2>ملخص التمويل</h2><p>حالة الحساب الحالية</p></div></div><p>إجمالي رأس المال المسجل: <b>{money.format(totalInvestments)} د.ع</b></p><p>{investments.length ? "يمكن توزيع هذا الرصيد على العقود الممولة." : "أضف أول استثمار حتى يظهر رأس المال هنا."}</p></article></div><article className={"card customer-contracts financier-agreement-panel " + (profileTab === "agreements" ? "" : "financier-panel-hidden")}><div className="section-title"><div><h2>اتفاقيات التمويل</h2><p>نسخ الاتفاقيات المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>الإصدار</th><th>نوع الربح</th><th>طريقة التخصيص</th><th>سارية من</th></tr></thead><tbody>{agreements.map((agreement) => <tr key={agreement.id}><td>V{agreement.version}</td><td>{typeLabel(agreement.agreement_type)}</td><td>{{ capital_first: "رأس المال أولاً", pro_rata: "نسبي", custom: "مخصص" }[agreement.allocation_strategy] || agreement.allocation_strategy}</td><td>{agreement.effective_from}</td></tr>)}</tbody></table>{!agreements.length && <div className="no-results">لا توجد اتفاقيات تمويل لهذا الممول.</div>}</div></article><article className={"card customer-contracts financier-investments-panel " + (profileTab === "investments" ? "" : "financier-panel-hidden")}><div className="section-title"><div><h2>استثمارات الممول</h2><p>المبالغ المستلمة والمرفقات المرتبطة بها</p></div><button className="outline-link" onClick={() => setOpenInvestment(true)}>إضافة استثمار</button></div><div className="table-wrap"><table><thead><tr><th>رقم الاستثمار</th><th>المبلغ</th><th>التاريخ</th><th>طريقة الاستلام</th><th>رقم الوصل</th></tr></thead><tbody>{investments.map((investment) => <tr key={investment.id}><td>{investment.investment_number}</td><td>{money.format(investment.amount)} د.ع</td><td>{investment.investment_date}</td><td>{paymentLabel(investment.payment_method)}</td><td>{investment.receipt_number || "—"}</td></tr>)}</tbody></table>{!investments.length && <div className="no-results">لا توجد استثمارات مسجلة بعد.</div>}</div></article><article className={"card customer-contracts financier-funded-contracts " + (profileTab === "contracts" ? "" : "financier-panel-hidden")}><div className="section-title"><div><h2>العقود الممولة</h2><p>العقود المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>رقم العقد</th><th>العميل</th><th>تاريخ العقد</th><th>قيمة العقد</th><th>المبلغ الممول</th><th>الأقساط</th><th>الحالة</th></tr></thead><tbody>{fundedContracts.map((contract) => <tr key={contract.id}><td>{contract.contract_number}</td><td>{contract.customers?.full_name || "—"}</td><td>{contract.contract_date || "—"}</td><td>{money.format(contract.installment_price || 0)} د.ع</td><td>{money.format(contract.financed_amount || 0)} د.ع</td><td>{contract.installment_count || 0}</td><td><span className="status-pill">{contract.status === "active" ? "نشط" : contract.status}</span></td></tr>)}</tbody></table>{!fundedContracts.length && <div className="no-results">لا توجد عقود ممولة لهذا الممول بعد.</div>}</div></article><Dialog open={openInvestment} onOpenChange={setOpenInvestment}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>إضافة استثمار للممول</DialogTitle><DialogDescription>سجل المبلغ المستلم وأرفق الوصل إن وجد.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveInvestment}><div className="form-grid"><label>مبلغ الاستثمار<input name="amount" type="text" inputMode="numeric" placeholder="مثال: 10000000" required /></label><label>تاريخ الاستلام<input name="investment_date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label><label>طريقة الاستلام<select name="payment_method" defaultValue="cash"><option value="cash">نقدي</option><option value="bank_transfer">تحويل مصرفي</option><option value="pos">POS</option><option value="other">أخرى</option></select></label><label>رقم الوصل<input name="receipt_number" placeholder="اختياري" /></label><label>ملاحظات<input name="notes" placeholder="اختياري" /></label></div><label className="collection-attachment-field"><span>وصل الاستثمار أو المرفق</span><span className="purchase-upload-button"><Upload size={15} /> اختيار صورة أو ملف<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setInvestmentAttachment(event.target.files?.[0] || null)} /></span><small>{investmentAttachment ? investmentAttachment.name : "اختياري — صورة الوصل أو PDF"}</small></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenInvestment(false)}>إلغاء</Button><Button type="submit">حفظ الاستثمار</Button></DialogFooter></form></DialogContent></Dialog></section>;
}

function FinancierProfilePage({ financierNumber, onBack, notify }: { financierNumber: string; onBack: () => void; notify: (message: string) => void }) {
  const [financier, setFinancier] = useState<any | null>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<"basic" | "agreements" | "contracts">("basic");
  const [fundedContracts, setFundedContracts] = useState<any[]>([]);
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.from("financiers").select("id,financier_number,name,phone,address,notes,status,created_at").eq("financier_number", financierNumber).single();
      if (!data) { notify("تعذر العثور على الممول"); return; }
      setFinancier(data);
      const { data: agreementRows } = await supabase.from("financier_agreement_versions").select("id,version,agreement_type,allocation_strategy,terms,effective_from").eq("financier_id", data.id).order("effective_from", { ascending: false });
      setAgreements(agreementRows || []);
      const { data: contractRows } = await supabase.from("contracts").select("id,contract_number,contract_date,customer_id,installment_price,financed_amount,installment_count,status,customers(full_name)").eq("financier_id", data.id).order("created_at", { ascending: false });
      setFundedContracts(contractRows || []);
    };
    loadProfile();
  }, [financierNumber]);
  if (!financier) return <section className="module-page"><div className="no-results">جارٍ تحميل ملف الممول...</div></section>;
  const typeLabel = (type: string) => ({ fixed_profit: "ربح ثابت", profit_percentage: "نسبة مئوية", custom: "مخصص" } as Record<string, string>)[type] || type;
  return <section className="module-page financier-profile-page"><button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى الممولين</button><div className="customer-heading"><div className="customer-avatar">{financier.name.slice(0, 2)}</div><div><p className="eyebrow">ملف الممول</p><h1>{financier.name}</h1><span className="customer-status">{financier.status === "active" ? "نشط" : financier.status}</span></div><div className="customer-actions"><Button onClick={() => notify("سيتم تفعيل إضافة الاستثمار بعد إكمال اتفاقيات التمويل")}>إضافة استثمار</Button></div></div><section className="customer-metrics"><article><span>الاتفاقيات</span><strong>{agreements.length}</strong><small>إصدارات التمويل</small></article><article><span>رأس المال</span><strong>0 د.ع</strong><small>لا توجد استثمارات مسجلة</small></article><article><span>المستخدم</span><strong>0 د.ع</strong><small>لا توجد عقود ممولة</small></article><article><span>المستحق</span><strong>0 د.ع</strong><small>لا توجد تسويات</small></article></section><div className="financier-profile-tabs"><button className={profileTab === "basic" ? "active" : ""} onClick={() => setProfileTab("basic")}>المعلومات الأساسية</button><button className={profileTab === "agreements" ? "active" : ""} onClick={() => setProfileTab("agreements")}>اتفاقيات التمويل <span>{agreements.length}</span></button><button className={profileTab === "contracts" ? "active" : ""} onClick={() => setProfileTab("contracts")}>العقود الممولة <span>{fundedContracts.length}</span></button></div><div className={"customer-grid financier-basic-panel " + (profileTab === "basic" ? "" : "financier-panel-hidden")}><article className="card customer-details"><div className="section-title"><div><h2>المعلومات الأساسية</h2><p>بيانات الممول المسجلة في النظام</p></div><button className="outline-link" onClick={() => notify("سيتم تفعيل تعديل بيانات الممول لاحقاً")}>تعديل</button></div><dl><div><dt>رقم الممول</dt><dd>{financier.financier_number}</dd></div><div><dt>رقم الهاتف</dt><dd>{financier.phone || "—"}</dd></div><div><dt>العنوان</dt><dd>{financier.address || "—"}</dd></div><div><dt>تاريخ التسجيل</dt><dd>{String(financier.created_at || "—").slice(0, 10)}</dd></div><div><dt>ملاحظات</dt><dd>{financier.notes || "—"}</dd></div></dl></article><article className="card customer-note"><div className="section-title"><div><h2>ملخص التمويل</h2><p>حالة الحساب الحالية</p></div></div><p>سيظهر هنا رأس المال والاستثمارات والعقود الممولة بعد إضافة أول استثمار.</p></article></div><article className={"card customer-contracts financier-agreement-panel " + (profileTab === "agreements" ? "" : "financier-panel-hidden")}><div className="section-title"><div><h2>اتفاقيات التمويل</h2><p>نسخ الاتفاقيات المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>الإصدار</th><th>نوع الربح</th><th>طريقة التخصيص</th><th>سارية من</th></tr></thead><tbody>{agreements.map((agreement) => <tr key={agreement.id}><td>V{agreement.version}</td><td>{typeLabel(agreement.agreement_type)}</td><td>{{ capital_first: "رأس المال أولاً", pro_rata: "نسبي", custom: "مخصص" }[agreement.allocation_strategy] || agreement.allocation_strategy}</td><td>{agreement.effective_from}</td></tr>)}</tbody></table>{!agreements.length && <div className="no-results">لا توجد اتفاقيات تمويل لهذا الممول.</div>}</div></article><article className={"card customer-contracts financier-funded-contracts " + (profileTab === "contracts" ? "" : "financier-panel-hidden")}><div className="section-title"><div><h2>العقود الممولة</h2><p>العقود المرتبطة بهذا الممول</p></div></div><div className="table-wrap"><table><thead><tr><th>رقم العقد</th><th>العميل</th><th>تاريخ العقد</th><th>قيمة العقد</th><th>المبلغ الممول</th><th>الأقساط</th><th>الحالة</th></tr></thead><tbody>{fundedContracts.map((contract) => <tr key={contract.id}><td>{contract.contract_number}</td><td>{contract.customers?.full_name || "—"}</td><td>{contract.contract_date || "—"}</td><td>{money.format(contract.installment_price || 0)} د.ع</td><td>{money.format(contract.financed_amount || 0)} د.ع</td><td>{contract.installment_count || 0}</td><td><span className="status-pill">{contract.status === "active" ? "نشط" : contract.status}</span></td></tr>)}</tbody></table>{!fundedContracts.length && <div className="no-results">لا توجد عقود ممولة لهذا الممول بعد.</div>}</div></article></section>;
}

function FinanciersPageWizard({ notify }: { notify: (message: string) => void }) {
  const [financiers, setFinanciers] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [selectedFinancier, setSelectedFinancier] = useState("");
  const [saveAgreementIntent, setSaveAgreementIntent] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "agreements">("basic");

  const loadData = async () => {
    const [{ data: financierRows, error: financierError }, { data: agreementRows, error: agreementError }] = await Promise.all([
      supabase.from("financiers").select("id,financier_number,name,phone,address,notes,status,created_at").order("created_at", { ascending: false }),
      supabase.from("financier_agreement_versions").select("id,financier_id,version,agreement_type,allocation_strategy,terms,effective_from").order("effective_from", { ascending: false }),
    ]);
    if (financierError || agreementError) { notify(`تعذر تحميل بيانات الممولين: ${(financierError || agreementError)?.message}`); return; }
    setFinanciers(financierRows || []); setAgreements(agreementRows || []);
  };
  useEffect(() => { loadData(); }, []);

  const openNewWizard = (step: 1 | 2 = 1) => { setWizardStep(step); setSelectedFinancier(""); setSaveAgreementIntent(true); setOpenWizard(true); };
  const goToAgreementStep = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    const values = new FormData(form);
    if (!String(values.get("name") || "").trim()) { notify("اسم الممول مطلوب"); return; }
    setWizardStep(2);
  };
  const saveWizard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") || "").trim();
    if (!name && !selectedFinancier) { notify("اختر ممولاً موجوداً أو أدخل اسم ممول جديد"); setWizardStep(1); return; }
    let financierId = selectedFinancier;
    if (!financierId) {
      const { data: financier, error } = await supabase.from("financiers").insert({ financier_number: `FIN-${new Date().getFullYear()}-${Date.now()}`, name, phone: normalizeDigits(String(values.get("phone") || "")).replace(/\D/g, "") || null, address: String(values.get("address") || "").trim() || null, notes: String(values.get("notes") || "").trim() || null, status: "active" }).select("id").single();
      if (error) { notify(`تعذر حفظ الممول: ${error.message}`); return; }
      financierId = financier?.id || "";
    }
    const saveAgreement = saveAgreementIntent;
    if (saveAgreement && financierId) {
      const previousVersion = agreements.filter((agreement) => agreement.financier_id === financierId).reduce((max, agreement) => Math.max(max, Number(agreement.version) || 0), 0);
      const fixedProfit = Number(normalizeDigits(String(values.get("fixed_profit") || "")).replace(/\D/g, "")) || 0;
      const profitPercentage = Number(normalizeDigits(String(values.get("profit_percentage") || "")).replace(/[^0-9.]/g, "")) || 0;
      const { error } = await supabase.from("financier_agreement_versions").insert({ financier_id: financierId, version: previousVersion + 1, agreement_type: values.get("agreement_type"), allocation_strategy: values.get("allocation_strategy"), terms: { fixed_profit: fixedProfit, profit_percentage: profitPercentage, notes: String(values.get("terms_notes") || "").trim() }, effective_from: values.get("effective_from") || new Date().toLocaleDateString("en-CA") });
      if (error) { notify(`تعذر حفظ اتفاقية التمويل: ${error.message}`); return; }
    }
    setOpenWizard(false); setWizardStep(1); setSelectedFinancier(""); setSaveAgreementIntent(true); await loadData(); notify(saveAgreement ? "تمت إضافة الممول واتفاقية التمويل بنجاح" : "تمت إضافة الممول بنجاح");
  };
  const visibleFinanciers = financiers.filter((financier) => `${financier.name} ${financier.phone || ""} ${financier.financier_number}`.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  const typeLabel = (type: string) => ({ fixed_profit: "ربح ثابت", profit_percentage: "نسبة مئوية", custom: "مخصص" } as Record<string, string>)[type] || type;
  return <section className="module-page financiers-page"><div className="page-heading"><div><p className="eyebrow">التمويل والحسابات</p><h1>الممولون</h1><p className="subtle">إدارة بيانات الممولين واتفاقيات التمويل المرتبطة بهم.</p></div><div className="heading-actions"><div className="module-search"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث عن ممول..." /></div><button className="secondary-btn" onClick={() => openNewWizard(2)}><Plus size={17} /> إضافة اتفاقية</button><button className="primary-btn" onClick={() => openNewWizard()}><Plus size={18} /> إضافة ممول</button></div></div><section className="module-summary"><div><span>إجمالي الممولين</span><b>{financiers.length}</b></div><div><span>الممولون النشطون</span><b>{financiers.filter((financier) => financier.status === "active").length}</b></div><div><span>اتفاقيات التمويل</span><b>{agreements.length}</b></div></section><div className="financier-tabs"><button className={activeTab === "basic" ? "active" : ""} onClick={() => setActiveTab("basic")}>المعلومات الأساسية</button><button className={activeTab === "agreements" ? "active" : ""} onClick={() => setActiveTab("agreements")}>اتفاقيات التمويل <span>{agreements.length}</span></button></div><article className={`card data-card ${activeTab === "basic" ? "" : "financier-panel-hidden"}`}><div className="data-title"><div><h2>المعلومات الأساسية</h2><p>بيانات الممولين المسجلة في النظام</p></div><button className="outline-link" onClick={loadData}>تحديث</button></div><div className="table-wrap"><table><thead><tr><th>الرقم</th><th>الممول</th><th>الهاتف</th><th>العنوان</th><th>الاتفاقيات</th><th>الحالة</th></tr></thead><tbody>{visibleFinanciers.map((financier) => <tr key={financier.id} className="clickable-row" onClick={() => { window.history.pushState({}, "", `/financiers/${financier.financier_number}`); window.dispatchEvent(new PopStateEvent("popstate")); }}><td>{financier.financier_number}</td><td>{financier.name}</td><td>{financier.phone || "—"}</td><td>{financier.address || "—"}</td><td>{agreements.filter((agreement) => agreement.financier_id === financier.id).length}</td><td><span className="status-pill">{financier.status === "active" ? "نشط" : financier.status}</span></td></tr>)}</tbody></table>{!visibleFinanciers.length && <div className="no-results">لا توجد بيانات ممولين بعد.</div>}</div></article><article className={`card data-card financier-agreements-card ${activeTab === "agreements" ? "" : "financier-panel-hidden"}`}><div className="data-title"><div><h2>اتفاقيات التمويل</h2><p>نسخ الاتفاقيات وشروط احتساب الربح</p></div></div><div className="table-wrap"><table><thead><tr><th>الممول</th><th>الإصدار</th><th>نوع الربح</th><th>طريقة التخصيص</th><th>سارية من</th></tr></thead><tbody>{agreements.map((agreement) => <tr key={agreement.id}><td>{financiers.find((financier) => financier.id === agreement.financier_id)?.name || "—"}</td><td>V{agreement.version}</td><td>{typeLabel(agreement.agreement_type)}</td><td>{{ capital_first: "رأس المال أولاً", pro_rata: "نسبي", custom: "مخصص" }[agreement.allocation_strategy] || agreement.allocation_strategy}</td><td>{agreement.effective_from}</td></tr>)}</tbody></table>{!agreements.length && <div className="no-results">لا توجد اتفاقيات تمويل بعد.</div>}</div></article><Dialog open={openWizard} onOpenChange={setOpenWizard}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>{wizardStep === 1 ? "إضافة ممول" : "اتفاقية تمويل"}</DialogTitle><DialogDescription>{wizardStep === 1 ? "الخطوة 1 من 2 — أدخل المعلومات الأساسية للممول." : "الخطوة 2 من 2 — أضف اتفاقية التمويل أو احفظ الممول بدون اتفاقية."}</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><div className="financier-wizard-steps"><span className={wizardStep === 1 ? "active" : "done"}>1. المعلومات الأساسية</span><span className={wizardStep === 2 ? "active" : ""}>2. اتفاقية التمويل</span></div><form onSubmit={saveWizard}><div className={wizardStep === 1 ? "" : "financier-panel-hidden"}><div className="form-grid"><label>اسم الممول<input name="name" placeholder="مثال: شركة أفق التمويل" required={wizardStep === 1} /></label><label>رقم الهاتف<input name="phone" inputMode="numeric" placeholder="07XX XXX XXXX" /></label><label>العنوان<input name="address" placeholder="العنوان" /></label><label>ملاحظات<input name="notes" placeholder="اختياري" /></label></div></div><div className={wizardStep === 2 ? "" : "financier-panel-hidden"}><div className="form-grid"><label>الممول<select name="financier_id" value={selectedFinancier} onChange={(event) => setSelectedFinancier(event.target.value)}><option value="">ممول جديد سيتم حفظه</option>{financiers.map((financier) => <option key={financier.id} value={financier.id}>{financier.name}</option>)}</select></label><label>نوع الربح<select name="agreement_type" defaultValue="profit_percentage"><option value="fixed_profit">ربح ثابت</option><option value="profit_percentage">نسبة مئوية</option><option value="custom">اتفاق مخصص</option></select></label><label>الربح الثابت<input name="fixed_profit" type="text" inputMode="decimal" placeholder="0" /></label><label>نسبة الربح %<input name="profit_percentage" type="text" inputMode="decimal" placeholder="0" /></label><label>طريقة تخصيص رأس المال<select name="allocation_strategy" defaultValue="capital_first"><option value="capital_first">رأس المال أولاً</option><option value="pro_rata">توزيع نسبي</option><option value="custom">مخصص</option></select></label><label>سارية من<input name="effective_from" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} /></label><label>ملاحظات الاتفاقية<input name="terms_notes" placeholder="الشروط والملاحظات" /></label></div></div><DialogFooter>{wizardStep === 2 && <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>السابق</Button>}{wizardStep === 1 ? <Button type="button" onClick={goToAgreementStep}>التالي</Button> : <><Button type="submit" onClick={() => setSaveAgreementIntent(false)} variant="outline">حفظ الممول فقط</Button><Button type="submit" onClick={() => setSaveAgreementIntent(true)}>حفظ الممول والاتفاقية</Button></>}</DialogFooter></form></DialogContent></Dialog></section>;
}

function FinanciersPage({ notify }: { notify: (message: string) => void }) {
  const [financiers, setFinanciers] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [openFinancier, setOpenFinancier] = useState(false);
  const [openAgreement, setOpenAgreement] = useState(false);
  const [selectedFinancier, setSelectedFinancier] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "agreements">("basic");

  const loadFinanciers = async () => {
    const [{ data: financierRows, error: financierError }, { data: agreementRows, error: agreementError }] = await Promise.all([
      supabase.from("financiers").select("id,financier_number,name,phone,address,notes,status,created_at").order("created_at", { ascending: false }),
      supabase.from("financier_agreement_versions").select("id,financier_id,version,agreement_type,allocation_strategy,terms,effective_from").order("effective_from", { ascending: false }),
    ]);
    if (financierError || agreementError) { notify(`تعذر تحميل بيانات الممولين: ${(financierError || agreementError)?.message}`); return; }
    setFinanciers(financierRows || []); setAgreements(agreementRows || []);
  };
  useEffect(() => { loadFinanciers(); }, []);

  const saveFinancier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") || "").trim();
    if (!name) { notify("اسم الممول مطلوب"); return; }
    const { data: financier, error } = await supabase.from("financiers").insert({ financier_number: `FIN-${new Date().getFullYear()}-${Date.now()}`, name, phone: normalizeDigits(String(values.get("phone") || "")).replace(/\D/g, "") || null, address: String(values.get("address") || "").trim() || null, notes: String(values.get("notes") || "").trim() || null, status: "active" }).select("id").single();
    if (error) { notify(`تعذر حفظ الممول: ${error.message}`); return; }
    setOpenFinancier(false); await loadFinanciers();
    if (financier) { setSelectedFinancier(financier.id); setOpenAgreement(true); notify("تمت إضافة الممول، أكمل الآن اتفاقية التمويل"); }
  };
  const saveAgreement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const financierId = String(values.get("financier_id") || "");
    if (!financierId) { notify("اختر الممول أولاً"); return; }
    const previousVersion = agreements.filter((agreement) => agreement.financier_id === financierId).reduce((max, agreement) => Math.max(max, Number(agreement.version) || 0), 0);
    const fixedProfit = Number(normalizeDigits(String(values.get("fixed_profit") || "")).replace(/\D/g, "")) || 0;
    const profitPercentage = Number(normalizeDigits(String(values.get("profit_percentage") || "")).replace(/[^0-9.]/g, "")) || 0;
    const { error } = await supabase.from("financier_agreement_versions").insert({ financier_id: financierId, version: previousVersion + 1, agreement_type: values.get("agreement_type"), allocation_strategy: values.get("allocation_strategy"), terms: { fixed_profit: fixedProfit, profit_percentage: profitPercentage, notes: String(values.get("terms_notes") || "").trim() }, effective_from: values.get("effective_from") || new Date().toLocaleDateString("en-CA") });
    if (error) { notify(`تعذر حفظ اتفاقية التمويل: ${error.message}`); return; }
    setOpenAgreement(false); await loadFinanciers(); notify("تم إنشاء اتفاقية التمويل بنجاح");
  };
  const visibleFinanciers = financiers.filter((financier) => `${financier.name} ${financier.phone || ""} ${financier.financier_number}`.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  const typeLabel = (type: string) => ({ fixed_profit: "ربح ثابت", profit_percentage: "نسبة مئوية", custom: "مخصص" } as Record<string, string>)[type] || type;
  return <section className="module-page financiers-page"><div className="page-heading"><div><p className="eyebrow">التمويل والحسابات</p><h1>الممولون</h1><p className="subtle">إدارة بيانات الممولين واتفاقيات التمويل المرتبطة بهم.</p></div><div className="heading-actions"><div className="module-search"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث عن ممول..." /></div><button className="secondary-btn" onClick={() => { setActiveTab("agreements"); setOpenAgreement(true); }}><Plus size={17} /> اتفاقية تمويل</button><button className="primary-btn" onClick={() => setOpenFinancier(true)}><Plus size={18} /> إضافة ممول</button></div></div><section className="module-summary"><div><span>إجمالي الممولين</span><b>{financiers.length}</b></div><div><span>الممولون النشطون</span><b>{financiers.filter((financier) => financier.status === "active").length}</b></div><div><span>اتفاقيات التمويل</span><b>{agreements.length}</b></div></section><div className="financier-tabs"><button className={activeTab === "basic" ? "active" : ""} onClick={() => setActiveTab("basic")}>المعلومات الأساسية</button><button className={activeTab === "agreements" ? "active" : ""} onClick={() => setActiveTab("agreements")}>اتفاقيات التمويل <span>{agreements.length}</span></button></div><article className={`card data-card ${activeTab === "basic" ? "" : "financier-panel-hidden"}`}><div className="data-title"><div><h2>المعلومات الأساسية</h2><p>بيانات الممولين المسجلة في النظام</p></div><button className="outline-link" onClick={loadFinanciers}>تحديث</button></div><div className="table-wrap"><table><thead><tr><th>الرقم</th><th>الممول</th><th>الهاتف</th><th>العنوان</th><th>الاتفاقيات</th><th>الحالة</th></tr></thead><tbody>{visibleFinanciers.map((financier) => <tr key={financier.id} className="clickable-row" onClick={() => { window.history.pushState({}, "", `/financiers/${financier.financier_number}`); window.dispatchEvent(new PopStateEvent("popstate")); }}><td>{financier.financier_number}</td><td>{financier.name}</td><td>{financier.phone || "—"}</td><td>{financier.address || "—"}</td><td>{agreements.filter((agreement) => agreement.financier_id === financier.id).length}</td><td><span className="status-pill">{financier.status === "active" ? "نشط" : financier.status}</span></td></tr>)}</tbody></table>{!visibleFinanciers.length && <div className="no-results">لا توجد بيانات ممولين بعد.</div>}</div></article><article className={`card data-card financier-agreements-card ${activeTab === "agreements" ? "" : "financier-panel-hidden"}`}><div className="data-title"><div><h2>اتفاقيات التمويل</h2><p>نسخ الاتفاقيات وشروط احتساب الربح</p></div></div><div className="table-wrap"><table><thead><tr><th>الممول</th><th>الإصدار</th><th>نوع الربح</th><th>طريقة التخصيص</th><th>سارية من</th></tr></thead><tbody>{agreements.map((agreement) => <tr key={agreement.id}><td>{financiers.find((financier) => financier.id === agreement.financier_id)?.name || "—"}</td><td>V{agreement.version}</td><td>{typeLabel(agreement.agreement_type)}</td><td>{{ capital_first: "رأس المال أولاً", pro_rata: "نسبي", custom: "مخصص" }[agreement.allocation_strategy] || agreement.allocation_strategy}</td><td>{agreement.effective_from}</td></tr>)}</tbody></table>{!agreements.length && <div className="no-results">لا توجد اتفاقيات تمويل بعد.</div>}</div></article><Dialog open={openFinancier} onOpenChange={setOpenFinancier}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>إضافة ممول</DialogTitle><DialogDescription>أدخل المعلومات الأساسية للممول.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveFinancier}><div className="form-grid"><label>اسم الممول<input name="name" placeholder="مثال: شركة أفق التمويل" required /></label><label>رقم الهاتف<input name="phone" inputMode="numeric" placeholder="07XX XXX XXXX" /></label><label>العنوان<input name="address" placeholder="العنوان" /></label><label>ملاحظات<input name="notes" placeholder="اختياري" /></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenFinancier(false)}>إلغاء</Button><Button type="submit">حفظ الممول</Button></DialogFooter></form></DialogContent></Dialog><Dialog open={openAgreement} onOpenChange={setOpenAgreement}><DialogContent className="erp-dialog financier-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>إنشاء اتفاقية تمويل</DialogTitle><DialogDescription>أنشئ إصداراً جديداً من اتفاقية الممول.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={saveAgreement}><div className="form-grid"><label>الممول<select name="financier_id" value={selectedFinancier} onChange={(event) => setSelectedFinancier(event.target.value)} required><option value="">اختر الممول</option>{financiers.map((financier) => <option key={financier.id} value={financier.id}>{financier.name}</option>)}</select></label><label>نوع الربح<select name="agreement_type" defaultValue="profit_percentage"><option value="fixed_profit">ربح ثابت</option><option value="profit_percentage">نسبة مئوية</option><option value="custom">اتفاق مخصص</option></select></label><label>الربح الثابت<input name="fixed_profit" type="text" inputMode="numeric" placeholder="0" /></label><label>نسبة الربح %<input name="profit_percentage" type="text" inputMode="numeric" placeholder="0" /></label><label>طريقة تخصيص رأس المال<select name="allocation_strategy" defaultValue="capital_first"><option value="capital_first">رأس المال أولاً</option><option value="pro_rata">توزيع نسبي</option><option value="custom">مخصص</option></select></label><label>سارية من<input name="effective_from" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} required /></label><label>ملاحظات الاتفاقية<input name="terms_notes" placeholder="الشروط والملاحظات" /></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenAgreement(false)}>إلغاء</Button><Button type="submit">حفظ الاتفاقية</Button></DialogFooter></form></DialogContent></Dialog></section>;
}

function CollectionsPage({ notify }: { notify: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [notes, setNotes] = useState("");
  const [paymentAttachment, setPaymentAttachment] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadCollections = async () => {
    const [customerResult, invoiceResult, contractResult, installmentResult, paymentResult] = await Promise.all([
      supabase.from("customers").select("id,full_name,phone").eq("status", "active").order("full_name"),
      supabase.from("invoices").select("id,invoice_number,customer_id,grand_total,sale_type,status").order("created_at", { ascending: false }),
      supabase.from("contracts").select("id,customer_id,contract_number,invoice_id"),
      supabase.from("installments").select("id,contract_id,installment_number,due_date,original_amount,status").in("status", ["upcoming", "due", "partially_paid", "overdue"]),
      supabase.from("payments").select("id,payment_number,amount,payment_date,payment_method,customer_id,invoice_id,customers(full_name),invoices(invoice_number),receipts(receipt_number)").eq("status", "active").order("payment_date", { ascending: false }),
    ]);
    if (customerResult.error || invoiceResult.error || contractResult.error || installmentResult.error || paymentResult.error) {
      notify(`تعذر تحميل التحصيلات: ${(customerResult.error || invoiceResult.error || contractResult.error || installmentResult.error || paymentResult.error)?.message}`);
      return;
    }
    const contractMap = Object.fromEntries((contractResult.data || []).map((contract) => [contract.id, contract]));
    const loadedCustomers = customerResult.data || [];
    setCustomers(loadedCustomers);
    const prefilledPhone = window.localStorage.getItem("shams-erp-collection-customer-phone");
    const prefilledCustomer = loadedCustomers.find((customer) => customer.phone === prefilledPhone);
    if (prefilledCustomer) {
      setCustomerId(prefilledCustomer.id);
      setOpen(true);
      window.localStorage.removeItem("shams-erp-collection-customer-phone");
    }
    setInvoices(invoiceResult.data || []);
    setInstallments((installmentResult.data || []).map((installment) => ({ ...installment, contract: contractMap[installment.contract_id] })));
    setPayments(paymentResult.data || []);
  };

  useEffect(() => { loadCollections(); }, []);
  const customerInvoices = invoices.filter((invoice) => invoice.customer_id === customerId);
  const customerInstallments = installments.filter((installment) => installment.contract?.customer_id === customerId);
  const referenceLabel = (value: string) => {
    const [kind, id] = value.split(":");
    if (kind === "invoice") return invoices.find((invoice) => invoice.id === id)?.invoice_number || "فاتورة";
    const installment = installments.find((item) => item.id === id);
    return installment ? `${installment.contract?.contract_number || "عقد"} — القسط ${installment.installment_number}` : "قسط";
  };
  const savePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedAmount = Number(normalizeDigits(amount).replace(/\D/g, ""));
    const [kind, id] = reference.split(":");
    if (!customerId || !id || !normalizedAmount || !kind) { notify("اختر العميل والمرجع وأدخل مبلغاً صحيحاً"); return; }
    const { data, error } = await supabase.rpc("record_payment", {
      p_customer_id: customerId, p_invoice_id: kind === "invoice" ? id : null, p_installment_id: kind === "installment" ? id : null,
      p_amount: normalizedAmount, p_payment_method: paymentMethod, p_payment_date: paymentDate, p_notes: notes.trim() || null,
    });
    if (error) { notify(`تعذر تسجيل التحصيل: ${error.message}`); return; }
    let attachmentWarning = "";
    const savedPayment = data?.[0];
    if (paymentAttachment && savedPayment?.payment_id) {
      const safeFileName = paymentAttachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${savedPayment.payment_id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(storagePath, paymentAttachment, {
        contentType: paymentAttachment.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) {
        attachmentWarning = `تم حفظ التحصيل لكن تعذر رفع الوصل: ${uploadError.message}`;
      } else {
        const { error: attachmentError } = await supabase.from("payment_attachments").insert({
          payment_id: savedPayment.payment_id,
          file_name: paymentAttachment.name,
          storage_path: storagePath,
          mime_type: paymentAttachment.type || null,
          file_size: paymentAttachment.size,
        });
        if (attachmentError) attachmentWarning = `تم حفظ التحصيل لكن تعذر ربط الوصل: ${attachmentError.message}`;
      }
    }
    setOpen(false); setCustomerId(""); setReference(""); setAmount(""); setNotes(""); setPaymentAttachment(null);
    await loadCollections();
    notify(attachmentWarning || `تم تسجيل سند القبض ${savedPayment?.receipt_number || "بنجاح"}`);
  };
  const visiblePayments = payments.filter((payment) => `${payment.payment_number} ${payment.customers?.full_name || ""} ${payment.invoices?.invoice_number || ""}`.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  return (
    <section className="module-page collections-page">
      <div className="page-heading"><div><p className="eyebrow">إدارة الأعمال</p><h1>التحصيلات</h1><p className="subtle">سجل الدفعات واربط كل تحصيل بالفاتورة أو القسط الصحيح.</p></div><div className="heading-actions"><div className="module-search"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث في التحصيلات..." /></div><button className="primary-btn" onClick={() => setOpen(true)}><Plus size={18} /> تسجيل تحصيل</button></div></div>
      <section className="module-summary"><div><span>إجمالي السندات</span><b>{payments.length}</b></div><div><span>نتائج البحث</span><b>{visiblePayments.length}</b></div><div><span>الأقساط المفتوحة</span><b>{installments.length}</b></div></section>
      <article className="card data-card"><div className="data-title"><div><h2>سجل سندات القبض</h2><p>كل الدفعات المسجلة في النظام</p></div><button className="outline-link" onClick={loadCollections}>تحديث</button></div><div className="table-wrap"><table><thead><tr><th>السند</th><th>العميل</th><th>المرجع</th><th>المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead><tbody>{visiblePayments.map((payment) => <tr key={payment.id}><td>{payment.payment_number}<small className="table-subtext">{payment.receipts?.[0]?.receipt_number || payment.receipts?.receipt_number || "—"}</small></td><td>{payment.customers?.full_name || "—"}</td><td>{payment.invoices?.invoice_number || "قسط"}</td><td>{money.format(payment.amount)} د.ع</td><td>{({ cash: "نقدي", bank_transfer: "تحويل مصرفي", pos: "POS", other: "أخرى" } as Record<string, string>)[payment.payment_method] || payment.payment_method}</td><td>{String(payment.payment_date || "—").slice(0, 10)}</td></tr>)}</tbody></table>{visiblePayments.length === 0 && <div className="no-results">لا توجد تحصيلات مسجلة بعد.</div>}</div></article>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="erp-dialog collection-dialog" dir="rtl" showCloseButton={false}><div className="dialog-heading"><DialogHeader><DialogTitle>تسجيل تحصيل جديد</DialogTitle><DialogDescription>سجّل الدفعة واربطها بالفاتورة أو القسط حتى يتحدث الرصيد تلقائياً.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div><form onSubmit={savePayment}><div className="form-grid"><label>العميل<select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setReference(""); }} required><option value="">اختر العميل</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}</select></label><label>الفاتورة أو القسط<select value={reference} onChange={(event) => setReference(event.target.value)} required disabled={!customerId}><option value="">اختر المرجع</option>{customerInvoices.map((invoice) => <option key={`invoice:${invoice.id}`} value={`invoice:${invoice.id}`}>{invoice.invoice_number} — {money.format(invoice.grand_total)} د.ع</option>)}{customerInstallments.map((installment) => <option key={`installment:${installment.id}`} value={`installment:${installment.id}`}>{referenceLabel(`installment:${installment.id}`)} — {money.format(installment.original_amount)} د.ع</option>)}</select></label><label>مبلغ التحصيل<input value={amount} onChange={(event) => setAmount(normalizeDigits(event.target.value).replace(/\D/g, ""))} inputMode="numeric" type="text" placeholder="مثال: 850000" required /></label><label>طريقة الدفع<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">نقدي</option><option value="bank_transfer">تحويل مصرفي</option><option value="pos">POS</option><option value="other">أخرى</option></select></label><label>تاريخ التحصيل<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label><label>ملاحظات<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="اختياري" /></label></div><label className="collection-attachment-field"><span>وصل التحصيل أو المرفق</span><span className="purchase-upload-button"><Upload size={15} /> اختيار صورة أو ملف<input type="file" accept="image/*,.pdf" onChange={(event) => setPaymentAttachment(event.target.files?.[0] || null)} /></span><small>{paymentAttachment ? paymentAttachment.name : "اختياري — صورة الوصل أو PDF"}</small></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button type="submit">حفظ سند القبض</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}

function CatalogEntityProfile({ kind, entityId, onBack }: { kind: "supplier" | "company"; entityId: string; onBack: () => void }) {
  const [entity, setEntity] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const table = kind === "supplier" ? "suppliers" : "companies";
      const relation = kind === "supplier" ? "supplier_id" : "company_id";
      const [{ data: entityRow }, { data: productRows }] = await Promise.all([
        supabase.from(table).select("id,name,phone,address,status").eq("id", entityId).single(),
        supabase.from("products").select("id,sku,name,model,cost_price,selling_price,stock_quantity,status,companies(name),suppliers(name)").eq(relation, entityId).order("name"),
      ]);
      setEntity(entityRow); setProducts(productRows || []);
    };
    load();
  }, [kind, entityId]);
  if (!entity) return <section className="module-page"><div className="no-results">جارٍ تحميل الملف...</div></section>;
  return <section className="module-page"><button className="back-link" onClick={onBack}><ChevronRight size={18} /> العودة إلى المخزن</button><div className="page-heading"><div><p className="eyebrow">{kind === "supplier" ? "ملف المورد" : "ملف الشركة / الماركة"}</p><h1>{entity.name}</h1><p className="subtle">{kind === "supplier" ? "المنتجات والماركات التي تم تجهيزها من هذا المورد." : "كل المواد التابعة لهذه الشركة مع مورديها."}</p></div><span className="status-pill">{entity.status === "active" ? "نشط" : entity.status}</span></div><section className="module-summary"><div><span>عدد المنتجات</span><b>{products.length}</b></div><div><span>الكمية بالمخزن</span><b>{products.reduce((sum, product) => sum + Number(product.stock_quantity || 0), 0)}</b></div><div><span>رقم الهاتف</span><b>{entity.phone || "—"}</b></div></section><article className="card data-card"><div className="data-title"><div><h2>{kind === "supplier" ? "المنتجات المجهزة من المورد" : "منتجات الشركة / الماركة"}</h2><p>{kind === "supplier" ? "كل الماركات والمواد التي تم شراؤها من هذا المورد." : "كل المواد مع المورد المرتبط بكل مادة."}</p></div></div><div className="table-wrap"><table><thead><tr><th>المنتج</th><th>الكود</th><th>الموديل</th><th>{kind === "supplier" ? "الشركة / الماركة" : "المورد"}</th><th>الكمية</th><th>سعر البيع</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku || "—"}</td><td>{product.model || "—"}</td><td>{kind === "supplier" ? product.companies?.name || "—" : product.suppliers?.name || "—"}</td><td>{product.stock_quantity || 0}</td><td>{money.format(product.selling_price || 0)} د.ع</td></tr>)}</tbody></table>{!products.length && <div className="no-results">لا توجد منتجات مرتبطة بعد.</div>}</div></article></section>;
}

function InventoryPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"products" | "services" | "companies" | "suppliers">(
    "products",
  );
  const [companies, setCompanies] = useState<
    { id: string; name: string; phone: string | null }[]
  >([]);
  const [suppliers, setSuppliers] = useState<
    { id: string; name: string; phone: string | null }[]
  >([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseSupplierQuery, setPurchaseSupplierQuery] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState<{ id: string; name: string } | null>(null);
  const [purchaseAttachment, setPurchaseAttachment] = useState<File | null>(null);
  const [purchaseLines, setPurchaseLines] = useState([{ productId: "", productQuery: "", quantity: 1, unitCost: 0 }]);
  const [entityProfile, setEntityProfile] = useState<{ kind: "supplier" | "company"; id: string } | null>(null);
  const matchingCompanies = companies.filter((company) => company.name.toLowerCase().includes(companyQuery.toLowerCase().trim()));
  const matchingSuppliers = suppliers.filter((supplier) => supplier.name.toLowerCase().includes(supplierQuery.toLowerCase().trim()));

  const loadCatalog = async () => {
    const [
      { data: companyRows },
      { data: supplierRows },
      { data: productRows },
      { data: serviceRows },
    ] = await Promise.all([
      supabase.from("companies").select("id,name,phone").order("name"),
      supabase.from("suppliers").select("id,name,phone").order("name"),
      supabase
        .from("products")
        .select(
          "id,sku,name,model,cost_price,selling_price,stock_quantity,status,companies(name),suppliers(name)",
        )
        .order("name", { ascending: true }),
      supabase.from("services").select("id,service_code,name,description,cost_price,selling_price,status").order("name"),
    ]);
    setCompanies(companyRows || []);
    setSuppliers(supplierRows || []);
    setProducts(productRows || []);
    setServices(serviceRows || []);
  };
  useEffect(() => {
    loadCatalog();
  }, []);

  const saveCatalogRecord = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    if (!name) {
      notify("الاسم مطلوب");
      return;
    }
    const table =
      tab === "companies"
        ? "companies"
        : tab === "suppliers"
          ? "suppliers"
          : tab === "services"
            ? "services"
            : "products";
    const numericValue = (field: string) => Number(normalizeDigits(String(values.get(field) || "")).replace(/[^0-9.-]/g, "")) || 0;
    const payload =
      tab === "products"
        ? {
            name,
            sku: String(values.get("sku") || "").trim() || `PRD-${new Date().getFullYear()}-${Date.now()}`,
            model: String(values.get("model") || "").trim() || null,
            company_id: String(values.get("company_id") || "") || null,
            supplier_id: String(values.get("supplier_id") || "") || null,
            cost_price: numericValue("cost_price"),
            selling_price: numericValue("selling_price"),
            stock_quantity: numericValue("stock_quantity"),
            status: "active",
          }
        : tab === "services"
          ? {
              service_code: `SRV-${new Date().getFullYear()}-${Date.now()}`,
              name,
              description: String(values.get("description") || "").trim() || null,
              cost_price: numericValue("cost_price"),
              selling_price: numericValue("selling_price"),
              status: "active",
            }
        : {
            name,
            phone:
              normalizeDigits(String(values.get("phone") || ""))
                .replace(/\D/g, "")
                .slice(0, 11) || null,
            address: String(values.get("address") || "").trim() || null,
            status: "active",
          };
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      notify(`تعذر الحفظ: ${error.message}`);
      return;
    }
    await loadCatalog();
    setOpen(false);
    notify(
      `تمت إضافة ${tab === "products" ? "المنتج" : tab === "services" ? "الخدمة" : tab === "companies" ? "الشركة" : "المورد"} بنجاح`,
    );
  };

  const title =
    tab === "products"
      ? "المنتجات"
      : tab === "services"
        ? "الخدمات"
      : tab === "companies"
        ? "الشركات والماركات"
        : "الموردون";
  const purchaseSupplierMatches = suppliers.filter((supplier) => supplier.name.toLowerCase().includes(purchaseSupplierQuery.toLowerCase().trim()));
  const purchaseTotal = purchaseLines.reduce((total, line) => total + line.quantity * line.unitCost, 0);
  const matchingProducts = (query: string) => products.filter((product) => `${product.name} ${product.companies?.name || ""} ${product.model || ""}`.toLowerCase().includes(query.toLowerCase().trim()));
  const savePurchaseReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!purchaseSupplier || purchaseLines.some((line) => !line.productId || line.quantity < 1 || line.unitCost < 0)) { notify("اختر المورد وأكمل كل بنود الفاتورة"); return; }
    const receiptNumber = `PUR-${new Date().getFullYear()}-${Date.now()}`;
    const { data: receipt, error: receiptError } = await supabase.from("purchase_receipts").insert({ receipt_number: receiptNumber, supplier_id: purchaseSupplier.id, subtotal: purchaseTotal, status: "active" }).select("id").single();
    if (receiptError || !receipt) { notify(`تعذر حفظ فاتورة الإدخال: ${receiptError?.message || "خطأ غير معروف"}`); return; }
    const items = purchaseLines.map((line) => ({ receipt_id: receipt.id, product_id: line.productId, quantity: line.quantity, unit_cost: line.unitCost }));
    const { error: itemsError } = await supabase.from("purchase_receipt_items").insert(items);
    if (itemsError) { notify(`تعذر حفظ بنود الفاتورة: ${itemsError.message}`); return; }
    const { error: movementsError } = await supabase.from("inventory_movements").insert(purchaseLines.map((line) => ({ product_id: line.productId, movement_type: "purchase", quantity: line.quantity, unit_cost: line.unitCost, purchase_receipt_id: receipt.id })));
    if (movementsError) { notify(`تم حفظ الفاتورة لكن تعذر تسجيل حركة المخزون: ${movementsError.message}`); return; }
    for (const line of purchaseLines) {
      const product = products.find((item) => item.id === line.productId);
      await supabase.from("products").update({ stock_quantity: (product?.stock_quantity || 0) + line.quantity, cost_price: line.unitCost }).eq("id", line.productId);
    }
    let attachmentWarning = "";
    if (purchaseAttachment) {
      const safeFileName = purchaseAttachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${receipt.id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("purchase-receipts").upload(storagePath, purchaseAttachment, {
        contentType: purchaseAttachment.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) {
        attachmentWarning = `تم حفظ الفاتورة لكن تعذر رفع صورة الفاتورة: ${uploadError.message}`;
      } else {
        const { error: attachmentError } = await supabase.from("purchase_receipt_attachments").insert({
          receipt_id: receipt.id,
          file_name: purchaseAttachment.name,
          storage_path: storagePath,
          mime_type: purchaseAttachment.type || null,
          file_size: purchaseAttachment.size,
        });
        if (attachmentError) attachmentWarning = `تم حفظ الفاتورة لكن تعذر ربط الصورة: ${attachmentError.message}`;
      }
    }
    await loadCatalog(); setPurchaseOpen(false); setPurchaseSupplier(null); setPurchaseSupplierQuery(""); setPurchaseAttachment(null); setPurchaseLines([{ productId: "", productQuery: "", quantity: 1, unitCost: 0 }]); notify(attachmentWarning || `تم حفظ فاتورة الإدخال ${receiptNumber}`);
  };
  if (entityProfile) return <CatalogEntityProfile kind={entityProfile.kind} entityId={entityProfile.id} onBack={() => setEntityProfile(null)} />;
  return (
    <section className="module-page inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">المخزن</p>
          <h1>{title}</h1>
          <p className="subtle">
            افصل الشركة المصنّعة عن المورد واربط كل منتج بالجهات الصحيحة.
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-btn" onClick={() => setPurchaseOpen(true)}>
            <Plus size={18} /> فاتورة إدخال
          </button>
          <button className="primary-btn" onClick={() => setOpen(true)}>
            <Plus size={18} />
            {tab === "products"
              ? "إضافة منتج"
              : tab === "services"
                ? "إضافة خدمة"
              : tab === "companies"
                ? "إضافة شركة"
                : "إضافة مورد"}
          </button>
        </div>
      </div>
      <div className="inventory-tabs">
        <button
          className={tab === "products" ? "active" : ""}
          onClick={() => setTab("products")}
        >
          المنتجات <span>{products.length}</span>
        </button>
        <button
          className={tab === "services" ? "active" : ""}
          onClick={() => setTab("services")}
        >
          الخدمات <span>{services.length}</span>
        </button>
        <button
          className={tab === "companies" ? "active" : ""}
          onClick={() => setTab("companies")}
        >
          الشركات/الماركات <span>{companies.length}</span>
        </button>
        <button
          className={tab === "suppliers" ? "active" : ""}
          onClick={() => setTab("suppliers")}
        >
          الموردون <span>{suppliers.length}</span>
        </button>
      </div>
      <section className="inventory-summary">
        <article>
          <span>إجمالي المنتجات</span>
          <b>{products.length}</b>
        </article>
        <article>
          <span>الخدمات</span>
          <b>{services.length}</b>
        </article>
        <article>
          <span>الشركات/الماركات</span>
          <b>{companies.length}</b>
        </article>
        <article>
          <span>الموردون</span>
          <b>{suppliers.length}</b>
        </article>
      </section>
      <article className="card data-card">
        <div className="data-title">
          <div>
            <h2>{title}</h2>
            <p>
              {tab === "products"
                ? "كل منتج مرتبط بشركة/ماركة ومورد."
                : tab === "services"
                  ? "خدمات مسعّرة لا ترتبط بكمية مخزنية."
                : tab === "companies"
                  ? "الجهات المصنّعة والعلامات التجارية."
                  : "الجهات التي تشتري منها المنتجات."}
            </p>
          </div>
          <button className="outline-link" onClick={loadCatalog}>
            تحديث
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {tab === "products" ? (
                  <>
                    <th>المنتج</th>
                    <th>الكود</th>
                    <th>الشركة/الماركة</th>
                    <th>المورد</th>
                    <th>الكمية</th>
                    <th>الحالة</th>
                  </>
                ) : tab === "services" ? (
                  <>
                    <th>الخدمة</th>
                    <th>الكود</th>
                    <th>التكلفة</th>
                    <th>سعر البيع</th>
                    <th>الحالة</th>
                  </>
                ) : (
                  <>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>الحالة</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "products"
                ? products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.name}
                        {product.model ? ` — ${product.model}` : ""}
                      </td>
                      <td>{product.sku || "—"}</td>
                      <td>{product.companies?.name || "—"}</td>
                      <td>{product.suppliers?.name || "—"}</td>
                      <td>{product.stock_quantity ?? 0}</td>
                      <td>
                        <span className="status-pill">نشط</span>
                      </td>
                    </tr>
                  ))
                : tab === "services"
                  ? services.map((service) => (
                      <tr key={service.id}>
                        <td>{service.name}</td>
                        <td>{service.service_code}</td>
                        <td>{money.format(service.cost_price || 0)} د.ع</td>
                        <td>{money.format(service.selling_price || 0)} د.ع</td>
                        <td><span className="status-pill">نشط</span></td>
                      </tr>
                    ))
                  : (tab === "companies" ? companies : suppliers).map(
                    (record) => (
                      <tr key={record.id} className="clickable-row" onClick={() => setEntityProfile({ kind: tab === "companies" ? "company" : "supplier", id: record.id })}>
                        <td>{record.name}</td>
                        <td>{record.phone || "—"}</td>
                        <td>
                          <span className="status-pill">نشط</span>
                        </td>
                      </tr>
                    ),
                  )}
            </tbody>
          </table>
          {((tab === "products" && !products.length) ||
            (tab === "services" && !services.length) ||
            (tab === "companies" && !companies.length) ||
            (tab === "suppliers" && !suppliers.length)) && (
            <div className="no-results">لا توجد بيانات مسجلة بعد.</div>
          )}
        </div>
      </article>
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="erp-dialog purchase-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading"><DialogHeader><DialogTitle>فاتورة شراء وإدخال مخزني</DialogTitle><DialogDescription>أدخل عدة منتجات دفعة واحدة، وستزداد كمياتها في المخزن عند الحفظ.</DialogDescription></DialogHeader><DialogClose className="dialog-close" aria-label="إغلاق"><X size={18} /></DialogClose></div>
          <form onSubmit={savePurchaseReceipt}>
            <div className="purchase-header-grid"><label className="catalog-picker-label">المورد<input type="hidden" name="purchase_supplier_id" value={purchaseSupplier?.id || ""} /><input value={purchaseSupplier ? purchaseSupplier.name : purchaseSupplierQuery} onChange={(event) => { setPurchaseSupplier(null); setPurchaseSupplierQuery(event.target.value); }} placeholder="ابحث عن المورد" autoComplete="off" required />{purchaseSupplierQuery && !purchaseSupplier && <div className="catalog-picker-results">{purchaseSupplierMatches.length ? purchaseSupplierMatches.map((supplier) => <button type="button" key={supplier.id} onClick={() => { setPurchaseSupplier(supplier); setPurchaseSupplierQuery(""); }}><span>{supplier.name}</span></button>) : <p>لا يوجد مورد مطابق</p>}</div>}</label><label>تاريخ الفاتورة<input type="date" defaultValue={new Date().toLocaleDateString("en-CA")} /></label><label className="purchase-attachment-field"><span>صورة فاتورة الشراء</span><span className="purchase-upload-button"><Upload size={15} /> اختيار صورة أو ملف<input type="file" accept="image/*,.pdf" onChange={(event) => setPurchaseAttachment(event.target.files?.[0] || null)} /></span><small>{purchaseAttachment ? purchaseAttachment.name : "اختياري — صورة أو PDF"}</small></label></div>
            <div className="purchase-lines-heading"><h3>بنود الفاتورة</h3><button type="button" className="outline-link" onClick={() => setPurchaseLines((lines) => [...lines, { productId: "", productQuery: "", quantity: 1, unitCost: 0 }])}><Plus size={15} /> إضافة منتج</button></div>
            <div className="purchase-lines"><div className="purchase-line-head"><span>المنتج</span><span>الكمية</span><span>سعر الشراء</span><span>الإجمالي</span><span /></div>{purchaseLines.map((line, index) => <div className="purchase-line" key={index}><div className="product-picker"><input value={line.productId ? `${products.find((product) => product.id === line.productId)?.name || ""} — ${products.find((product) => product.id === line.productId)?.companies?.name || ""}` : line.productQuery} onChange={(event) => setPurchaseLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, productId: "", productQuery: event.target.value } : item))} placeholder="ابحث عن المنتج" autoComplete="off" required />{line.productQuery && !line.productId && <div className="product-picker-results">{matchingProducts(line.productQuery).length ? matchingProducts(line.productQuery).map((product) => <button type="button" key={product.id} onClick={() => setPurchaseLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, productId: product.id, productQuery: "", unitCost: item.unitCost || product.cost_price || 0 } : item))}><strong>{product.name}</strong><span>{product.companies?.name || "شركة غير محددة"}</span></button>) : <p>لا يوجد منتج مطابق</p>}</div>}</div><input type="text" inputMode="numeric" min="1" value={line.quantity} onChange={(event) => setPurchaseLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item))} required /><input type="text" inputMode="numeric" min="0" value={line.unitCost} onChange={(event) => setPurchaseLines((lines) => lines.map((item, itemIndex) => itemIndex === index ? { ...item, unitCost: Math.max(0, Number(event.target.value) || 0) } : item))} required /><strong>{money.format(line.quantity * line.unitCost)} د.ع</strong><button type="button" className="remove-line" onClick={() => setPurchaseLines((lines) => lines.length === 1 ? lines : lines.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف البند"><Trash2 size={16} /></button></div>)}</div>
            <div className="purchase-total"><span>إجمالي فاتورة الإدخال</span><strong>{money.format(purchaseTotal)} د.ع</strong></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setPurchaseOpen(false)}>إلغاء</Button><Button type="submit">حفظ وإدخال للمخزن</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="erp-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-heading">
            <DialogHeader>
              <DialogTitle>
                {tab === "products"
                  ? "إضافة منتج"
                  : tab === "services"
                    ? "إضافة خدمة"
                  : tab === "companies"
                    ? "إضافة شركة/ماركة"
                    : "إضافة مورد"}
              </DialogTitle>
              <DialogDescription>
                {tab === "products"
                  ? "اربط المنتج بالشركة والمورد حتى يظهر بشكل صحيح في الفواتير."
                  : tab === "services"
                    ? "أدخل خدمة قابلة للبيع بدون كمية مخزنية."
                  : "أدخل بيانات الجهة حتى تستخدمها مع المنتجات."}
              </DialogDescription>
            </DialogHeader>
            <DialogClose className="dialog-close" aria-label="إغلاق">
              <X size={18} />
            </DialogClose>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveCatalogRecord(event.currentTarget);
            }}
          >
            <div className="form-grid">
              <label>
                الاسم
                <input
                  name="name"
                  placeholder={
                    tab === "products"
                      ? "مثال: هاتف ذكي"
                      : tab === "companies"
                        ? "مثال: Samsung"
                        : "مثال: شركة التجهيز"
                  }
                  required
                />
              </label>
              {tab === "products" ? (
                <>
                  <label>
                    الموديل
                    <input name="model" placeholder="مثال: S25 Ultra" />
                  </label>
                  <label className="catalog-picker-label">
                    الشركة/الماركة
                    <input name="company_id" type="hidden" value={selectedCompany?.id || ""} />
                    <input value={selectedCompany ? selectedCompany.name : companyQuery} onChange={(event) => { setSelectedCompany(null); setCompanyQuery(event.target.value); }} placeholder="ابحث عن الشركة" autoComplete="off" />
                    {companyQuery && !selectedCompany && <div className="catalog-picker-results">{matchingCompanies.length ? matchingCompanies.map((company) => <button type="button" key={company.id} onClick={() => { setSelectedCompany(company); setCompanyQuery(""); }}><span>{company.name}</span></button>) : <p>لا توجد شركة مطابقة</p>}</div>}
                  </label>
                  <label className="catalog-picker-label">
                    المورد
                    <input name="supplier_id" type="hidden" value={selectedSupplier?.id || ""} />
                    <input value={selectedSupplier ? selectedSupplier.name : supplierQuery} onChange={(event) => { setSelectedSupplier(null); setSupplierQuery(event.target.value); }} placeholder="ابحث عن المورد" autoComplete="off" />
                    {supplierQuery && !selectedSupplier && <div className="catalog-picker-results">{matchingSuppliers.length ? matchingSuppliers.map((supplier) => <button type="button" key={supplier.id} onClick={() => { setSelectedSupplier(supplier); setSupplierQuery(""); }}><span>{supplier.name}</span></button>) : <p>لا يوجد مورد مطابق</p>}</div>}
                  </label>
                  <label>
                    سعر الشراء
                    <input
                      name="cost_price"
                      type="text"
                      inputMode="numeric"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                  <label>
                    سعر البيع
                    <input
                      name="selling_price"
                      type="text"
                      inputMode="numeric"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                  <label>
                    الكمية الافتتاحية
                    <input
                      name="stock_quantity"
                      type="text"
                      inputMode="numeric"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                </>
              ) : tab === "services" ? (
                <>
                  <label>
                    الوصف
                    <input name="description" placeholder="مثال: صيانة وتركيب" />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    رقم الهاتف
                    <input
                      name="phone"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="07XX XXX XXXX"
                    />
                  </label>
                  <label>
                    العنوان
                    <input name="address" placeholder="العنوان" />
                  </label>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function HomeApp() {
  const [active, setActive] = useState(() =>
    sectionFromPath(window.location.pathname),
  );
  const [period, setPeriod] = useState("هذا الشهر");
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [notice, setNotice] = useState("");
  const [customer, setCustomer] = useState<string[] | null>(null);
  const [financierNumber, setFinancierNumber] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [invoiceCreate, setInvoiceCreate] = useState(false);
  useEffect(() => {
    document.title = "ERP-Taqa | منظومة إدارة الطاقة";
  }, []);
  const navigateTo = (section: string) => {
    window.history.pushState({}, "", sectionPaths[section] || "/");
    setActive(section);
    setCustomer(null);
    setFinancierNumber(null);
    setInvoiceNumber(null);
    setInvoiceCreate(false);
  };
  const notify = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2500);
  };
  useEffect(() => {
    Object.keys(window.localStorage)
      .filter(
        (key) =>
          key.startsWith("shams-erp-") && !key.startsWith("shams-erp-v2-"),
      )
      .forEach((key) => window.localStorage.removeItem(key));
  }, []);
  useEffect(() => {
    const loadInvoiceFromPath = async () => {
      if (window.location.pathname === "/sales/new") {
        setInvoiceCreate(true);
        setActive("المبيعات");
        return;
      }
      const financierMatch = window.location.pathname.match(/^\/financiers\/([^/]+)$/);
      if (financierMatch) {
        setFinancierNumber(decodeURIComponent(financierMatch[1]));
        setActive("الممولون");
        return;
      }
      const match = window.location.pathname.match(/^\/sales\/([^/]+)$/);
      if (!match) return;
      setInvoiceNumber(decodeURIComponent(match[1]));
      setActive("المبيعات");
    };
    loadInvoiceFromPath();
  }, []);
  useEffect(() => {
    const normalizeInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      if (input instanceof HTMLInputElement && input.type === "file") return;
      const numericOnly = input.inputMode === "numeric" ||
        ["second", "alternative_phone", "phone", "amount", "total", "cost_price", "selling_price", "stock_quantity"].includes(input.name);
      const normalized = numericOnly
        ? normalizeDigits(input.value).replace(/\D/g, "")
        : normalizeDigits(input.value);
      if (normalized !== input.value) {
        const cursor = input.selectionStart;
        input.value = normalized;
        if (cursor !== null)
          input.setSelectionRange(
            Math.min(cursor, normalized.length),
            Math.min(cursor, normalized.length),
          );
      }
    };
    document.addEventListener("input", normalizeInput);
    return () => document.removeEventListener("input", normalizeInput);
  }, []);
  useEffect(() => {
    const openCustomer = (event: Event) =>
      setCustomer((event as CustomEvent<string[]>).detail);
    window.addEventListener("open-customer", openCustomer);
    return () => window.removeEventListener("open-customer", openCustomer);
  }, []);
  useEffect(() => {
    const loadCustomerFromPath = async () => {
      const match = window.location.pathname.match(/^\/customers\/([^/]+)$/);
      if (!match) return;
      const { data } = await supabase
        .from("customers")
        .select("full_name,phone,governorate,status")
        .eq("customer_number", decodeURIComponent(match[1]))
        .single();
      if (data)
        setCustomer([
          data.full_name,
          data.phone,
          data.governorate || "—",
          "0",
          "—",
          data.status === "active" ? "نشط" : data.status,
        ]);
      if (data) setActive("العملاء");
    };
    loadCustomerFromPath();
  }, []);
  useEffect(() => {
    const handleHistory = async () => {
      setActive(sectionFromPath(window.location.pathname));
      const customerMatch = window.location.pathname.match(/^\/customers\/([^/]+)$/);
      if (customerMatch) {
        const { data } = await supabase.from("customers").select("full_name,phone,governorate,status").eq("customer_number", decodeURIComponent(customerMatch[1])).single();
        if (data) setCustomer([data.full_name, data.phone, data.governorate || "—", "0", "—", data.status === "active" ? "نشط" : data.status]);
      } else {
        setCustomer(null);
      }
      if (!window.location.pathname.startsWith("/sales/"))
        setInvoiceNumber(null);
      setInvoiceCreate(window.location.pathname === "/sales/new");
      const match = window.location.pathname.match(/^\/sales\/([^/]+)$/);
      if (match) setInvoiceNumber(decodeURIComponent(match[1]));
      const financierMatch = window.location.pathname.match(/^\/financiers\/([^/]+)$/);
      setFinancierNumber(financierMatch ? decodeURIComponent(financierMatch[1]) : null);
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);
  useEffect(() => {
    const closeProfileOnNavigation = (event: Event) => {
      if (
        (event.target as HTMLElement).closest(
          ".sidebar nav button, .sidebar-bottom button",
        )
      )
        setCustomer(null);
    };
    document.addEventListener("click", closeProfileOnNavigation);
    return () =>
      document.removeEventListener("click", closeProfileOnNavigation);
  }, []);
  return (
    <main className="erp-shell" dir="rtl">
      {notice && (
        <div className="toast">
          <span>✓</span>
          {notice}
        </div>
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>ERP-Taqa</b>
            <small>منظومة إدارة الطاقة</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMenu(false)}
            aria-label="إغلاق القائمة"
          >
            <X />
          </button>
        </div>
        <nav>
          {navGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  className={active === item.label ? "nav-active" : ""}
                  onClick={() => {
                    navigateTo(item.label);
                    setMenu(false);
                  }}
                >
                  <item.icon size={19} />
                  <span>{item.label}</span>
                  {item.label === "التحصيلات" && <em>8</em>}
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            onClick={() => {
              navigateTo("الإعدادات");
              setMenu(false);
            }}
          >
            <Settings size={19} />
            <span>الإعدادات</span>
          </button>
          <button
            className="person"
            onClick={() => supabase.auth.signOut()}
            title="تسجيل الخروج"
          >
            <div className="avatar dark">ع</div>
            <div>
              <b>أحمد العزاوي</b>
              <small>مدير النظام</small>
            </div>
            <span className="person-logout">تسجيل خروج</span>
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="backdrop"
          onClick={() => setMenu(false)}
          aria-label="إغلاق القائمة"
        />
      )}
      <section className="content">
        <header className="topbar">
          <div className="top-right">
            <button
              className="hamburger"
              onClick={() => setMenu(true)}
              aria-label="فتح القائمة"
            >
              <Menu />
            </button>
            <div className="crumb">
              <b>{active}</b>
              <span>/</span>
              <small>الرئيسية</small>
            </div>
          </div>
          <div className="top-actions">
            <button className="search-btn" onClick={() => setSearch(!search)}>
              <Search size={19} />
              <span>بحث سريع...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              onClick={() => notify("لديك 3 إشعارات جديدة")}
            >
              <Bell size={19} />
              <i />
            </button>
            <button className="icon-button help">
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        {search && (
          <div className="search-panel">
            <Search size={18} />
            <input placeholder="ابحث عن عميل، عقد، فاتورة أو سند قبض..." />
            <kbd>ESC</kbd>
          </div>
        )}
        {customer && (
          <CustomerProfilePage
            customer={customer}
            notify={notify}
            onBack={() => setCustomer(null)}
          />
        )}
        {invoiceNumber && (
          <InvoiceProfilePage
            invoiceNumber={invoiceNumber}
            notify={notify}
            onBack={() => {
              window.history.pushState({}, "", "/sales");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        )}
        {invoiceCreate && (
          <InvoiceCreatePage
            notify={notify}
            onBack={() => {
              const returnPath = window.localStorage.getItem("shams-erp-invoice-return-path") || "/sales";
              window.localStorage.removeItem("shams-erp-invoice-return-path");
              window.history.pushState({}, "", returnPath);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        )}
        {financierNumber && !customer && !invoiceNumber && !invoiceCreate && (
          <FinancierProfilePageV2
            financierNumber={financierNumber}
            notify={notify}
            onBack={() => {
              window.history.pushState({}, "", "/financiers");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        )}
        {!customer && !financierNumber && !invoiceNumber && !invoiceCreate && active !== "لوحة التحكم" ? (
          active === "دليل الاستخدام" ? (
            <UserGuidePage />
          ) : active === "المخزن" ? (
            <InventoryPage notify={notify} />
          ) : active === "الممولون" ? (
            <FinanciersPageWizard notify={notify} />
          ) : active === "التحصيلات" ? (
            <CollectionsPage notify={notify} />
          ) : (
            <ModulePage name={active} notify={notify} />
          )
        ) : !customer && !financierNumber && !invoiceNumber && !invoiceCreate ? (
          <div className="dashboard">
            <div className="page-heading">
              <div>
                <p className="eyebrow">نظرة عامة مالية</p>
                <h1>
                  صباح الخير، أحمد <span>👋</span>
                </h1>
                <p className="subtle">
                  إليك ملخص أداء أعمالك اليوم، السبت 27 أيلول 2026
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="period"
                  onClick={() =>
                    setPeriod(
                      period === "هذا الشهر" ? "هذا الأسبوع" : "هذا الشهر",
                    )
                  }
                >
                  <span className="calendar-dot" />
                  {period}
                  <ChevronDown size={16} />
                </button>
                <button
                  className="primary-btn"
                  onClick={() => notify("تم فتح نموذج عملية جديدة")}
                >
                  <Plus size={18} />
                  عملية جديدة
                </button>
              </div>
            </div>
            <section className="metrics">
              <Metric
                title="إجمالي المبيعات"
                value={0}
                change="0%"
                icon={TrendingUp}
                accent="indigo"
              />
              <Metric
                title="إجمالي المقبوضات"
                value={0}
                change="0%"
                icon={WalletCards}
                accent="emerald"
              />
              <Metric
                title="ذمم العملاء"
                value={0}
                change="0%"
                icon={Users}
                accent="amber"
              />
              <Metric
                title="المصروفات"
                value={0}
                change="0%"
                icon={TrendingDown}
                accent="rose"
              />
            </section>
            <section className="grid-main">
              <article className="card sales-card">
                <div className="card-head">
                  <div>
                    <h2>أداء المبيعات</h2>
                    <p>لا توجد بيانات مبيعات بعد</p>
                  </div>
                  <button className="dots">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="chart-empty">
                  ستظهر بيانات المبيعات والتحصيلات هنا بعد تسجيل العمليات.
                </div>
                <div className="chart-summary">
                  <div>
                    <span>إجمالي المبيعات</span>
                    <b>
                      <IQD value={0} />
                    </b>
                  </div>
                  <div>
                    <span>إجمالي التحصيلات</span>
                    <b>
                      <IQD value={0} />
                    </b>
                  </div>
                  <button onClick={() => notify("لا توجد بيانات لعرضها")}>
                    عرض التقرير <ChevronLeft size={16} />
                  </button>
                </div>
              </article>
              <article className="card finance-card">
                <div className="card-head">
                  <div>
                    <h2>ملخص التمويل</h2>
                    <p>لا توجد بيانات تمويل بعد</p>
                  </div>
                  <button className="dots">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="donut-row">
                  <div className="donut">
                    <div>
                      <b>0%</b>
                      <small>مستخدم</small>
                    </div>
                  </div>
                  <div className="donut-text">
                    <strong>
                      <IQD value={0} />
                    </strong>
                    <span>رأس مال مستخدم</span>
                    <div>
                      <i />
                      <span>
                        المتاح{" "}
                        <b>
                          <IQD value={0} />
                        </b>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mini-stat">
                  <div>
                    <span>مستحق للممولين</span>
                    <b>
                      <IQD value={0} />
                    </b>
                  </div>
                  <div>
                    <span>عقود ممولة نشطة</span>
                    <b>0 عقد</b>
                  </div>
                </div>
                <button
                  className="full-link"
                  onClick={() => notify("لا توجد بيانات لعرضها")}
                >
                  عرض حسابات الممولين <ChevronLeft size={16} />
                </button>
              </article>
            </section>
            <section className="lower-grid">
              <article className="card payments-card">
                <div className="card-head">
                  <div>
                    <h2>آخر التحصيلات</h2>
                    <p>لا توجد دفعات مسجلة بعد</p>
                  </div>
                  <button
                    className="outline-link"
                    onClick={() => notify("لا توجد بيانات لعرضها")}
                  >
                    عرض الكل <ChevronLeft size={15} />
                  </button>
                </div>
                <div className="payment-list">
                  {payments.length === 0 && (
                    <div className="empty-state">لا توجد تحصيلات بعد.</div>
                  )}
                </div>
              </article>
              <article className="card due-card">
                <div className="card-head">
                  <div>
                    <h2>أقساط قريبة الاستحقاق</h2>
                    <p>لا توجد أقساط مسجلة بعد</p>
                  </div>
                  <span className="count">0 أقساط</span>
                </div>
                <div className="due-list">
                  {dueItems.length === 0 && (
                    <div className="empty-state">لا توجد أقساط مستحقة.</div>
                  )}
                </div>
                <button
                  className="full-link"
                  onClick={() => notify("لا توجد بيانات لعرضها")}
                >
                  متابعة الأقساط المستحقة <ChevronLeft size={16} />
                </button>
              </article>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <HomeApp />
    </AuthGate>
  );
}
