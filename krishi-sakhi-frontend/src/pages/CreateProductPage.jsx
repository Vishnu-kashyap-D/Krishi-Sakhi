import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { marketplaceAPI } from '../api/services';
import { getErrorMessage } from '../api/client';
import { getUser } from '../utils/auth';

const FALLBACK_UNITS = ['kg', 'gram', 'liter', 'piece', 'quintal', 'ton', 'packet', 'box'];

const CreateProductPage = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState(FALLBACK_UNITS);
  const [form, setForm] = useState({
    title: '', description: '', category: '', price: '', unit: 'kg', quantity: '',
    district: '', state: '', isNegotiable: true,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/marketplace/create' } });
      return;
    }
    marketplaceAPI.getCategories()
      .then((res) => {
        setCategories(res.data.categories);
        if (res.data.units) setUnits(res.data.units);
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load categories.')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (Number(form.price) < 0 || Number(form.quantity) < 0) {
      setError('Price and quantity cannot be negative.');
      return;
    }
    setSaving(true);
    try {
      const res = await marketplaceAPI.createProduct({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number(form.price),
        unit: form.unit,
        quantity: Number(form.quantity),
        isNegotiable: form.isNegotiable,
        location: { district: form.district.trim(), state: form.state.trim() },
      });
      navigate(`/marketplace/${res.data.product.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the listing.'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const input = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500';

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-primary-700 mb-4"><FaArrowLeft /> Back to marketplace</Link>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Sell a product</h1>
        {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Title *</span>
            <input name="title" value={form.title} onChange={update} required minLength={3} maxLength={200} className={input} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Description *</span>
            <textarea name="description" value={form.description} onChange={update} required rows={4} className={input} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1">Category *</span>
              <select name="category" value={form.category} onChange={update} required className={input}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Unit *</span>
              <select name="unit" value={form.unit} onChange={update} className={input}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Price per unit (₹) *</span>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={update} required className={input} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">Quantity available *</span>
              <input name="quantity" type="number" min="0" step="any" value={form.quantity} onChange={update} required className={input} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">District</span>
              <input name="district" value={form.district} onChange={update} className={input} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium mb-1">State</span>
              <input name="state" value={form.state} onChange={update} className={input} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isNegotiable" checked={form.isNegotiable} onChange={update} />
            <span className="text-sm">Price is negotiable</span>
          </label>
          <button type="submit" disabled={saving} className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
            {saving && <FaSpinner className="animate-spin" />} Publish listing
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProductPage;
