// src/components/AdminDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  images: string[]; // ✅ array of images
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  size: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const categories = [
  "New Arrivals",
  "Wardrobe Staples", 
  "Statement Pieces",
  "Streetwear",
  "Evening Luxe"
];

const AdminDashboard = ({ token, onLogout }: AdminDashboardProps) => {
  // ✅ ALL hooks MUST be inside the component
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'New Arrivals' as string,
    price: 0,
    description: '',
    images: [] as string[], // for URL fallback
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const authHeader = {
    headers: { 
      'Authorization': `Bearer ${token}`,
    }
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, ordersRes] = await Promise.all([
          axios.get('http://localhost:5000/api/products', authHeader),
          axios.get('http://localhost:5000/api/orders', authHeader)
        ]);
        setProducts(productsRes.data);
        setOrders(ordersRes.data);
        setError('');
      } catch (err: any) {
        setError('Failed to load admin data');
        console.error('Admin data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Handle image selection for new product
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    } else {
      setImagePreviews([]);
    }
  };

  // Handle image selection for editing product
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setEditImagePreview(null);
    }
  };

  // Add new product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('category', newProduct.category);
      formData.append('price', newProduct.price.toString());
      formData.append('description', newProduct.description);
      
      // Handle multiple image uploads
      const fileInput = fileInputRef.current;
      if (fileInput?.files && fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
          formData.append('images', file); // ✅ 'images' matches backend
        });
      } else if (newProduct.images.length > 0) {
        // Fallback: send image URLs (not used in this UI, but safe)
        newProduct.images.forEach(url => formData.append('images', url));
      } else {
        setError('At least one image is required');
        setIsAdding(false);
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/products',
        formData,
        authHeader
      );
      
      setProducts([...products, response.data]);
      setNewProduct({
        name: '',
        category: 'New Arrivals',
        price: 0,
        description: '',
        images: []
      });
      setImagePreviews([]);
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add product');
      console.error('Add product error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Start editing a product
  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setEditImagePreview(null);
  };

  // Update product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsEditing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('name', editingProduct.name);
      formData.append('category', editingProduct.category);
      formData.append('price', editingProduct.price.toString());
      formData.append('description', editingProduct.description);
      
      const fileInput = editFileInputRef.current;
      if (fileInput?.files && fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
          formData.append('images', file);
        });
      }

      const response = await axios.patch(
        `http://localhost:5000/api/products/${editingProduct._id}`,
        formData,
        authHeader
      );
      
      setProducts(products.map(p => p._id === editingProduct._id ? response.data : p));
      setEditingProduct(null);
      setEditImagePreview(null);
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product');
      console.error('Update product error:', err);
    } finally {
      setIsEditing(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      await axios.delete(
        `http://localhost:5000/api/products/${productId}`,
        authHeader
      );
      setProducts(products.filter(p => p._id !== productId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete product');
      console.error('Delete product error:', err);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/orders/${orderId}/status`,
        { status },
        authHeader
      );
      setOrders(orders.map(order => 
        order._id === orderId ? response.data : order
      ));
    } catch (err: any) {
      setError('Failed to update order status');
      console.error('Update order error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">LuxeLayer Admin</h1>
          <button
            onClick={onLogout}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Greeting */}
        <section className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-light text-slate-900 mb-2">LuxeLayer Studio</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Welcome back. Manage your collections, review orders, and curate the future of luxury fashion.
          </p>
        </section>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {/* Add Product Form */}
        <section className="mb-12 bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Add New Product</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
              <input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Images</label>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {imagePreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx}`} className="h-16 w-16 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isAdding}
                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition disabled:bg-amber-300"
              >
                {isAdding ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </section>

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Edit Product</h3>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleUpdateProduct} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Images</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleEditImageChange}
                        accept="image/*"
                        multiple
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      {editImagePreview ? (
                        <div className="mt-2">
                          <img src={editImagePreview} alt="Preview" className="h-24 object-cover rounded" />
                        </div>
                      ) : editingProduct.images.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {editingProduct.images.map((img, idx) => (
                            <img 
                              key={idx} 
                              src={getImageUrl(img)} 
                              alt={`Current ${idx}`} 
                              className="h-16 w-16 object-cover rounded"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isEditing}
                      className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition disabled:bg-amber-300"
                    >
                      {isEditing ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Orders Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Orders</h2>
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{order.fullName}</h3>
                    <p className="text-sm text-slate-600">{order.phone}</p>
                    <p className="text-sm text-slate-600">{order.address}</p>
                    <p className="text-sm text-slate-600">Size: {order.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${order.total.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <h4 className="font-medium mb-2">Items:</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="text-sm text-slate-600">
                      {item.quantity}x @ ${item.price.toFixed(2)} each
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Products Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product._id} className="bg-white p-4 rounded-lg shadow-sm border">
                <img 
                  src={getImageUrl(product.images[0] || '')} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/300x400/cccccc/999999?text=No+Image';
                  }}
                />
                <h3 className="font-semibold mb-1">{product.name}</h3>
                <p className="text-sm text-slate-600 mb-2">{product.category}</p>
                <p className="font-semibold text-lg">${product.price.toFixed(2)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEditing(product)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;