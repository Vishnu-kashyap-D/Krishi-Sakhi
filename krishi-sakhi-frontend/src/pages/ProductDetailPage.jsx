import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaMapMarkerAlt, FaUser, FaPhone, FaTrash } from 'react-icons/fa';
import { marketplaceAPI } from '../api/services';
import { getErrorMessage } from '../api/client';
import { getUser } from '../utils/auth';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    marketplaceAPI.getProductById(id)
      .then((res) => setProduct(res.data.product))
      .catch((err) => setError(getErrorMessage(err, 'Could not load this product.')))
      .finally(() => setLoading(false));
  }, [id]);

  const remove = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await marketplaceAPI.deleteProduct(product.id);
      navigate('/marketplace');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the listing.'));
    }
  };

  const loc = product?.location || {};
  const isOwner = user && product && product.sellerId === user.id;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-primary-700 mb-4"><FaArrowLeft /> Back to marketplace</Link>
      {loading && <p className="text-gray-600">Loading…</p>}
      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>}
      {product && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wide bg-primary-100 text-primary-700 px-2 py-1 rounded-full">{product.category}</span>
              <h1 className="text-2xl font-bold text-gray-800 mt-2">{product.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-700">₹{product.price}</p>
              <p className="text-gray-500 text-sm">per {product.unit}{product.isNegotiable ? ' · negotiable' : ''}</p>
            </div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <p><strong>Available:</strong> {product.quantity} {product.unit}</p>
            <p><strong>Status:</strong> {product.status}</p>
            <p className="flex items-center gap-2"><FaMapMarkerAlt /> {[loc.district, loc.state].filter(Boolean).join(', ') || 'Location not given'}</p>
            <p className="flex items-center gap-2"><FaUser /> {product.seller?.name}</p>
            {product.seller?.phone && (
              <p className="flex items-center gap-2"><FaPhone /> <a className="text-primary-700 underline" href={`tel:${product.seller.phone}`}>{product.seller.phone}</a></p>
            )}
          </div>
          {isOwner && (
            <button onClick={remove} className="inline-flex items-center gap-2 text-red-700 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50">
              <FaTrash /> Delete listing
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
