import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ListingStatus } from "./api";

function useLoad<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    loader().then(setData).catch((e) => setError(String(e))).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading, setData };
}

function Badge({ v }: { v: string }) { return <span className={`badge ${v}`}>{v}</span>; }
function Card({ children }: any) { return <div className="card">{children}</div>; }

function AppShell({ children }: any) {
  const nav = [
    ["/app", "ภาพรวม"], ["/app/assets", "ทรัพย์สิน"], ["/app/listings", "ประกาศ"], ["/app/crm", "ผู้เช่า CRM"], ["/app/billing", "การเงิน"]
  ];
  return <div className="layout"><aside className="sidebar"><div className="brand">Tarent RentalOps</div><nav className="nav">{nav.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}</nav><hr /><div className="nav"><NavLink to="/marketplace">ดู Marketplace</NavLink></div></aside><main className="main">{children}</main></div>;
}

function Topbar({ title }: { title: string }) { return <div className="topbar"><h2 style={{ margin: 0 }}>{title}</h2><small>Demo Workspace</small></div>; }

function Dashboard() {
  const x = useLoad(api.dashboard, []);
  if (x.loading) return <Card>Loading...</Card>;
  if (x.error || !x.data) return <Card className="empty">โหลดข้อมูลไม่สำเร็จ</Card>;
  return <div className="stack"><Topbar title="ภาพรวม" /><div className="grid">{Object.entries(x.data as any).map(([k, v]) => <Card key={k}><div className="kpi"><div className="label">{k}</div><div className="value">{String(v)}</div></div></Card>)}</div></div>;
}

function Assets() {
  const props = useLoad(api.listProperties, []);
  const units = useLoad(api.listUnits, []);
  const [form, setForm] = useState<any>({ name: "", district: "", province: "", address: "" });
  const [unit, setUnit] = useState<any>({ propertyId: "", roomCode: "", roomType: "studio", floor: 1, monthlyRentTHB: 10000, facilities: "wifi" });
  async function addProperty() { await api.createProperty(form); props.setData(await api.listProperties()); }
  async function addUnit() { await api.createUnit({ ...unit, floor: Number(unit.floor), monthlyRentTHB: Number(unit.monthlyRentTHB), facilities: String(unit.facilities).split(",").map((x:string)=>x.trim()) }); units.setData(await api.listUnits()); }
  return <div className="stack"><Topbar title="ทรัพย์สิน" /><div className="grid"><Card><b>เพิ่มโครงการ</b><div className="stack"><input placeholder="ชื่อ" onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="เขต" onChange={e=>setForm({...form,district:e.target.value})}/><input placeholder="จังหวัด" onChange={e=>setForm({...form,province:e.target.value})}/><input placeholder="ที่อยู่" onChange={e=>setForm({...form,address:e.target.value})}/><button className="primary" onClick={addProperty}>บันทึก</button></div></Card><Card><b>เพิ่มห้อง</b><div className="stack"><select onChange={e=>setUnit({...unit,propertyId:e.target.value})}><option value="">เลือกโครงการ</option>{(props.data||[] as any[]).map((p:any)=><option value={p.id} key={p.id}>{p.name}</option>)}</select><input placeholder="Room code" onChange={e=>setUnit({...unit,roomCode:e.target.value})}/><input placeholder="ประเภท" onChange={e=>setUnit({...unit,roomType:e.target.value})}/><input placeholder="ชั้น" type="number" onChange={e=>setUnit({...unit,floor:e.target.value})}/><input placeholder="ค่าเช่า" type="number" onChange={e=>setUnit({...unit,monthlyRentTHB:e.target.value})}/><input placeholder="สิ่งอำนวยความสะดวก" onChange={e=>setUnit({...unit,facilities:e.target.value})}/><button className="primary" onClick={addUnit}>เพิ่มห้อง</button></div></Card></div><Card><b>โครงการ</b><div className="tableWrap"><table><thead><tr><th>ชื่อ</th><th>เขต</th><th>จังหวัด</th></tr></thead><tbody>{(props.data||[] as any[]).map((p:any)=><tr key={p.id}><td>{p.name}</td><td>{p.district}</td><td>{p.province}</td></tr>)}</tbody></table></div></Card><Card><b>ห้อง</b><div className="tableWrap"><table><thead><tr><th>Code</th><th>Type</th><th>Rent</th><th>Status</th></tr></thead><tbody>{(units.data||[] as any[]).map((u:any)=><tr key={u.id}><td>{u.roomCode}</td><td>{u.roomType}</td><td>{u.monthlyRentTHB}</td><td><Badge v={u.occupancyStatus} /></td></tr>)}</tbody></table></div></Card></div>;
}

