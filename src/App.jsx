import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Area, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import {
  CreditCard, Wallet, Banknote, PiggyBank, Plus, ArrowLeft, LayoutDashboard,
  Send, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet, Printer, X,
  Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap, ShoppingBag,
  Repeat, MoreHorizontal, MessageCircle, LogOut, Lock, UserRound, Check,
} from "lucide-react";

/* ---------------------------------- dados fixos ---------------------------------- */

const CATEGORIES = [
  { id: "alimentacao", name: "Alimentação", color: "#E5584B", Icon: Utensils },
  { id: "transporte", name: "Transporte", color: "#E0A83E", Icon: Car },
  { id: "moradia", name: "Moradia", color: "#3B9DF0", Icon: Home },
  { id: "lazer", name: "Lazer", color: "#A78BFA", Icon: Gamepad2 },
  { id: "saude", name: "Saúde", color: "#2DD4BF", Icon: HeartPulse },
  { id: "educacao", name: "Educação", color: "#6366F1", Icon: GraduationCap },
  { id: "compras", name: "Compras", color: "#F472B6", Icon: ShoppingBag },
  { id: "assinaturas", name: "Assinaturas", color: "#FB923C", Icon: Repeat },
  { id: "outros", name: "Outros", color: "#A1A1AA", Icon: MoreHorizontal },
];

const GROUP_ICONS = [
  { id: "card", Icon: CreditCard },
  { id: "wallet", Icon: Wallet },
  { id: "cash", Icon: Banknote },
  { id: "piggy", Icon: PiggyBank },
];

const GROUP_COLORS = ["#E5584B", "#3B9DF0", "#E0A83E", "#D946EF", "#8B5CF6", "#F472B6", "#22D3EE", "#FB923C"];

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/* ---------------------------------- helpers ---------------------------------- */

