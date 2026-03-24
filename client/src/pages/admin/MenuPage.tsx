import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MenuCardSkeleton } from '../../components/ui/Skeleton';
import { Plus, Pencil, Trash2, FolderPlus, UtensilsCrossed, Upload, Image as ImageIcon, X } from 'lucide-react';
import { uploadImage } from '../../services/api';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
}

interface MenuCategory {
  _id: string;
  name: string;
  items: MenuItem[];
}

const MenuPage = () => {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', image: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenu(res.data.menu);
    } catch {
      showToast('Failed to fetch menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/menu/categories', { name: categoryName });
      setMenu(res.data.menu);
      setCategoryName('');
      setShowCategoryModal(false);
      showToast('Category added!');
    } catch {
      showToast('Failed to add category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const res = await api.delete(`/menu/categories/${categoryId}`);
      setMenu(res.data.menu);
      showToast('Category deleted');
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const openAddItem = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(null);
    setItemForm({ name: '', description: '', price: '', image: '' });
    setShowItemModal(true);
  };

  const openEditItem = (categoryId: string, item: MenuItem) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
    });
    setShowItemModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setItemForm({ ...itemForm, image: url });
      showToast('Image uploaded successfully');
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.price) return;
    setSaving(true);
    try {
      const payload = {
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price),
        image: itemForm.image,
      };

      let res;
      if (editingItem) {
        res = await api.put(`/menu/categories/${selectedCategoryId}/items/${editingItem._id}`, payload);
      } else {
        res = await api.post(`/menu/categories/${selectedCategoryId}/items`, payload);
      }
      setMenu(res.data.menu);
      setShowItemModal(false);
      showToast(editingItem ? 'Item updated!' : 'Item added!');
    } catch {
      showToast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    try {
      const res = await api.delete(`/menu/categories/${categoryId}/items/${itemId}`);
      setMenu(res.data.menu);
      showToast('Item deleted');
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const toggleAvailability = async (categoryId: string, item: MenuItem) => {
    try {
      const res = await api.put(`/menu/categories/${categoryId}/items/${item._id}`, {
        isAvailable: !item.isAvailable,
      });
      setMenu(res.data.menu);
    } catch {
      showToast('Failed to update item', 'error');
    }
  };

  return (
    <div className="animate-fade-in px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Menu Management</h1>
          <p className="text-text-secondary text-xs md:text-sm mt-1">Organize categories and items</p>
        </div>
        <Button 
          onClick={() => setShowCategoryModal(true)} 
          icon={<FolderPlus className="w-4 h-4" />}
          className="w-full sm:w-auto justify-center"
        >
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <MenuCardSkeleton key={i} />)}
        </div>
      ) : menu.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border">
          <UtensilsCrossed className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No menu items yet</h3>
          <p className="text-text-secondary text-sm mb-4">Start by adding a category</p>
          <Button onClick={() => setShowCategoryModal(true)}>Add Category</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {menu.map((category) => (
            <div key={category._id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary-500 rounded-full" />
                  {category.name}
                  <span className="text-sm font-normal text-text-muted">
                    ({category.items.length} items)
                  </span>
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openAddItem(category._id)}
                    icon={<Plus className="w-4 h-4" />}>
                    Add Item
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCategory(category._id)}
                    icon={<Trash2 className="w-4 h-4 text-red-400" />}>
                    {''}
                  </Button>
                </div>
              </div>

              {category.items.length > 0 ? (
                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item) => (
                    <div
                      key={item._id}
                      className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
                        !item.isAvailable ? 'opacity-60' : ''
                      }`}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                          <UtensilsCrossed className="w-10 h-10 text-primary-300" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-text-primary">{item.name}</h3>
                          <span className="text-lg font-bold text-primary-600">₹{item.price}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-text-muted mb-3 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => toggleAvailability(category._id, item)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                              item.isAvailable
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditItem(category._id, item)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-text-muted transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(category._id, item._id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-text-muted text-sm">No items in this category</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Add Category">
        <div className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Starters, Main Course, Beverages"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <Button onClick={addCategory} loading={saving} className="w-full">
            Add Category
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Butter Chicken"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Rich and creamy..."
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          />
          <Input
            label="Price (₹)"
            type="number"
            placeholder="299"
            value={itemForm.price}
            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Item Image
            </label>
            <div className="space-y-3">
              {itemForm.image ? (
                <div className="relative group">
                  <img
                    src={itemForm.image}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border border-border"
                  />
                  <button
                    onClick={() => setItemForm({ ...itemForm, image: '' })}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary-400 mb-3" />
                    )}
                    <p className="text-sm text-text-secondary">
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Or paste image URL..."
                    value={itemForm.image}
                    onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <Button onClick={saveItem} loading={saving} className="w-full">
            {editingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MenuPage;
