import { useState, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#34d399","#60a5fa","#f472b6","#fb923c","#a78bfa","#facc15","#38bdf8","#f87171","#4ade80","#e879f9"];

const CATEGORY_ICONS = {
  food:"🍔", transport:"🚗", rent:"🏠", shopping:"🛍️",
  entertainment:"🎬", health:"💊", education:"📚",
  utilities:"💡", savings:"💰", other:"📦"
};

const formatINR = (n) => "₹" + Number(n).toLocaleString("en-IN");

const STORAGE_KEY   = "expensebot-data";
const APIKEY_KEY    = "expensebot-apikey";
const MESSAGES_KEY  = "expensebot-messages";

const INITIAL_MSG = {
  role: "assistant",
  text: "👋 Hey! I'm your ExpenseBot.\n\nTell me what you spent:\n• \"Spent ₹500 on food\"\n• \"Paid ₹12,000 rent\"\n• \"Saved ₹5,000 this month\"\n• \"Show chart\" for your breakdown\n\n💾 Everything saves to your phone automatically!"
};

/* ─── Setup Screen ─────────────────────────────────────────── */
function SetupScreen({ onSave }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = () => {
    if (!key.trim().startsWith("sk-ant-")) {
      setErr("Key should start with sk-ant-  — get yours at console.anthropic.com");
      return;
    }
    onSave(key.trim());
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#0f172a", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:24, fontFamily:"'Inter',system-ui,sans-serif", color:"#e2e8f0"
    }}>
      <div style={{fontSize:56, marginBottom:16}}>💸</div>
      <div style={{fontSize:26, fontWeight:800, color:"#34d399", marginBottom:6}}>ExpenseBot</div>
      <div style={{fontSize:14, color:"#64748b", marginBottom:36, textAlign:"center"}}>
        Your personal AI expense tracker
      </div>

      <div style={{
        background:"#1e293b", borderRadius:20, padding:28,
        width:"100%", maxWidth:400, border:"1px solid #334155"
      }}>
        <div style={{fontSize:15, fontWeight:600, marginBottom:6}}>Enter your Claude API Key</div>
        <div style={{fontSize:12, color:"#64748b", marginBottom:16, lineHeight:1.6}}>
          Get a free key at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
            style={{color:"#34d399"}}>console.anthropic.com</a>
          {" "}→ API Keys → Create Key
        </div>

        <div style={{position:"relative"}}>
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={e => { setKey(e.target.value); setErr(""); }}
            placeholder="sk-ant-api03-..."
            style={{
              width:"100%", padding:"12px 44px 12px 14px",
              borderRadius:12, border:"1px solid #334155",
              background:"#0f172a", color:"#e2e8f0",
              fontSize:14, outline:"none"
            }}
          />
          <button onClick={() => setShow(s => !s)} style={{
            position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
            background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18
          }}>{show ? "🙈" : "👁️"}</button>
        </div>

        {err && <div style={{color:"#f87171", fontSize:12, marginTop:8}}>{err}</div>}

        <div style={{
          background:"#0f172a", borderRadius:10, padding:"10px 14px",
          marginTop:16, fontSize:12, color:"#64748b", lineHeight:1.6,
          border:"1px solid #1e293b"
        }}>
          🔒 Your key is stored only on <strong style={{color:"#94a3b8"}}>this device</strong> — never sent anywhere except directly to Anthropic's API.
        </div>

        <button onClick={handleSave} style={{
          width:"100%", marginTop:20, padding:"14px",
          background:"#34d399", border:"none", borderRadius:12,
          color:"#0f172a", fontWeight:700, fontSize:15, cursor:"pointer"
        }}>
          Get Started →
        </button>
      </div>
    </div>
  );
}