function uid() {
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = m - 1 + n;
  const newY = y + Math.floor(total / 12);
  const newM = ((total % 12) + 12) % 12;
  const lastDay = new Date(newY, newM + 1, 0).getDate();
  const newD = Math.min(d, lastDay);
  return `${newY}-${String(newM + 1).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}
function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}
function shiftMonthKey(mk, delta) {
  const [y, m] = mk.split("-").map(Number);
  const total = m - 1 + delta;
  const newY = y + Math.floor(total / 12);
  const newM = ((total % 12) + 12) % 12;
  return `${newY}-${String(newM + 1).padStart(2, "0")}`;
}
function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDateBR(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function fmtMonthLabel(mk) {
  const [y, m] = mk.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}
function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
/* Hash simples só para não guardar a senha em texto puro no armazenamento.
   Não é criptografia forte — serve para separar contas de pessoas de confiança
   (ex: família) usando o mesmo app, não para dados de alto sigilo. */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

const VARS = {
  "--bg-app": "#121317",
  "--surface": "#1B1D23",
  "--surface-2": "#22252C",
  "--ink": "#F2F1F5",
  "--ink-soft": "#9CA0AA",
  "--primary-dark": "#17181C",
  "--primary-dark-2": "#1F2027",
  "--header-gradient": "linear-gradient(135deg, #17181C 0%, #201A2A 100%)",
  "--expense": "#E5584B",
  "--income": "#A855F7",
  "--income-gradient": "linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)",
  "--amber": "#E0A83E",
  "--border": "#2B2E36",
  "--panel": "#101218",
  "--panel-2": "#181A22",
  "--panel-line": "rgba(255,255,255,0.06)",
};
const GRADIENT_TEXT = {
  backgroundImage: "var(--income-gradient)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

/* ---------------------------------- app ---------------------------------- */

export default function FinanceApp() {
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [users, setUsers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [groups, setGroups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("dashboard"); // groups | chat | dashboard
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(todayStr()));
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [exportPicker, setExportPicker] = useState(null); // { type: 'excel' | 'print' }
  const bottomRef = useRef(null);

  // Carrega a lista de contas (usuários) assim que o app abre
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("finance-users", true);
        if (res && res.value) setUsers(JSON.parse(res.value));
      } catch (e) {
        /* nenhuma conta criada ainda */
      }
      setUsersLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!usersLoaded) return;
    window.storage.set("finance-users", JSON.stringify(users), true).catch(() => {});
  }, [users, usersLoaded]);

  // Carrega os dados financeiros DO USUÁRIO logado
  useEffect(() => {
    if (!currentUser) return;
    setLoaded(false);
    setView("dashboard");
    setActiveGroupId(null);
    (async () => {
      try {
        const res = await window.storage.get(`finance-data:${currentUser}`, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setGroups(parsed.groups || []);
          setEntries(parsed.entries || []);
        } else {
          setGroups([]);
          setEntries([]);
        }
      } catch (e) {
        setGroups([]);
        setEntries([]);
      }
      setLoaded(true);
    })();
  }, [currentUser]);

  useEffect(() => {
    if (!loaded || !currentUser) return;
    const t = setTimeout(() => {
      window.storage.set(`finance-data:${currentUser}`, JSON.stringify({ groups, entries }), true).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [groups, entries, loaded, currentUser]);

  useEffect(() => {
    const onAfterPrint = () => setPrintData(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  const entriesByGroupMonth = useMemo(() => {
    return entries
      .filter((e) => e.groupId === activeGroupId && monthKey(e.date) === selectedMonth)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, activeGroupId, selectedMonth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entriesByGroupMonth.length, view]);

  function groupTotal(groupId, mk) {
    return entries
      .filter((e) => e.groupId === groupId && monthKey(e.date) === mk)
      .reduce((sum, e) => sum + (e.type === "receita" ? e.amount : -e.amount), 0);
  }

  const monthEntriesAll = useMemo(() => entries.filter((e) => monthKey(e.date) === selectedMonth), [entries, selectedMonth]);

  const dashboardTotals = useMemo(() => {
    const gasto = monthEntriesAll.filter((e) => e.type === "gasto").reduce((s, e) => s + e.amount, 0);
    const receita = monthEntriesAll.filter((e) => e.type === "receita").reduce((s, e) => s + e.amount, 0);
    return { gasto, receita, saldo: receita - gasto };
  }, [monthEntriesAll]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    monthEntriesAll.filter((e) => e.type === "gasto").forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return CATEGORIES.map((c) => ({ name: c.name, value: map[c.id] || 0, color: c.color })).filter((c) => c.value > 0);
  }, [monthEntriesAll]);

  const groupBreakdown = useMemo(
    () => groups.map((g) => ({ name: g.name, total: Math.round(Math.abs(groupTotal(g.id, selectedMonth)) * 100) / 100, color: g.color })),
    [groups, entries, selectedMonth]
  );

  const monthlyEvolution = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const mk = shiftMonthKey(selectedMonth, -i);
      const mEntries = entries.filter((e) => monthKey(e.date) === mk);
      const gasto = mEntries.filter((e) => e.type === "gasto").reduce((s, e) => s + e.amount, 0);
      const receita = mEntries.filter((e) => e.type === "receita").reduce((s, e) => s + e.amount, 0);
      arr.push({ mes: fmtMonthLabel(mk).slice(0, 3), Gastos: gasto, Receitas: receita });
    }
    return arr;
  }, [entries, selectedMonth]);

  function addGroup(name, color, icon) {
    const g = { id: uid(), name, color, icon };
    setGroups((prev) => [...prev, g]);
    setActiveGroupId(g.id);
    setView("chat");
    setShowNewGroup(false);
  }
  function deleteGroup(id) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setEntries((prev) => prev.filter((e) => e.groupId !== id));
    if (activeGroupId === id) {
      setActiveGroupId(null);
      setView("groups");
    }
  }
  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }
  function deleteSeries(seriesId) {
    setEntries((prev) => prev.filter((e) => e.seriesId !== seriesId));
  }
  function toggleEntryPaid(id) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)));
  }

  function submitEntry(form) {
    const amountNum = parseFloat(String(form.amount).replace(",", "."));
    if (!form.description.trim() || isNaN(amountNum) || amountNum <= 0 || !activeGroupId) return false;
    const seriesId = uid();
    const base = { groupId: activeGroupId, description: form.description.trim(), category: form.category, type: form.type, paid: false };
    let newEntries = [];
    if (form.mode === "parcelado") {
      const n = Math.max(2, parseInt(form.installments) || 2);
      for (let i = 0; i < n; i++) {
        newEntries.push({ ...base, id: uid(), amount: amountNum, date: addMonths(form.date, i), seriesId, installment: { current: i + 1, total: n }, recurring: false });
      }
    } else if (form.mode === "recorrente") {
      for (let i = 0; i < 24; i++) {
        newEntries.push({ ...base, id: uid(), amount: amountNum, date: addMonths(form.date, i), seriesId, installment: null, recurring: true });
      }
    } else {
      newEntries.push({ ...base, id: uid(), amount: amountNum, date: form.date, seriesId: null, installment: null, recurring: false });
    }
    setEntries((prev) => [...prev, ...newEntries]);
    return true;
  }

  function exportExcel(list, filename) {
    const rows = list.map((e) => {
      const cat = CATEGORIES.find((c) => c.id === e.category);
      const grp = groups.find((g) => g.id === e.groupId);
      return {
        Data: fmtDateBR(e.date),
        Descrição: e.description,
        Categoria: cat ? cat.name : "",
        Grupo: grp ? grp.name : "",
        Tipo: e.type === "gasto" ? "Gasto" : "Receita",
        Parcela: e.installment ? `${e.installment.current}/${e.installment.total}` : e.recurring ? "Recorrente" : "",
        Valor: e.type === "gasto" ? -e.amount : e.amount,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    try {
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      console.error("Falha ao exportar planilha", e);
    }
  }

  function handlePrint(list, title) {
    setPrintData({ title, list });
    setTimeout(() => window.print(), 150);
  }

  function openExportPicker(type) {
    setExportPicker({ type });
  }

  function confirmExport(type, selectedGroupIds) {
    const list = entries.filter((e) => monthKey(e.date) === selectedMonth && selectedGroupIds.has(e.groupId));
    const selectedGroups = groups.filter((g) => selectedGroupIds.has(g.id));
    const allSelected = selectedGroups.length === groups.length;
    const label = allSelected
      ? "Extrato geral"
      : selectedGroups.length === 1
      ? selectedGroups[0].name
      : selectedGroups.map((g) => g.name).join(", ");
    if (type === "excel") {
      const filename = allSelected ? `extrato-geral-${selectedMonth}` : `${selectedGroups.map((g) => g.name).join("-")}-${selectedMonth}`;
      exportExcel(list, filename);
    } else {
      handlePrint(list, `${label} — ${fmtMonthLabel(selectedMonth)}`);
    }
    setExportPicker(null);
  }

  function handleSignup(username, password, confirm) {
    const key = username.trim().toLowerCase().replace(/\s+/g, "");
    if (!key || !password) {
      setAuthError("Preencha usuário e senha.");
      return;
    }
    if (password !== confirm) {
      setAuthError("As senhas não coincidem.");
      return;
    }
    if (users[key]) {
      setAuthError("Esse usuário já existe. Tente entrar.");
      return;
    }
    setUsers((prev) => ({ ...prev, [key]: { hash: simpleHash(password), displayName: username.trim(), createdAt: todayStr() } }));
    setAuthError("");
    setCurrentUser(key);
  }
  function handleLogin(username, password) {
    const key = username.trim().toLowerCase().replace(/\s+/g, "");
    const u = users[key];
    if (!u || u.hash !== simpleHash(password)) {
      setAuthError("Usuário ou senha incorretos.");
      return;
    }
    setAuthError("");
    setCurrentUser(key);
  }
  function handleLogout() {
    setCurrentUser(null);
    setGroups([]);
    setEntries([]);
    setLoaded(false);
    setAuthError("");
  }

  if (!usersLoaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ ...VARS, background: "var(--bg-app)" }}>
        <div style={{ color: "var(--ink-soft)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>Carregando…</div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen users={users} onLogin={handleLogin} onSignup={handleSignup} error={authError} clearError={() => setAuthError("")} />;
  }

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ ...VARS, background: "var(--bg-app)" }}>
        <div style={{ color: "var(--ink-soft)", fontFamily: "Inter, sans-serif", fontSize: 14 }}>Carregando seus dados…</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ ...VARS, background: "var(--bg-app)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .num { font-family: 'Space Grotesk', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #383B44; border-radius: 8px; }
        input, select { color-scheme: dark; }
        input::placeholder { color: #6B6F79; }
        .print-area { display: none; }
        @media print {
          .app-shell { display: none !important; }
          .print-area { display: block !important; }
        }
      `}</style>

      <div className="app-shell flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ backgroundImage: "var(--header-gradient)", color: "#fff", borderBottom: "1px solid var(--border)" }}
        >
          {view !== "groups" && (
            <button onClick={() => setView("groups")} title="Voltar" style={{ color: "#fff" }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {view === "groups" && (
              <>
                <MessageCircle size={20} style={{ color: "var(--amber)" }} />
                <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>Meu Dinheiro</span>
              </>
            )}
            {view === "chat" && activeGroup && (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 30, height: 30, borderRadius: 8, background: activeGroup.color }}
                >
                  {(() => {
                    const Icon = (GROUP_ICONS.find((i) => i.id === activeGroup.icon) || GROUP_ICONS[0]).Icon;
                    return <Icon size={16} color="#fff" />;
                  })()}
                </span>
                <span className="num truncate" style={{ fontSize: 16, fontWeight: 600 }}>{activeGroup.name}</span>
              </div>
            )}
            {view === "dashboard" && (
              <div className="flex items-center gap-2">
                <LayoutDashboard size={18} style={{ color: "var(--amber)" }} />
                <span className="num hidden sm:inline" style={{ fontSize: 16, fontWeight: 600 }}>Dashboard</span>
              </div>
            )}
          </div>

          {/* Month switcher */}
          <div className="flex items-center gap-1 shrink-0" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "2px 4px" }}>
            <button onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))} style={{ color: "#fff", padding: 4 }}>
              <ChevronLeft size={16} />
            </button>
            <span className="mono" style={{ fontSize: 12, minWidth: 92, textAlign: "center" }}>{fmtMonthLabel(selectedMonth)}</span>
            <button onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))} style={{ color: "#fff", padding: 4 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            title={`Sair (${users[currentUser]?.displayName || currentUser})`}
            onClick={handleLogout}
            className="flex items-center justify-center shrink-0"
            style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <LogOut size={16} />
          </button>

          {view === "groups" && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                title="Dashboard"
                onClick={() => setView("dashboard")}
                className="flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff" }}
              >
                <LayoutDashboard size={16} />
              </button>
              <button
                title="Novo grupo"
                onClick={() => setShowNewGroup(true)}
                className="flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: 8, background: "var(--amber)", color: "#fff" }}
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          {(view === "chat" || view === "dashboard") && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                title="Exportar planilha"
                onClick={() => openExportPicker("excel")}
                className="flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff" }}
              >
                <FileSpreadsheet size={16} />
              </button>
              <button
                title="Imprimir / gerar PDF"
                onClick={() => openExportPicker("print")}
                className="flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#fff" }}
              >
                <Printer size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: lista de grupos */}
          <div
            className={`${view === "groups" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[320px] shrink-0 overflow-y-auto p-3 gap-2.5`}
            style={{
              background:
                "radial-gradient(circle at 15% 5%, rgba(139,92,246,0.07), transparent 45%), var(--bg-app)",
              borderRight: "1px solid var(--border)",
            }}
          >
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-16">
                <Wallet size={32} style={{ color: "var(--ink-soft)" }} />
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                  Crie seu primeiro grupo, como "Cartão Nubank" ou "Dinheiro", para começar a lançar seus gastos.
                </p>
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="num"
                  style={{ backgroundImage: "var(--income-gradient)", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
                >
                  + Criar grupo
                </button>
              </div>
            )}
            {groups.map((g) => {
              const total = groupTotal(g.id, selectedMonth);
              const Icon = (GROUP_ICONS.find((i) => i.id === g.icon) || GROUP_ICONS[0]).Icon;
              const isActive = view === "chat" && activeGroupId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroupId(g.id);
                    setView("chat");
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-left shrink-0"
                  style={{
                    borderRadius: 16,
                    background: "linear-gradient(180deg, var(--panel-2), var(--panel))",
                    border: isActive ? `1px solid ${hexToRgba(g.color, 0.5)}` : "1px solid var(--panel-line)",
                    boxShadow: isActive
                      ? `0 0 0 1px rgba(255,255,255,0.02), 0 0 22px ${hexToRgba(g.color, 0.25)}`
                      : "0 0 0 1px rgba(255,255,255,0.02), 0 14px 28px -22px rgba(0,0,0,0.7)",
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 40, height: 40, borderRadius: 10, background: g.color, boxShadow: `0 0 16px ${hexToRgba(g.color, 0.45)}` }}
                  >
                    <Icon size={18} color="#fff" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{g.name}</span>
                    <span className="block" style={{ fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{fmtMonthLabel(selectedMonth)}</span>
                  </span>
                  <span
                    className="num shrink-0"
                    style={
                      total > 0
                        ? { fontSize: 14, fontWeight: 700, ...GRADIENT_TEXT, filter: "drop-shadow(0 0 10px rgba(139,92,246,0.3))" }
                        : { fontSize: 14, fontWeight: 700, color: total < 0 ? "var(--expense)" : "var(--ink-soft)", textShadow: total < 0 ? `0 0 12px ${hexToRgba("#E5584B", 0.3)}` : "none" }
                    }
                  >
                    {fmtBRL(total)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main pane */}
          <div className={`${view === "groups" ? "hidden" : "flex"} md:flex flex-col flex-1 overflow-hidden`}>
            {view === "chat" && activeGroup && (
              <ChatPane
                group={activeGroup}
                entries={entriesByGroupMonth}
                onDelete={deleteEntry}
                onDeleteSeries={deleteSeries}
                onTogglePaid={toggleEntryPaid}
                onSubmit={submitEntry}
                selectedMonth={selectedMonth}
                bottomRef={bottomRef}
                onDeleteGroup={() => deleteGroup(activeGroup.id)}
              />
            )}
            {view === "dashboard" && (
              <DashboardPane
                totals={dashboardTotals}
                categoryBreakdown={categoryBreakdown}
                groupBreakdown={groupBreakdown}
                monthlyEvolution={monthlyEvolution}
                selectedMonth={selectedMonth}
                groupsCount={groups.length}
                onGoToGroups={() => setView("groups")}
              />
            )}
            {view !== "chat" && view !== "dashboard" && (
              <div className="hidden md:flex flex-1 items-center justify-center" style={{ color: "var(--ink-soft)", fontSize: 14 }}>
                Selecione um grupo à esquerda para ver os lançamentos.
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreate={addGroup} />}

      {exportPicker && (
        <ExportGroupModal
          groups={groups}
          defaultSelectedId={view === "chat" ? activeGroupId : null}
          onCancel={() => setExportPicker(null)}
          onConfirm={(selectedIds) => confirmExport(exportPicker.type, selectedIds)}
        />
      )}

      {/* Área de impressão (oculta na tela, visível ao imprimir) */}
      <div className="print-area">
        {printData && (
          <div style={{ padding: 24, fontFamily: "Inter, sans-serif", color: "#1C2624" }}>
            <h1 className="num" style={{ fontSize: 20, marginBottom: 4 }}>{printData.title}</h1>
            <p style={{ fontSize: 11, color: "#5C6B66", marginBottom: 16 }}>Gerado em {fmtDateBR(todayStr())}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Data", "Descrição", "Categoria", "Grupo", "Tipo", "Valor"].map((h) => (
                    <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "6px 8px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printData.list.map((e) => {
                  const cat = CATEGORIES.find((c) => c.id === e.category);
                  const grp = groups.find((g) => g.id === e.groupId);
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{fmtDateBR(e.date)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>
                        {e.description}{e.installment ? ` (${e.installment.current}/${e.installment.total})` : ""}
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{cat ? cat.name : ""}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{grp ? grp.name : ""}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{e.type === "gasto" ? "Gasto" : "Receita"}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                        {fmtBRL(e.type === "gasto" ? -e.amount : e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: 16, fontWeight: 700, fontSize: 14 }}>
              Total: {fmtBRL(printData.list.reduce((s, e) => s + (e.type === "gasto" ? -e.amount : e.amount), 0))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Chat Pane ---------------------------------- */

function ChatPane({ group, entries, onDelete, onTogglePaid, onSubmit, selectedMonth, bottomRef, onDeleteGroup }) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "alimentacao",
    type: "gasto",
    date: todayStr(),
    mode: "unico",
    installments: 2,
  });
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  const byDate = groupBy(entries, (e) => e.date);

  function handleSubmit(ev) {
    ev.preventDefault();
    const ok = onSubmit(form);
    if (ok) setForm((f) => ({ ...f, description: "", amount: "", mode: "unico", installments: 2 }));
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ background: "var(--bg-app)" }}>
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-6">
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              Nenhum lançamento em {fmtMonthLabel(selectedMonth)} para <strong>{group.name}</strong>.
            </p>
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Comece digitando abaixo. 👇</p>
          </div>
        )}
        {Object.entries(byDate).map(([date, list]) => (
          <div key={date}>
            <div className="flex justify-center my-3">
              <span
                className="mono"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 12px", fontSize: 11, color: "var(--ink-soft)" }}
              >
                {fmtDateBR(date)}
              </span>
            </div>
            {list.map((entry) => (
              <ChatBubble key={entry.id} entry={entry} onDelete={onDelete} onTogglePaid={onTogglePaid} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="shrink-0 px-3 py-3" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex" style={{ background: "var(--bg-app)", borderRadius: 8, padding: 2 }}>
            {["gasto", "receita"].map((id) => {
              const label = id === "gasto" ? "Gasto" : "Receita";
              const active = form.type === id;
              const activeStyle = id === "gasto" ? { background: "var(--expense)" } : { backgroundImage: "var(--income-gradient)" };
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setForm((f) => ({ ...f, type: id }))}
                  className="num"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? "#fff" : "var(--ink-soft)",
                    ...(active ? activeStyle : {}),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--ink)", background: "var(--surface)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--ink)", background: "var(--surface)" }}
          />

          <select
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
            style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--ink)", background: "var(--surface)" }}
          >
            <option value="unico">Único</option>
            <option value="parcelado">Parcelado</option>
            <option value="recorrente">Recorrente</option>
          </select>

          {form.mode === "parcelado" && (
            <input
              type="number"
              min={2}
              value={form.installments}
              onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
              placeholder="Nº parcelas"
              style={{ width: 90, fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--ink)", background: "var(--surface)" }}
            />
          )}

          <button
            type="button"
            onClick={() => setConfirmDeleteGroup(true)}
            title="Excluir este grupo"
            style={{ marginLeft: "auto", color: "var(--ink-soft)" }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrição do lançamento…"
            className="flex-1 min-w-0"
            style={{ fontSize: 14, border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", color: "var(--ink)", background: "var(--bg-app)" }}
          />
          <div className="flex items-center shrink-0" style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0 10px", background: "var(--bg-app)" }}>
            <span className="mono" style={{ fontSize: 13, color: "var(--ink-soft)" }}>R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0,00"
              className="mono"
              style={{ width: 70, fontSize: 14, border: "none", background: "transparent", padding: "10px 4px", color: "var(--ink)", outline: "none" }}
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center shrink-0"
            style={{ width: 42, height: 42, borderRadius: 999, backgroundImage: "var(--income-gradient)", color: "#fff", border: "none" }}
          >
            <Send size={17} />
          </button>
        </div>
      </form>

      {confirmDeleteGroup && (
        <ConfirmModal
          title="Excluir grupo?"
          message={`Isso vai apagar "${group.name}" e todos os seus lançamentos, permanentemente.`}
          onCancel={() => setConfirmDeleteGroup(false)}
          onConfirm={() => {
            setConfirmDeleteGroup(false);
            onDeleteGroup();
          }}
        />
      )}
    </div>
  );
}

function ChatBubble({ entry, onDelete, onTogglePaid }) {
  const cat = CATEGORIES.find((c) => c.id === entry.category);
  const isGasto = entry.type === "gasto";
  const isPaid = !!entry.paid;
  return (
    <div className={`flex ${isGasto ? "justify-end" : "justify-start"} px-1`}>
      <div className="group relative max-w-[85%] md:max-w-[55%]" style={{ marginBottom: 10 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--surface)",
            borderRadius: isGasto ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            padding: "10px 14px 10px 18px",
            opacity: isPaid ? 0.6 : 1,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: isGasto ? "var(--expense)" : "var(--income-gradient)" }} />
          <div className="flex items-center justify-between gap-2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            <div className="flex items-center gap-1.5">
              {cat && <cat.Icon size={12} style={{ color: cat.color }} />}
              <span>{cat?.name}</span>
            </div>
            {isPaid && (
              <span className="flex items-center gap-1" style={{ color: "var(--income)", fontWeight: 600 }}>
                <Check size={11} /> Pago
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink)", margin: "3px 0 8px", wordBreak: "break-word", textDecoration: isPaid ? "line-through" : "none" }}>
            {entry.description}
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTogglePaid(entry.id)}
                title={isPaid ? "Marcar como não pago" : "Marcar como pago"}
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: isPaid ? "none" : "1px solid var(--border)",
                  background: isPaid ? "var(--income-gradient)" : "transparent",
                }}
              >
                {isPaid && <Check size={11} color="#fff" />}
              </button>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                {entry.installment && `${entry.installment.current}/${entry.installment.total} parcelas`}
                {entry.recurring && "recorrente ↻"}
              </span>
            </div>
            <span
              className="num"
              style={isGasto ? { fontWeight: 600, fontSize: 16, color: "var(--expense)", whiteSpace: "nowrap" } : { fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", ...GRADIENT_TEXT }}
            >
              {isGasto ? "-" : "+"}{fmtBRL(entry.amount)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100"
          title="Excluir lançamento"
          style={{
            position: "absolute",
            top: -6,
            [isGasto ? "left" : "right"]: -6,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: 3,
            color: "var(--ink-soft)",
          }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Dashboard ---------------------------------- */

function DashboardPane({ totals, categoryBreakdown, groupBreakdown, monthlyEvolution, selectedMonth, groupsCount, onGoToGroups }) {
  return (
    <div
      className="flex-1 overflow-y-auto p-5"
      style={{
        background:
          "radial-gradient(circle at 12% 8%, rgba(139,92,246,0.08), transparent 42%), radial-gradient(circle at 88% 92%, rgba(217,70,239,0.06), transparent 42%), var(--bg-app)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Gastos no mês" value={totals.gasto} gradient={false} />
        <StatCard label="Receitas no mês" value={totals.receita} gradient={true} />
        <StatCard label="Saldo" value={totals.saldo} gradient={totals.saldo >= 0} />
      </div>

      {groupsCount === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>
            Crie um grupo e lance seus primeiros gastos para ver o dashboard.
          </span>
          <button
            onClick={onGoToGroups}
            className="num"
            style={{ backgroundImage: "var(--income-gradient)", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
          >
            + Criar grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Gastos por categoria">
            {categoryBreakdown.length === 0 ? (
              <EmptyChart text="Sem gastos registrados neste mês." />
            ) : (
              <div style={{ filter: "drop-shadow(0 0 14px rgba(139,92,246,0.22))" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {categoryBreakdown.map((c, i) => (
                        <Cell key={i} fill={c.color} stroke="var(--panel)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--panel-line)", borderRadius: 8, color: "var(--ink)" }} itemStyle={{ color: "var(--ink)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Total por grupo">
            {groupBreakdown.every((g) => g.total === 0) ? (
              <EmptyChart text="Sem lançamentos neste mês." />
            ) : (
              <div style={{ filter: "drop-shadow(0 0 14px rgba(139,92,246,0.18))" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={groupBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-line)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                    <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--panel-line)", borderRadius: 8, color: "var(--ink)" }} itemStyle={{ color: "var(--ink)" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {groupBreakdown.map((g, i) => (
                        <Cell key={i} fill={g.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Evolução mensal (últimos 6 meses)" full>
            <div style={{ filter: "drop-shadow(0 0 16px rgba(139,92,246,0.2))" }}>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="receitaLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#D946EF" />
                    </linearGradient>
                    <linearGradient id="receitaArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-line)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                  <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--panel-line)", borderRadius: 8, color: "var(--ink)" }} itemStyle={{ color: "var(--ink)" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }} />
                  <Area type="monotone" dataKey="Receitas" stroke="none" fill="url(#receitaArea)" legendType="none" />
                  <Line type="monotone" dataKey="Gastos" stroke="var(--expense)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Receitas" stroke="url(#receitaLine)" strokeWidth={3} dot={{ r: 3, fill: "#D946EF" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, gradient }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, var(--panel-2), var(--panel))",
        border: "1px solid var(--panel-line)",
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 20px 40px -24px rgba(0,0,0,0.7)",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 10 }}>{label}</div>
      <div
        className="num"
        style={
          gradient
            ? { fontSize: 26, fontWeight: 700, ...GRADIENT_TEXT, filter: "drop-shadow(0 0 14px rgba(139,92,246,0.35))" }
            : { fontSize: 26, fontWeight: 700, color: "var(--expense)", textShadow: `0 0 18px ${hexToRgba("#E5584B", 0.35)}` }
        }
      >
        {fmtBRL(value)}
      </div>
    </div>
  );
}

function ChartCard({ title, children, full }) {
  return (
    <div
      className={full ? "lg:col-span-2" : ""}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, var(--panel-2), var(--panel))",
        border: "1px solid var(--panel-line)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 20px 40px -24px rgba(0,0,0,0.7)",
      }}
    >
      <div className="num" style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-soft)", marginBottom: 12 }}>
        {title}
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)",
        }}
      />
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 260, color: "var(--ink-soft)", fontSize: 13 }}>
      {text}
    </div>
  );
}

/* ---------------------------------- Autenticação ---------------------------------- */

function AuthScreen({ onLogin, onSignup, error, clearError }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "login") onLogin(username, password);
    else onSignup(username, password, confirm);
  }

  function switchMode(m) {
    setMode(m);
    setPassword("");
    setConfirm("");
    clearError();
  }

  return (
    <div className="h-screen flex items-center justify-center px-4" style={{ ...VARS, background: "var(--bg-app)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .num { font-family: 'Space Grotesk', sans-serif; }
        input::placeholder { color: #6B6F79; }
        input { color-scheme: dark; }
      `}</style>

      <div style={{ width: 380, maxWidth: "100%" }}>
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex items-center justify-center mb-3"
            style={{ width: 52, height: 52, borderRadius: 14, backgroundImage: "var(--income-gradient)" }}
          >
            <MessageCircleIcon />
          </div>
          <span className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>Meu Dinheiro</span>
          <span style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>Controle financeiro pessoal</span>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}
        >
          <div className="flex mb-5" style={{ background: "var(--bg-app)", borderRadius: 8, padding: 2 }}>
            {[{ id: "login", label: "Entrar" }, { id: "signup", label: "Criar conta" }].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => switchMode(t.id)}
                className="num flex-1"
                style={{
                  padding: "8px 0",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: mode === t.id ? "#fff" : "var(--ink-soft)",
                  ...(mode === t.id ? { backgroundImage: "var(--income-gradient)" } : {}),
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Usuário</label>
          <div className="flex items-center gap-2 mt-1 mb-4" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", background: "var(--bg-app)" }}>
            <UserRound size={15} style={{ color: "var(--ink-soft)" }} />
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: victor"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
              style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0", color: "var(--ink)", fontSize: 14, outline: "none" }}
            />
          </div>

          <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Senha</label>
          <div className="flex items-center gap-2 mt-1 mb-4" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", background: "var(--bg-app)" }}>
            <Lock size={15} style={{ color: "var(--ink-soft)" }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              spellCheck={false}
              style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0", color: "var(--ink)", fontSize: 14, outline: "none" }}
            />
          </div>

          {mode === "signup" && (
            <>
              <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Confirmar senha</label>
              <div className="flex items-center gap-2 mt-1 mb-4" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", background: "var(--bg-app)" }}>
                <Lock size={15} style={{ color: "var(--ink-soft)" }} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="new-password"
                  spellCheck={false}
                  style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0", color: "var(--ink)", fontSize: 14, outline: "none" }}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--expense)", marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            className="num"
            style={{ width: "100%", backgroundImage: "var(--income-gradient)", color: "#fff", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
          >
            {mode === "login" ? "Entrar" : "Criar conta e entrar"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          Cada usuário vê apenas os próprios grupos e lançamentos. Esse login organiza o acesso entre
          pessoas de confiança (ex: família) — não é uma camada de segurança criptográfica.
        </p>
      </div>
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/* ---------------------------------- Modais ---------------------------------- */

function ExportGroupModal({ groups, defaultSelectedId, onCancel, onConfirm }) {
  const [selected, setSelected] = useState(() => new Set(defaultSelectedId ? [defaultSelectedId] : groups.map((g) => g.id)));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, width: 360, maxWidth: "100%" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Quais grupos exportar?</span>
          <button onClick={onCancel}><X size={18} color="var(--ink-soft)" /></button>
        </div>

        <div className="flex gap-3 mb-3">
          <button type="button" onClick={() => setSelected(new Set(groups.map((g) => g.id)))} style={{ fontSize: 12, color: "var(--income)" }}>
            Selecionar todos
          </button>
          <button type="button" onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Limpar seleção
          </button>
        </div>

        <div className="flex flex-col gap-1.5" style={{ maxHeight: 260, overflowY: "auto" }}>
          {groups.map((g) => {
            const Icon = (GROUP_ICONS.find((i) => i.id === g.icon) || GROUP_ICONS[0]).Icon;
            const checked = selected.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                className="flex items-center gap-3 text-left"
                style={{ padding: "9px 10px", borderRadius: 10, background: checked ? "var(--surface-2)" : "transparent" }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 20, height: 20, borderRadius: 6, border: checked ? "none" : "1px solid var(--border)", background: checked ? "var(--income-gradient)" : "transparent" }}
                >
                  {checked && <Check size={13} color="#fff" />}
                </span>
                <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: 7, background: g.color }}>
                  <Icon size={13} color="#fff" />
                </span>
                <span style={{ fontSize: 14, color: "var(--ink)" }}>{g.name}</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={selected.size === 0}
          onClick={() => onConfirm(selected)}
          className="num"
          style={
            selected.size > 0
              ? { width: "100%", marginTop: 18, backgroundImage: "var(--income-gradient)", color: "#fff", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }
              : { width: "100%", marginTop: 18, background: "var(--surface-2)", color: "var(--ink-soft)", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }
          }
        >
          Exportar {selected.size > 0 ? `(${selected.size} grupo${selected.size > 1 ? "s" : ""})` : ""}
        </button>
      </div>
    </div>
  );
}

function NewGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [icon, setIcon] = useState(GROUP_ICONS[0].id);

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, width: 360, maxWidth: "100%" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Novo grupo</span>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>

        <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Nome</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Cartão Nubank"
          style={{ width: "100%", fontSize: 14, border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", margin: "6px 0 16px", color: "var(--ink)", background: "var(--bg-app)" }}
        />

        <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ícone</label>
        <div className="flex gap-2 my-2">
          {GROUP_ICONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setIcon(opt.id)}
              className="flex items-center justify-center"
              style={{ width: 38, height: 38, borderRadius: 8, background: icon === opt.id ? color : "var(--bg-app)", border: icon === opt.id ? `2px solid ${color}` : "1px solid var(--border)" }}
            >
              <opt.Icon size={17} color={icon === opt.id ? "#fff" : "var(--ink-soft)"} />
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Cor</label>
        <div className="flex gap-2 my-2 flex-wrap">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 26, height: 26, borderRadius: 999, background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent" }}
            />
          ))}
        </div>

        <button
          disabled={!name.trim()}
          onClick={() => onCreate(name.trim(), color, icon)}
          className="num"
          style={name.trim() ? { width: "100%", marginTop: 18, backgroundImage: "var(--income-gradient)", color: "#fff", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" } : { width: "100%", marginTop: 18, background: "var(--surface-2)", color: "var(--ink-soft)", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
        >
          Criar grupo
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 60 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, width: 340, maxWidth: "100%" }}>
        <div className="num" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 18 }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 8, color: "var(--ink-soft)" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 8, background: "var(--expense)", color: "#fff", fontWeight: 600, border: "none" }}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