function Listings() {
  const listings = useLoad(api.listListings, []); const units = useLoad(api.listUnits, []);
  const [f, setF] = useState<any>({ unitId: "", titleTH: "", descriptionTH: "" });
  async function add() { await api.createListing(f); listings.setData(await api.listListings()); }
  async function change(id:string, searchStatus:ListingStatus){ await api.setListingStatus(id,searchStatus); listings.setData(await api.listListings()); }
  return <div className="stack"><Topbar title="ประกาศ" /><Card><b>สร้างประกาศ</b><div className="row"><select onChange={e=>setF({...f,unitId:e.target.value})}><option value="">เลือกห้อง</option>{(units.data||[] as any[]).map((u:any)=><option value={u.id} key={u.id}>{u.roomCode}</option>)}</select><input placeholder="หัวข้อ" onChange={e=>setF({...f,titleTH:e.target.value})}/><input placeholder="คำอธิบาย" onChange={e=>setF({...f,descriptionTH:e.target.value})}/><button className="primary" onClick={add}>สร้าง</button></div></Card><Card><div className="tableWrap"><table><thead><tr><th>หัวข้อ</th><th>สถานะ</th><th>เปลี่ยนสถานะ</th></tr></thead><tbody>{(listings.data||[] as any[]).map((x:any)=><tr key={x.id}><td>{x.titleTH}</td><td><Badge v={x.searchStatus}/></td><td className="row">{(["draft","pending_review","open_for_search","paused","closed"] as ListingStatus[]).map(s=><button key={s} onClick={()=>change(x.id,s)}>{s}</button>)}</td></tr>)}</tbody></table></div></Card></div>;
}

function CRM() {
  const tenants = useLoad(api.listTenants, []);
  const [selected, setSelected] = useState<string>("");
  const notes = useLoad(() => api.listCrm(selected || undefined), [selected]);
  const [tenantForm, setTenantForm] = useState<any>({ fullName: "", primaryPhone: "", lineId: "" });
  const [note, setNote] = useState("");
  async function addTenant(){ await api.createTenant(tenantForm); tenants.setData(await api.listTenants()); }
  async function addNote(){ if(!selected) return; await api.createCrm({ tenantId:selected, channel:"line", noteTH:note }); notes.setData(await api.listCrm(selected)); setNote(""); }
  return <div className="stack"><Topbar title="ผู้เช่า CRM" /><div className="grid"><Card><b>เพิ่มผู้เช่า</b><div className="stack"><input placeholder="ชื่อ" onChange={e=>setTenantForm({...tenantForm,fullName:e.target.value})}/><input placeholder="โทร" onChange={e=>setTenantForm({...tenantForm,primaryPhone:e.target.value})}/><input placeholder="Line" onChange={e=>setTenantForm({...tenantForm,lineId:e.target.value})}/><button className="primary" onClick={addTenant}>บันทึก</button></div></Card><Card><b>เลือกผู้เช่า</b><select onChange={e=>setSelected(e.target.value)}><option value="">เลือก</option>{(tenants.data||[] as any[]).map((t:any)=><option value={t.id} key={t.id}>{t.fullName}</option>)}</select><div className="row" style={{marginTop:8}}><input placeholder="บันทึกการคุย" value={note} onChange={e=>setNote(e.target.value)} /><button onClick={addNote}>เพิ่มโน้ต</button></div></Card></div><Card><b>Timeline</b>{!selected ? <div className="empty">เลือกผู้เช่าก่อน</div> : <div className="stack">{(notes.data||[] as any[]).map((n:any)=><div key={n.id} className="card"><b>{n.channel}</b><div>{n.noteTH}</div><small>{n.createdAt}</small></div>)}</div>}</Card></div>;
}

