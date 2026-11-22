import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBell, FaClipboardList, FaBook, FaLandmark, FaPlus, FaTrash, FaCheck,
  FaExclamationTriangle, FaCloudRain, FaBug, FaTint, FaUserEdit, FaCalendarAlt, FaRupeeSign,
} from 'react-icons/fa';
import { farmAPI } from '../api/services';
import { getErrorMessage } from '../api/client';
import { getUser } from '../utils/auth';

const today = () => new Date().toISOString().slice(0, 10);
const ACTIVITY_TYPES = [
  ['sowing', 'Sowing / planting'], ['irrigation', 'Irrigation'], ['fertilizer', 'Fertiliser'],
  ['pesticide', 'Pesticide / spray'], ['weeding', 'Weeding'], ['pest-observation', 'Pest / disease seen'],
  ['harvest', 'Harvest'], ['other', 'Other'],
];
const TYPE_LABEL = Object.fromEntries(ACTIVITY_TYPES);
const CAT_ICON = { weather: FaCloudRain, pest: FaBug, irrigation: FaTint, reminder: FaBell, profile: FaUserEdit, calendar: FaCalendarAlt };
const PRIORITY = {
  high: 'border-red-300 bg-red-50',
  medium: 'border-harvest-300 bg-harvest-50',
  low: 'border-primary-200 bg-primary-50',
};

const input = 'w-full rounded-xl border border-soil-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-200';