/* ─── Main App ─────────────────────────────────────────────── */
export default function App() {
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem(APIKEY_KEY) || "");
  const [expenses, setExpenses] = useState([]);
  const [savings, setSavings]   = useState(0);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [dataLoaded, setDataLoaded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.expenses) setExpenses(saved.expenses);
        if (saved.savings != null) setSavings(saved.savings);
      }
      const savedMsgs = localStorage.getItem(MESSAGES_KEY);
      if (savedMsgs) {
        setMessages(JSON.parse(savedMsgs));
      }
    } catch (e) {}
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses, savings }));
  }, [expenses, savings, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-100)));
  }, [messages, dataLoaded]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
  }, [messages]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const chartData = Object.entries(
    expenses.reduce((acc, e) => {
      if (e.category !== "savings") {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages(m => [...m, { role:"user", text:userText }]);
    setLoading(true);

    try {
      const systemPrompt = `You are a friendly expense tracking assistant for an Indian user.
Current expenses: ${JSON.stringify(expenses)}
Current savings: ₹${savings}
Total spent: ₹${totalExpenses}

When user mentions expense or saving:
1. Extract: amount (number, handle lakh/k shorthands), category (food/transport/rent/shopping/entertainment/health/education/utilities/savings/other), description
2. If savings/invested/saved → action: add_savings
3. Reply briefly and friendly, confirming what was logged
4. For summary/chart/breakdown → action: show_summary, give text summary too

Respond ONLY with raw JSON (no markdown):
{
  "message": "reply here",
  "action": "add_expense" | "add_savings" | "show_summary" | "none",
  "expense": { "amount": number, "category": string, "description": string }
}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": apiKey,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:500,
          system: systemPrompt,
          messages:[{ role:"user", content:userText }]
        })
      });

      const data = await res.json();

      if (data.error) {
        if (data.error.type === "authentication_error") {
          setMessages(m => [...m, { role:"assistant", text:"❌ Invalid API key. Tap Settings to update it." }]);
          setLoading(false);
          return;
        }
        throw new Error(data.error.message);
      }

      const raw = data.content?.[0]?.text || "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      } catch {
        parsed = { message: raw, action:"none" };
      }

      if (parsed.action === "add_expense" && parsed.expense) {
        const newExp = {
          id: Date.now(),
          amount: Number(parsed.expense.amount),
          category: (parsed.expense.category || "other").toLowerCase(),
          description: parsed.expense.description,
          date: new Date().toLocaleDateString("en-IN"),
          month: new Date().toISOString().slice(0,7)
        };
        setExpenses(prev => [...prev, newExp]);
      } else if (parsed.action === "add_savings" && parsed.expense) {
        setSavings(prev => prev + Number(parsed.expense.amount));
      }

      if (parsed.action === "show_summary") setActiveTab("chart");

      setMessages(m => [...m, { role:"assistant", text: parsed.message || "Done!" }]);

    } catch (err) {
      setMessages(m => [...m, { role:"assistant", text:"⚠️ Something went wrong. Check your internet and try again." }]);
    }

    setLoading(false);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearAll = () => {
    if (window.confirm("Clear all data for this month? This cannot be undone.")) {
      setExpenses([]); setSavings(0);
      setMessages([INITIAL_MSG]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MESSAGES_KEY);
    }
  };

  const deleteApiKey = () => {
    if (window.confirm("Remove API key? You'll need to enter it again.")) {
      localStorage.removeItem(APIKEY_KEY);
      setApiKey("");
    }
  };

  const saveApiKey = (key) => {
    localStorage.setItem(APIKEY_KEY, key);
    setApiKey(key);
  };

  if (!apiKey) return <SetupScreen onSave={saveApiKey} />;

  const s = {
    page:{ minHeight:"100vh", background:"#0f172a", color:"#e2e8f0", fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" },
    header:{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    tabs:{ display:"flex", gap:8 },
    tab:(active)=>({ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:active?"#34d399":"#334155", color:active?"#0f172a":"#94a3b8" }),
    summaryBar:{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"10px 18px", display:"flex", gap:20, alignItems:"center" },
    statBlock:{ display:"flex", flexDirection:"column" },
    statLabel:{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:1 },
    msgWrap:{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 },
    bubble:(role)=>({ maxWidth:"82%", padding:"10px 14px", borderRadius: role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", background:role==="user"?"#34d399":"#1e293b", color:role==="user"?"#0f172a":"#e2e8f0", fontSize:14, lineHeight:1.5, whiteSpace:"pre-wrap", border:role==="assistant"?"1px solid #334155":"none" }),
    inputRow:{ padding:"10px 14px", background:"#1e293b", borderTop:"1px solid #334155", display:"flex", gap:8 },
    input:{ flex:1, padding:"10px 14px", borderRadius:12, border:"1px solid #334155", background:"#0f172a", color:"#e2e8f0", fontSize:14, outline:"none" },
    sendBtn:(dis)=>({ padding:"10px 16px", borderRadius:12, border:"none", background:dis?"#334155":"#34d399", color:"#0f172a", fontWeight:700, cursor:dis?"not-allowed":"pointer", fontSize:16 }),
    card:{ background:"#1e293b", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #334155" },
    cardTitle:{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:"#34d399"}}>💸 ExpenseBot</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:1}}>
            {new Date().toLocaleString("en-IN",{month:"long",year:"numeric"})} · 💾 Auto-saved
          </div>
        </div>
        <div style={s.tabs}>
          <button style={s.tab(activeTab==="chat")} onClick={()=>setActiveTab("chat")}>💬 Chat</button>
          <button style={s.tab(activeTab==="chart")} onClick={()=>setActiveTab("chart")}>📊 Charts</button>
        </div>
      </div>

      <div style={s.summaryBar}>
        <div style={s.statBlock}>
          <span style={s.statLabel}>Spent</span>
          <span style={{fontSize:17,fontWeight:700,color:"#f87171"}}>{formatINR(totalExpenses)}</span>
        </div>
        <div style={s.statBlock}>
          <span style={s.statLabel}>Saved</span>
          <span style={{fontSize:17,fontWeight:700,color:"#34d399"}}>{formatINR(savings)}</span>
        </div>
        <div style={s.statBlock}>
          <span style={s.statLabel}>Entries</span>
          <span style={{fontSize:17,fontWeight:700,color:"#60a5fa"}}>{expenses.length}</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {(expenses.length>0||savings>0) && (
            <button onClick={clearAll} style={{padding:"4px 10px",background:"transparent",border:"1px solid #475569",borderRadius:8,color:"#94a3b8",cursor:"pointer",fontSize:11}}>🗑️</button>
          )}
          <button onClick={deleteApiKey} style={{padding:"4px 10px",background:"transparent",border:"1px solid #475569",borderRadius:8,color:"#94a3b8",cursor:"pointer",fontSize:11}}>⚙️</button>
        </div>
      </div>

      {activeTab==="chat" && (
        <>
          <div style={s.msgWrap}>
            {messages.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={s.bubble(m.role)}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{display:"flex"}}>
                <div style={{...s.bubble("assistant"),color:"#475569",fontSize:20,letterSpacing:3}}>•••</div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{padding:"0 14px 8px",display:"flex",gap:8,flexWrap:"wrap"}}>
            {["Show chart","How much spent?","Saved ₹5000","Spent ₹200 auto"].map(chip=>(
              <button key={chip} onClick={()=>setInput(chip)} style={{padding:"5px 12px",borderRadius:16,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",cursor:"pointer",fontSize:12}}>{chip}</button>
            ))}
          </div>

          <div style={s.inputRow}>
            <input
              value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="e.g. Spent ₹800 on groceries..."
              style={s.input}
            />
            <button onClick={sendMessage} disabled={loading||!input.trim()} style={s.sendBtn(loading||!input.trim())}>↑</button>
          </div>
        </>
      )}

      {activeTab==="chart" && (
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {expenses.length===0 ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:60,color:"#475569"}}>
              <div style={{fontSize:48}}>📊</div>
              <div style={{fontSize:16,marginTop:12}}>No expenses yet</div>
              <div style={{fontSize:13,marginTop:4}}>Log expenses in the chat first</div>
              <button onClick={()=>setActiveTab("chat")} style={{marginTop:16,padding:"8px 20px",background:"#34d399",border:"none",borderRadius:20,color:"#0f172a",fontWeight:700,cursor:"pointer"}}>Go to Chat</button>
            </div>
          ) : (
            <>
              <div style={s.card}>
                <div style={s.cardTitle}>Expense Breakdown</div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                      {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>formatINR(v)} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0"}}/>
                    <Legend formatter={v=>`${CATEGORY_ICONS[v]||"📦"} ${v}`} wrapperStyle={{fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {savings > 0 && (
                <div style={s.card}>
                  <div style={s.cardTitle}>Spent vs Saved</div>
                  <div style={{display:"flex",gap:3,borderRadius:8,overflow:"hidden",height:30}}>
                    <div style={{background:"#f87171",width:`${(totalExpenses/(totalExpenses+savings))*100}%`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#0f172a"}}>{formatINR(totalExpenses)}</div>
                    <div style={{background:"#34d399",flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#0f172a"}}>{formatINR(savings)}</div>
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:8}}>
                    <span style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#f87171",display:"inline-block"}}/>Spent</span>
                    <span style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#34d399",display:"inline-block"}}/>Saved</span>
                  </div>
                </div>
              )}

              <div style={s.card}>
                <div style={s.cardTitle}>All Entries ({expenses.length})</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[...expenses].reverse().map(e=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#0f172a",borderRadius:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:22}}>{CATEGORY_ICONS[e.category]||"📦"}</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:500}}>{e.description}</div>
                          <div style={{fontSize:11,color:"#475569"}}>{e.category} · {e.date}</div>
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>{formatINR(e.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
    }