function Billing() {
  const leases = useLoad(api.listLeases, []); const invoices = useLoad(api.listInvoices, []); const payments = useLoad(api.listPayments, []);
  const [iForm, setI] = useState<any>({ leaseId:"", dueDate:"", amountTHB:0 });
  const [pForm, setP] = useState<any>({ invoiceId:"", amountTHB:0, transferRef:"", paymentDate:"" });
  async function gen(){ await api.generateInvoice({ ...iForm, amountTHB:Number(iForm.amountTHB) }); invoices.setData(await api.listInvoices()); }
  async function submit(){ await api.submitPayment({ ...pForm, amountTHB:Number(pForm.amountTHB) }); payments.setData(await api.listPayments()); }
  async function rec(id:string,a:boolean){ await api.reconcile(id,a,a?"อนุมัติ":"ปฏิเสธ"); payments.setData(await api.listPayments()); invoices.setData(await api.listInvoices()); }
  return <div className="stack"><Topbar title="การเงิน" /><div className="grid"><Card><b>Generate Invoice</b><div className="stack"><select onChange={e=>setI({...iForm,leaseId:e.target.value})}><option value="">Lease</option>{(leases.data||[] as any[]).map((l:any)=><option value={l.id} key={l.id}>{l.id.slice(0,8)}</option>)}</select><input type="date" onChange={e=>setI({...iForm,dueDate:e.target.value})}/><input type="number" placeholder="Amount" onChange={e=>setI({...iForm,amountTHB:e.target.value})}/><button className="primary" onClick={gen}>Generate</button></div></Card><Card><b>Submit Payment</b><div className="stack"><select onChange={e=>setP({...pForm,invoiceId:e.target.value})}><option value="">Invoice</option>{(invoices.data||[] as any[]).map((x:any)=><option value={x.id} key={x.id}>{x.id.slice(0,8)}</option>)}</select><input type="number" placeholder="Amount" onChange={e=>setP({...pForm,amountTHB:e.target.value})}/><input placeholder="Transfer Ref" onChange={e=>setP({...pForm,transferRef:e.target.value})}/><input type="date" onChange={e=>setP({...pForm,paymentDate:e.target.value})}/><button className="primary" onClick={submit}>Submit</button></div></Card></div><Card><b>Invoices</b><div className="tableWrap"><table><thead><tr><th>ID</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead><tbody>{(invoices.data||[] as any[]).map((x:any)=><tr key={x.id}><td>{x.id.slice(0,8)}</td><td>{x.amountTHB}</td><td>{x.paidTHB}</td><td><Badge v={x.status}/></td></tr>)}</tbody></table></div></Card><Card><b>Payments</b><div className="tableWrap"><table><thead><tr><th>ID</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{(payments.data||[] as any[]).map((x:any)=><tr key={x.id}><td>{x.id.slice(0,8)}</td><td>{x.invoiceId.slice(0,8)}</td><td>{x.amountTHB}</td><td><Badge v={x.status}/></td><td className="row"><button onClick={()=>rec(x.id,true)}>Approve</button><button onClick={()=>rec(x.id,false)}>Reject</button></td></tr>)}</tbody></table></div></Card></div>;
}

