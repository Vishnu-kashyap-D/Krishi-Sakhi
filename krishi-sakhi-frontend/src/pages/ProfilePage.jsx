import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEdit, FaMapMarkerAlt, FaPhone, FaEnvelope, FaLeaf, FaCalendarAlt,
  FaMicroscope, FaComments, FaStore, FaSave, FaTimes, FaKey,
} from 'react-icons/fa';
import { authAPI, analysisAPI, cropAnalysisAPI, chatAPI, marketplaceAPI } from '../api/services';
import { getErrorMessage } from '../api/client';
import { getUser, updateStoredUser } from '../utils/auth';

const locationText = (loc) => {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return [loc.district, loc.state].filter(Boolean).join(', ');
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
    <div className="p-3 rounded-full bg-primary-100 text-primary-700"><Icon /></div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [farmHistory, setFarmHistory] = useState(null);
  const [cropHistory, setCropHistory] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', location: '', totalAcres: '', crops: '', soilType: '', irrigation: '', lat: '', lng: '' });
  const [geoError, setGeoError] = useState(null);

  const useCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) { setGeoError('Location is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => setGeoError('Location permission was denied.'),
      { timeout: 10000 }
    );
  };
  const [message, setMessage] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    if (!getUser()) {
      navigate('/login', { replace: true, state: { from: '/profile' } });
      return;
    }
    authAPI.getProfile()
      .then((res) => { setUser(res.data.user); updateStoredUser(res.data.user); })
      .catch((err) => {
        if (err.response?.status === 401) navigate('/login', { replace: true, state: { from: '/profile' } });
        else setError(getErrorMessage(err, 'Could not load your profile.'));
      });
    analysisAPI.getHistory(5).then((r) => setFarmHistory(r.data)).catch(() => setFarmHistory([]));
    cropAnalysisAPI.getHistory(5).then((r) => setCropHistory(r.data)).catch(() => setCropHistory({ history: [], total: 0 }));
    chatAPI.getChatSessions().then((r) => setSessions(r.data.sessions)).catch(() => setSessions([]));
    marketplaceAPI.getProducts({ mine: 'true', limit: 50 }).then((r) => setListings(r.data.products)).catch(() => setListings([]));
  }, [navigate]);

  if (!user) return null;

  const startEdit = () => {
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      location: locationText(user.location),
      totalAcres: user.farmDetails?.totalAcres || '',
      crops: (user.farmDetails?.crops || []).join(', '),
      soilType: user.farmDetails?.soilType || '',
      irrigation: user.farmDetails?.irrigation || '',
      lat: user.farmDetails?.lat ?? '',
      lng: user.farmDetails?.lng ?? '',
    });
    setMessage(null);
    setEditing(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await authAPI.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        farmDetails: {
          ...(user.farmDetails || {}),
          totalAcres: Number(form.totalAcres) || 0,
          crops: form.crops.split(',').map((c) => c.trim()).filter(Boolean),
          soilType: form.soilType || null,
          irrigation: form.irrigation || null,
          ...(form.lat !== '' && form.lat != null && { lat: Number(form.lat), lng: Number(form.lng) }),
        },
      });
      setUser(res.data.user);
      updateStoredUser(res.data.user);
      setEditing(false);
      setMessage({ ok: true, text: 'Profile updated.' });
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err, 'Could not save your profile.') });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    try {
      await authAPI.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      setPwMessage({ ok: true, text: 'Password changed.' });
    } catch (err) {
      setPwMessage({ ok: false, text: getErrorMessage(err, 'Could not change the password.') });
    }
  };

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=059669&color=fff&size=200`;
  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-primary-500';

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>}

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white flex flex-col md:flex-row gap-6 items-start md:items-center">
        <img src={avatar} alt="" className="w-24 h-24 rounded-full border-4 border-white shadow" />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-primary-100 text-sm">
            {locationText(user.location) && <span className="flex items-center gap-1"><FaMapMarkerAlt /> {locationText(user.location)}</span>}
            {user.phone && <span className="flex items-center gap-1"><FaPhone /> {user.phone}</span>}
            <span className="flex items-center gap-1"><FaEnvelope /> {user.email}</span>
            <span className="flex items-center gap-1"><FaCalendarAlt /> Joined {formatDate(user.created_at)}</span>
          </div>
          {(user.farmDetails?.totalAcres > 0 || user.farmDetails?.crops?.length > 0) && (
            <p className="mt-2 text-sm">
              <FaLeaf className="inline mr-1" />
              {user.farmDetails.totalAcres > 0 && `${user.farmDetails.totalAcres} acres`}
              {user.farmDetails.crops?.length > 0 && ` · ${user.farmDetails.crops.join(', ')}`}
            </p>
          )}
        </div>
        {!editing && (
          <button onClick={startEdit} className="bg-white text-primary-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-50">
            <FaEdit /> Edit profile
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg border ${message.ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-700'}`}>{message.text}</div>
      )}

      {editing && (
        <form onSubmit={saveProfile} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm font-medium">Name</span><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
          <label className="block"><span className="text-sm font-medium">Phone</span><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="block"><span className="text-sm font-medium">Location (district, state)</span><input className={input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label className="block"><span className="text-sm font-medium">Farm size (acres)</span><input type="number" min="0" step="any" className={input} value={form.totalAcres} onChange={(e) => setForm({ ...form, totalAcres: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="text-sm font-medium">Crops you grow (comma separated)</span><input className={input} value={form.crops} onChange={(e) => setForm({ ...form, crops: e.target.value })} placeholder="Paddy, Banana, Coconut" /></label>
          <label className="block"><span className="text-sm font-medium">Soil type</span>
            <select className={input} value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })}>
              <option value="">Not sure</option>
              {['Laterite', 'Alluvial', 'Clay / Kari (acid sulphate)', 'Sandy / Coastal', 'Red loam', 'Forest loam', 'Black (cotton) soil'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-sm font-medium">Irrigation</span>
            <select className={input} value={form.irrigation} onChange={(e) => setForm({ ...form, irrigation: e.target.value })}>
              <option value="">Not set</option>
              {[['rainfed', 'Rainfed only'], ['well', 'Open well'], ['borewell', 'Borewell'], ['canal', 'Canal / tank'], ['drip', 'Drip / sprinkler']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="text-sm font-medium">Farm location (for weather alerts)</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="button" onClick={useCurrentLocation} className="btn-ghost !py-2 text-sm">Use my current location</button>
              <span className="text-sm text-soil-700">
                {form.lat != null && form.lat !== '' ? `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}` : 'Not set'}
              </span>
              {geoError && <span className="text-sm text-red-700">{geoError}</span>}
            </div>
          </div>
          <div className="md:col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded-lg flex items-center gap-2"><FaTimes /> Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700"><FaSave /> Save</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={FaLeaf} label="Farm analyses" value={farmHistory?.length} />
        <Stat icon={FaMicroscope} label="Crop photo analyses" value={cropHistory?.total} />
        <Stat icon={FaComments} label="AI chat sessions" value={sessions?.length} />
        <Stat icon={FaStore} label="My listings" value={listings?.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Recent farm analyses</h2>
          {farmHistory?.length ? (
            <ul className="divide-y">
              {farmHistory.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <p className="font-medium">{a.farmName} · {a.acres} acres</p>
                  <p className="text-gray-600">{a.report?.soil_properties?.texture}, pH {a.report?.soil_properties?.ph} · {formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-600">No analyses yet. <Link className="text-primary-700 underline" to="/farm-analysis">Analyse your farm</Link>.</p>}
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Recent crop photo checks</h2>
          {cropHistory?.history?.length ? (
            <ul className="divide-y">
              {cropHistory.history.map((h) => (
                <li key={h.id} className="py-2 text-sm">
                  <p className="font-medium">{h.cropType} · health {h.health}%</p>
                  <p className="text-gray-600">{h.issueCount} issue(s) found · {formatDate(h.date)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-600">No photo checks yet. <Link className="text-primary-700 underline" to="/crop-analysis">Check a crop photo</Link>.</p>}
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">My marketplace listings</h2>
          {listings?.length ? (
            <ul className="divide-y">
              {listings.map((p) => (
                <li key={p.id} className="py-2 text-sm flex justify-between gap-2">
                  <Link className="text-primary-700 underline" to={`/marketplace/${p.id}`}>{p.title}</Link>
                  <span className="text-gray-600">₹{p.price}/{p.unit} · {p.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-600">You have no listings. <Link className="text-primary-700 underline" to="/marketplace/create">Sell a product</Link>.</p>}
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FaKey /> Change password</h2>
          {pwMessage && (
            <div className={`px-3 py-2 rounded mb-3 text-sm ${pwMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{pwMessage.text}</div>
          )}
          <form onSubmit={changePassword} className="space-y-3">
            <input type="password" autoComplete="current-password" placeholder="Current password" className={input} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            <input type="password" autoComplete="new-password" placeholder="New password (min 6 characters)" className={input} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} />
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Update password</button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