const Tab = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-primary-800 text-white' : 'bg-white text-soil-800 hover:bg-primary-50'
    }`}
  >
    <Icon /> {children}
  </button>
);

const MyFarmPage = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [tab, setTab] = useState('advisory');
  const [advisory, setAdvisory] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [knowledge, setKnowledge] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [act, setAct] = useState({ type: 'irrigation', crop: (user?.farmDetails?.crops || [])[0] || '', date: today(), quantity: '', unit: '', cost: '', notes: '' });
  const [rem, setRem] = useState({ title: '', dueDate: today() });
  const [prices, setPrices] = useState({ commodity: 'Banana', result: null, error: null });

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [a, acts, rems] = await Promise.all([farmAPI.getAdvisory(), farmAPI.getActivities(), farmAPI.getReminders()]);
      setAdvisory(a.data);
      setActivities(acts.data);
      setReminders(rems.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your farm data.'));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/my-farm' } });
      return;
    }
    refresh();
    farmAPI.getKnowledge().then((r) => setKnowledge(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const addActivity = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const res = await farmAPI.addActivity(act);
      setNotice(res.scheduledReminders
        ? `Saved. ${res.scheduledReminders} crop-calendar reminders were scheduled for this crop.`
        : 'Activity saved to your diary.');
      setAct({ ...act, quantity: '', unit: '', cost: '', notes: '' });
      refresh();
    } catch (err) {
      setNotice(null);
      setError(getErrorMessage(err, 'Could not save the activity.'));
    }
  };

  const addReminder = async (e) => {
    e.preventDefault();
    try {
      await farmAPI.addReminder(rem);
      setRem({ title: '', dueDate: today() });
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the reminder.'));
    }
  };

  const markDone = async (id) => { await farmAPI.updateReminder(id, { done: true }).catch(() => {}); refresh(); };
  const removeReminder = async (id) => { await farmAPI.deleteReminder(id).catch(() => {}); refresh(); };
  const removeActivity = async (id) => {
    if (!window.confirm('Delete this diary entry?')) return;
    await farmAPI.deleteActivity(id).catch(() => {});
    refresh();
  };

  const loadPrices = async (e) => {
    e.preventDefault();
    setPrices((p) => ({ ...p, result: null, error: null }));
    try {
      const r = await farmAPI.getPrices(prices.commodity);
      setPrices((p) => ({ ...p, result: r.data }));
    } catch (err) {
      setPrices((p) => ({ ...p, error: getErrorMessage(err, 'Could not load prices.') }));
    }
  };

  const s = advisory?.summary;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My farm</p>
          <h1 className="page-title">Namaskaram, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-soil-700">Your personal advisory, farm diary and reminders in one place.</p>
        </div>
        <Link to="/profile" className="btn-ghost text-sm"><FaUserEdit /> Edit farm profile</Link>
      </div>

      {s && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Weather now', s.weather ? `${Math.round(s.weather.temperature)}° · ${s.weather.condition}` : 'Add farm location'],
            ['Diary entries (60 days)', s.activitiesLast60Days],
            ['Open reminders', s.openReminders],
            ['Spend logged (60 days)', `₹${s.spendLast60Days.toLocaleString('en-IN')}`],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-soil-700">{label}</p>
              <p className="mt-1 font-display text-xl font-semibold text-primary-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        <Tab active={tab === 'advisory'} onClick={() => setTab('advisory')} icon={FaBell}>Advisory</Tab>
        <Tab active={tab === 'diary'} onClick={() => setTab('diary')} icon={FaClipboardList}>Farm diary</Tab>
        <Tab active={tab === 'reminders'} onClick={() => setTab('reminders')} icon={FaCalendarAlt}>Reminders</Tab>
        <Tab active={tab === 'knowledge'} onClick={() => setTab('knowledge')} icon={FaBook}>Crop calendar</Tab>
        <Tab active={tab === 'schemes'} onClick={() => setTab('schemes')} icon={FaLandmark}>Schemes &amp; prices</Tab>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-primary-300 bg-primary-50 px-4 py-3 text-primary-800" role="status">{notice}</div>}

      <div className="mt-5">
        {tab === 'advisory' && (
          <div className="space-y-3">
            {!advisory && <p className="text-soil-700">Preparing your advisory…</p>}
            {advisory?.alerts.length === 0 && (
              <div className="card p-6 text-primary-800">All clear: no warnings for your farm right now.</div>
            )}
            {advisory?.alerts.map((a, i) => {
              const Icon = CAT_ICON[a.category] || FaExclamationTriangle;
              return (
                <div key={i} className={`flex gap-4 rounded-2xl border p-4 ${PRIORITY[a.priority]}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-primary-800 shadow-sm"><Icon /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-soil-900">{a.title}</p>
                    <p className="mt-0.5 text-sm text-soil-800">{a.message}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      {a.link && <Link to={a.link} className="font-semibold text-primary-700 underline">Open</Link>}
                      {a.category === 'profile' && <Link to="/profile" className="font-semibold text-primary-700 underline">Update profile</Link>}
                      {a.reminderId && <button onClick={() => markDone(a.reminderId)} className="font-semibold text-primary-700 underline">Mark done</button>}
                    </div>
                  </div>
                  <span className="hidden h-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-soil-700 sm:block">{a.priority}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'diary' && (
          <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
            <form onSubmit={addActivity} className="card h-fit space-y-3 p-5">
              <h2 className="font-display text-lg font-semibold">Log an activity</h2>
              <select className={input} value={act.type} onChange={(e) => setAct({ ...act, type: e.target.value })}>
                {ACTIVITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className={input} placeholder="Crop (e.g. Paddy, Banana)" value={act.crop} onChange={(e) => setAct({ ...act, crop: e.target.value })} />
              <input className={input} type="date" max={today()} value={act.date} onChange={(e) => setAct({ ...act, date: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input className={input} type="number" min="0" step="any" placeholder="Quantity" value={act.quantity} onChange={(e) => setAct({ ...act, quantity: e.target.value })} />
                <input className={input} placeholder="Unit (kg, L, hrs)" value={act.unit} onChange={(e) => setAct({ ...act, unit: e.target.value })} />
              </div>
              <input className={input} type="number" min="0" step="any" placeholder="Cost (₹)" value={act.cost} onChange={(e) => setAct({ ...act, cost: e.target.value })} />
              <textarea className={input} rows={2} placeholder="Notes (product used, pest seen…)" value={act.notes} onChange={(e) => setAct({ ...act, notes: e.target.value })} />
              <button className="btn-primary w-full" type="submit"><FaPlus /> Save to diary</button>
              <p className="text-xs text-soil-700">Logging <strong>sowing</strong> for paddy, banana, coconut, pepper, vegetables or rubber schedules that crop&apos;s calendar tasks as reminders.</p>
            </form>
            <div className="card overflow-hidden">
              {activities.length === 0 ? (
                <p className="p-6 text-soil-700">No diary entries yet. Records help you learn from past seasons and support scheme claims.</p>
              ) : (
                <ul className="divide-y divide-soil-100">
                  {activities.map((a) => (
                    <li key={a.id} className="flex items-start gap-4 p-4">
                      <div className="w-20 shrink-0 text-xs font-semibold text-soil-700">{a.date}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-primary-900">{TYPE_LABEL[a.type] || a.type}{a.crop ? ` · ${a.crop}` : ''}</p>
                        <p className="text-sm text-soil-700">
                          {[a.quantity != null && `${a.quantity} ${a.unit || ''}`, a.cost != null && `₹${a.cost}`, a.notes].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button onClick={() => removeActivity(a.id)} className="text-soil-700 hover:text-red-600" aria-label="Delete entry"><FaTrash /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'reminders' && (
          <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
            <form onSubmit={addReminder} className="card h-fit space-y-3 p-5">
              <h2 className="font-display text-lg font-semibold">Add a reminder</h2>
              <input className={input} placeholder="e.g. Apply second urea dose" value={rem.title} onChange={(e) => setRem({ ...rem, title: e.target.value })} required minLength={2} />
              <input className={input} type="date" value={rem.dueDate} onChange={(e) => setRem({ ...rem, dueDate: e.target.value })} required />
              <button className="btn-primary w-full" type="submit"><FaPlus /> Add reminder</button>
            </form>
            <div className="card overflow-hidden">
              {reminders.length === 0 ? <p className="p-6 text-soil-700">No open reminders.</p> : (
                <ul className="divide-y divide-soil-100">
                  {reminders.map((r) => {
                    const overdue = r.dueDate < today();
                    return (
                      <li key={r.id} className="flex items-center gap-4 p-4">
                        <div className={`w-24 shrink-0 text-xs font-bold ${overdue ? 'text-red-600' : 'text-soil-700'}`}>{overdue ? 'Overdue · ' : ''}{r.dueDate}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-soil-900">{r.title}</p>
                          {r.source === 'calendar' && <p className="text-[11px] text-harvest-700">From crop calendar</p>}
                        </div>
                        <button onClick={() => markDone(r.id)} className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-primary-800 hover:bg-primary-200" aria-label="Mark done"><FaCheck /></button>
                        <button onClick={() => removeReminder(r.id)} className="text-soil-700 hover:text-red-600" aria-label="Delete reminder"><FaTrash /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'knowledge' && knowledge && (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(knowledge.crops).map(([key, c]) => (
              <div key={key} className="card p-5">
                <h3 className="font-display text-lg font-semibold text-primary-900">{c.name}</h3>
                <ul className="mt-2 space-y-1 text-sm text-soil-800">
                  {c.seasons.map((s) => <li key={s.name}><strong>{s.name}:</strong> sow {s.sow} · harvest {s.harvest}</li>)}
                </ul>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-harvest-700">Key operations</p>
                <ul className="mt-1 space-y-1 text-sm text-soil-700">
                  {c.operations.map((o) => <li key={o.day}><span className="font-semibold text-primary-800">Day {o.day}:</span> {o.task}</li>)}
                </ul>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-harvest-700">Watch for</p>
                <ul className="mt-1 space-y-1 text-sm text-soil-700">
                  {c.pests.map((p) => <li key={p.name}><strong>{p.name}</strong> — {p.signs}. <em>{p.action}.</em></li>)}
                </ul>
              </div>
            ))}
            <p className="text-xs text-soil-700 md:col-span-2">General guidance based on Kerala package-of-practices style recommendations. Confirm doses and products with your Krishi Bhavan.</p>
          </div>
        )}

        {tab === 'schemes' && knowledge && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {knowledge.schemes.map((sc) => (
                <div key={sc.name} className="card p-5">
                  <h3 className="font-semibold text-primary-900">{sc.name}</h3>
                  <p className="mt-1 text-sm text-soil-800">{sc.what}</p>
                  <p className="mt-1 text-sm text-soil-700">{sc.how}</p>
                  <a href={sc.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary-700 underline">Official site</a>
                </div>
              ))}
              <p className="text-xs text-soil-700">Deadlines change every season — use “Reminders” to note the dates announced by your Krishi Bhavan or bank.</p>
            </div>
            <div className="card h-fit p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><FaRupeeSign /> Mandi prices (Kerala)</h3>
              <form onSubmit={loadPrices} className="mt-3 flex gap-2">
                <input className={input} value={prices.commodity} onChange={(e) => setPrices({ ...prices, commodity: e.target.value })} placeholder="Commodity, e.g. Banana" />
                <button className="btn-primary !py-2" type="submit">Check</button>
              </form>
              {prices.error && <p className="mt-3 text-sm text-red-700">{prices.error}</p>}
              {prices.result && (
                prices.result.records.length === 0 ? <p className="mt-3 text-sm text-soil-700">No recent arrivals reported for this commodity.</p> : (
                  <table className="mt-3 w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase text-soil-700"><th className="py-1">Market</th><th>Date</th><th className="text-right">Modal ₹/q</th></tr></thead>
                    <tbody>
                      {prices.result.records.slice(0, 12).map((r, i) => (
                        <tr key={i} className="border-t border-soil-100"><td className="py-1.5">{r.market}</td><td>{r.date}</td><td className="text-right font-semibold">{r.modalPrice}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
              <p className="mt-3 text-xs text-soil-700">Source: Agmarknet via data.gov.in.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFarmPage;