function MarketplaceList() {
  const [q, setQ] = useState(""); const [items, setItems] = useState<any[]>([]); const [toast, setToast] = useState("");
  const nav = useNavigate();
  async function search(){ const r = await api.search(q); setItems(r.items||[]); }
  useEffect(() => { search().catch(() => setToast("โหลดรายการไม่สำเร็จ")); }, []);
  return <div className="main"><div className="topbar"><h2 style={{margin:0}}>ค้นหาห้องเช่า</h2><Link to="/app">กลับฝั่งผู้ปล่อยเช่า</Link></div><div className="row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ค้นหาเขต/ชื่อ" /><button className="primary" onClick={search}>ค้นหา</button></div><div className="grid" style={{marginTop:12}}>{items.map((x:any)=><Card key={x.id}><b>{x.titleTH}</b><div>{x.descriptionTH}</div><div style={{marginTop:8}}><Badge v={x.searchStatus} /></div><button style={{marginTop:8}} onClick={()=>nav(`/marketplace/${x.id}`)}>ดูรายละเอียด</button></Card>)}</div>{toast && <div className="toast">{toast}</div>}</div>;
}

function MarketplaceDetail() {
  const { id } = useParams(); const [d, setD] = useState<any>(null); const [msg, setMsg] = useState("");
  const [lead, setLead] = useState<any>({ renterName:"", phone:"", lineId:"", message:"" });
  useEffect(()=>{ if(id) api.detail(id).then(setD).catch(()=>setMsg("ไม่พบประกาศ")); }, [id]);
  async function send(){ if(!id) return; await api.inquiry({ listingId:id, ...lead }); setMsg("ส่งข้อมูลเรียบร้อย"); }
  if (!d) return <div className="main">{msg || "Loading..."}</div>;
  return <div className="main"><div className="topbar"><h2 style={{margin:0}}>{d.listing.titleTH}</h2><Link to="/marketplace">ย้อนกลับ</Link></div><Card><p>{d.listing.descriptionTH}</p><p>ห้อง: {d.unit?.roomCode} • เขต: {d.property?.district}</p></Card><Card><b>สนใจห้องนี้</b><div className="stack"><input placeholder="ชื่อ" onChange={e=>setLead({...lead,renterName:e.target.value})}/><input placeholder="โทร" onChange={e=>setLead({...lead,phone:e.target.value})}/><input placeholder="Line" onChange={e=>setLead({...lead,lineId:e.target.value})}/><textarea placeholder="ข้อความ" onChange={e=>setLead({...lead,message:e.target.value})}/><button className="primary" onClick={send}>ส่งคำขอ</button></div></Card>{msg && <div className="toast">{msg}</div>}</div>;
}

function Home() {
  return <div className="home"><section className="hero"><h1>Tarent RentalOps</h1><p>Notion-like workspace สำหรับผู้ปล่อยเช่า และหน้า marketplace สำหรับผู้เช่า</p><div className="row" style={{marginTop:12}}><Link to="/app"><button className="primary">เข้า Backoffice</button></Link><Link to="/marketplace"><button>ดู Marketplace</button></Link></div></section></div>;
}

export function App() {
  const location = useLocation();
  const inApp = useMemo(() => location.pathname.startsWith("/app"), [location.pathname]);
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/marketplace" element={<MarketplaceList />} />
    <Route path="/marketplace/:id" element={<MarketplaceDetail />} />
    <Route path="/app" element={<AppShell><Dashboard /></AppShell>} />
    <Route path="/app/assets" element={<AppShell><Assets /></AppShell>} />
    <Route path="/app/listings" element={<AppShell><Listings /></AppShell>} />
    <Route path="/app/crm" element={<AppShell><CRM /></AppShell>} />
    <Route path="/app/billing" element={<AppShell><Billing /></AppShell>} />
    <Route path="*" element={inApp ? <AppShell><Dashboard /></AppShell> : <Home />} />
  </Routes>;
}
